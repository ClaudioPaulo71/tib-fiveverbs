from django.contrib import admin
from .models import Topic, Verb, DailyLesson, LessonContent

@admin.register(Topic)
class TopicAdmin(admin.ModelAdmin):
    list_display = ('name',)

@admin.register(Verb)
class VerbAdmin(admin.ModelAdmin):
    list_display = ('word', 'translation', 'level')
    list_filter = ('level',)

@admin.register(DailyLesson)
class DailyLessonAdmin(admin.ModelAdmin):
    list_display = ('user', 'date', 'completed', 'score')
    list_filter = ('date', 'completed')

@admin.register(LessonContent)
class LessonContentAdmin(admin.ModelAdmin):
    list_display = ('lesson', 'verb')
