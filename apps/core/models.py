from django.db import models
from django.contrib.auth.models import User
from apps.users.models import LEVEL_CHOICES, LEVEL_BEGINNER

class Topic(models.Model):
    name = models.CharField(max_length=100)
    icon = models.CharField(max_length=255, blank=True) # URL or icon name
    
    def __str__(self):
        return self.name

class Verb(models.Model):
    word = models.CharField(max_length=100, unique=True)
    base_form = models.CharField(max_length=100)
    past_simple = models.CharField(max_length=100)
    past_participle = models.CharField(max_length=100)
    translation = models.JSONField(default=dict) # {"pt": "Correr", "es": "Correr"}
    conjugations = models.JSONField(default=dict) # {"present_simple": "...", "future": "..."}
    level = models.CharField(max_length=20, choices=LEVEL_CHOICES, default=LEVEL_BEGINNER)
    
    def __str__(self):
        return self.word

class DailyLesson(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='daily_lessons')
    date = models.DateField()
    verbs = models.ManyToManyField(Verb, related_name='lessons')
    completed = models.BooleanField(default=False)
    score = models.IntegerField(default=0)
    user_data = models.JSONField(default=dict, blank=True) # To store user answers/state
    
    class Meta:
        unique_together = ('user', 'date')
        ordering = ['-date']

    def __str__(self):
        return f"Lesson {self.date} for {self.user.username}"

class LessonContent(models.Model):
    lesson = models.ForeignKey(DailyLesson, on_delete=models.CASCADE, related_name='contents')
    verb = models.ForeignKey(Verb, on_delete=models.CASCADE)
    context_sentences = models.JSONField(default=list) # List of 3 strings (examples)
    quiz_questions = models.JSONField(default=list) # List of dictionaries
    fill_gap_exercise = models.JSONField(default=dict) 
    
    def __str__(self):
        return f"Content for {self.verb.word} in {self.lesson}"
