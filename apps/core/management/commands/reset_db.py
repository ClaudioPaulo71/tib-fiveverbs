from django.core.management.base import BaseCommand
from apps.core.models import DailyLesson, Verb

class Command(BaseCommand):
    help = 'Clears all DailyLesson and Verb data to start fresh'

    def handle(self, *args, **options):
        self.stdout.write('Clearing DailyLesson and Verb tables...')
        
        lesson_count = DailyLesson.objects.all().count()
        verb_count = Verb.objects.all().count()
        
        DailyLesson.objects.all().delete()
        Verb.objects.all().delete()
        
        self.stdout.write(self.style.SUCCESS(f'Successfully deleted {lesson_count} lessons and {verb_count} verbs.'))
        self.stdout.write(self.style.NOTICE('You can now generate fresh lessons for today.'))
