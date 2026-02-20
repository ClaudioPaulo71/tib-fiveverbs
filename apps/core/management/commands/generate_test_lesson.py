from django.core.management.base import BaseCommand
from apps.users.models import UserProfile
from apps.core.services.ai_service import AIService
from apps.core.models import DailyLesson, Verb, LessonContent
import json
from django.utils import timezone
from django.contrib.auth.models import User

class Command(BaseCommand):
    help = 'Generates a test lesson for the first user found.'

    def handle(self, *args, **kwargs):
        user = User.objects.first()
        if not user:
            self.stdout.write(self.style.ERROR('No users found. Please create a user first.'))
            return

        try:
            profile = user.profile
        except UserProfile.DoesNotExist:
             self.stdout.write(self.style.ERROR('User has no profile. Please complete onboarding.'))
             return

        if not profile.interests:
             self.stdout.write(self.style.WARNING('User has no interests. Using default.'))
             interests = ["Technology", "Travel"]
        else:
             interests = profile.interests

        self.stdout.write(f'Generating lesson for {user.username} ({profile.native_language})...')
        
        ai_service = AIService()
        lesson_data = ai_service.generate_daily_lesson(profile, interests)
        
        if not lesson_data:
            self.stdout.write(self.style.ERROR('Failed to generate lesson content.'))
            return
            
        self.stdout.write(json.dumps(lesson_data, indent=2, ensure_ascii=False))

        # Save to DB (Simplified logic for test)
        lesson, created = DailyLesson.objects.get_or_create(
            user=user,
            date=timezone.now().date()
        )
        
        for verb_data in lesson_data.get('verbs', []):
            verb, _ = Verb.objects.get_or_create(
                word=verb_data['word'],
                defaults={
                    'base_form': verb_data['base_form'],
                    'past_simple': verb_data['past_simple'],
                    'past_participle': verb_data['past_participle'],
                    'translation': { "pt": verb_data['translation'] }, # Simplify for now
                    'level': verb_data.get('level', 'beginner')
                }
            )
            lesson.verbs.add(verb)
            
            # Create content
            LessonContent.objects.create(
                lesson=lesson,
                verb=verb,
                context_sentences=verb_data['context_sentences'],
                quiz_questions=verb_data['quiz_questions'],
                fill_gap_exercise=verb_data['fill_gap_exercise']
            )
            
        self.stdout.write(self.style.SUCCESS('Lesson saved to database.'))
