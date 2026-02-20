from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Topic, DailyLesson, Verb, LessonContent
from apps.users.models import UserActionLog
from .serializers import TopicSerializer, DailyLessonSerializer
from .services.ai_service import AIService

class TopicViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Topic.objects.all()
    serializer_class = TopicSerializer
    permission_classes = [permissions.AllowAny] # Allow loading topics for onboarding without auth if needed, or Auth

class DailyLessonViewSet(viewsets.ModelViewSet):
    serializer_class = DailyLessonSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return DailyLesson.objects.filter(user=self.request.user)

    def perform_update(self, serializer):
        was_completed = serializer.instance.completed
        is_completed = serializer.validated_data.get('completed', was_completed)
        
        instance = serializer.save()
        
        # If lesson just got completed, update user XP and streak
        if is_completed and not was_completed:
            profile = self.request.user.profile
            profile.xp_points += instance.score
            
            # Simple streak logic: if last activity was yesterday, increment. If today, same.
            today = timezone.now().date()
            if profile.last_activity_date != today:
                if profile.last_activity_date == today - timezone.timedelta(days=1):
                    profile.streak_days += 1
                elif profile.last_activity_date is None or profile.last_activity_date < today - timezone.timedelta(days=1):
                    profile.streak_days = 1
                profile.last_activity_date = today
            
            profile.save()

            # LOG TRANSACTION: Lesson Completed
            UserActionLog.objects.create(
                user=self.request.user,
                action_type='TRANSACTION',
                description=f"Completed lesson for {instance.date}",
                metadata={
                    "lesson_id": instance.id,
                    "score": instance.score,
                    "date": str(instance.date)
                }
            )

    @action(detail=False, methods=['get'])
    def today(self, request):
        # Allow passing a specific date for history retrieval or triggering "today"
        date_str = request.query_params.get('date')
        if date_str:
            target_date = timezone.datetime.strptime(date_str, '%Y-%m-%d').date()
        else:
            target_date = timezone.now().date()
            
        # BLOCK FUTURE DATES
        if target_date > timezone.now().date():
            return Response({"error": "You cannot select a future date."}, status=status.HTTP_400_BAD_REQUEST)
            
        lesson = DailyLesson.objects.filter(user=request.user, date=target_date).first()
        
        if not lesson:
            # ALLOW GENERATION for "today" or "yesterday" (grace period for timezones behind server)
            # If a specific date was passed, only allow generation if it's recent (today or yesterday)
            server_today = timezone.now().date()
            is_recent = target_date == server_today or target_date == (server_today - timezone.timedelta(days=1))
            
            if not is_recent:
                return Response({"error": "No lesson found for this date."}, status=status.HTTP_404_NOT_FOUND)

            # Simple check if profile exists
            if not hasattr(request.user, 'profile'):
                 return Response({"error": "User profile not found."}, status=status.HTTP_400_BAD_REQUEST)
            
            profile = request.user.profile
            ai_service = AIService()
            try:
                interests = profile.interests if profile.interests else ["General"]
                
                # Fetch recently used verbs to avoid repetition (last 30 verbs)
                recent_verbs = Verb.objects.filter(lessons__user=request.user).order_by('-lessons__date')[:30].values_list('word', flat=True)
                
                lesson_data = ai_service.generate_daily_lesson(profile, interests, recently_used_verbs=list(recent_verbs))
                
                if lesson_data:
                    lesson = DailyLesson.objects.create(user=request.user, date=target_date)
                    
                    for verb_data in lesson_data.get('verbs', []):
                        verb, _ = Verb.objects.get_or_create(
                            word=verb_data['word'],
                            defaults={
                                'base_form': verb_data['base_form'],
                                'past_simple': verb_data['past_simple'],
                                'past_participle': verb_data['past_participle'],
                                'translation': { "pt": verb_data['translation'] }, 
                                'conjugations': verb_data.get('conjugations', {}),
                                'level': verb_data.get('level', profile.proficiency_level)
                            }
                        )
                        lesson.verbs.add(verb)
                        
                        LessonContent.objects.create(
                            lesson=lesson,
                            verb=verb,
                            context_sentences=verb_data['context_sentences'],
                            quiz_questions=verb_data['quiz_questions'],
                            fill_gap_exercise=verb_data['fill_gap_exercise']
                        )
                else:
                    return Response({"error": "Failed to generate lesson content."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

            except Exception as e:
                print(f"Error generating lesson: {e}")
                return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        serializer = self.get_serializer(lesson)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def history(self, request):
        """Returns a summary of days with lessons for the calendar."""
        lessons = DailyLesson.objects.filter(user=request.user).values('date', 'completed', 'score')
        # We also want to provide the user's level for color coding
        profile = request.user.profile
        return Response({
            "lessons": list(lessons),
            "user_level": profile.proficiency_level,
            "join_date": request.user.date_joined.date()
        })

