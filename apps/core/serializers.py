from rest_framework import serializers
from .models import Topic, Verb, DailyLesson, LessonContent

class TopicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Topic
        fields = ['id', 'name', 'icon']

class VerbSerializer(serializers.ModelSerializer):
    class Meta:
        model = Verb
        fields = ['id', 'word', 'base_form', 'past_simple', 'past_participle', 'translation', 'conjugations', 'level']

class LessonContentSerializer(serializers.ModelSerializer):
    verb = VerbSerializer(read_only=True)
    
    class Meta:
        model = LessonContent
        fields = ['id', 'verb', 'context_sentences', 'quiz_questions', 'fill_gap_exercise']

class DailyLessonSerializer(serializers.ModelSerializer):
    contents = LessonContentSerializer(many=True, read_only=True)
    
    class Meta:
        model = DailyLesson
        fields = ['id', 'user', 'date', 'verbs', 'contents', 'completed', 'score', 'user_data']
        read_only_fields = ['user', 'date', 'verbs', 'contents']

    def update(self, instance, validated_data):
        return super().update(instance, validated_data)
