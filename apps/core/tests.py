from django.test import TestCase
from django.contrib.auth.models import User
from .models import Topic, Verb, DailyLesson, LessonContent
from datetime import date

class CoreModelsTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='password123')
        self.verb = Verb.objects.create(
            word='run',
            base_form='run',
            past_simple='ran',
            past_participle='run',
            translation={'pt': 'correr'},
            level='beginner'
        )
        self.lesson = DailyLesson.objects.create(user=self.user, date=date.today())
        self.lesson.verbs.add(self.verb)

    def test_daily_lesson_creation(self):
        self.assertEqual(self.lesson.user.username, 'testuser')
        self.assertEqual(self.lesson.verbs.count(), 1)
        self.assertEqual(self.lesson.score, 0)

    def test_lesson_content_creation(self):
        content = LessonContent.objects.create(
            lesson=self.lesson,
            verb=self.verb,
            context_sentences=['I run every day.'],
            quiz_questions=[{'question': 'Past of run?', 'answer': 'ran'}],
            fill_gap_exercise={'sentence': 'I ____ fast.', 'answer': 'run'}
        )
        self.assertEqual(content.verb.word, 'run')
        self.assertEqual(len(content.context_sentences), 1)
