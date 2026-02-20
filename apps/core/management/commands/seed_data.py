from django.core.management.base import BaseCommand
from apps.core.models import Topic, Verb
from apps.users.models import LEVEL_BEGINNER, LEVEL_INTERMEDIATE, LEVEL_ADVANCED

class Command(BaseCommand):
    help = 'Seeds the database with initial topics and verbs'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding data...')
        
        # Topics
        topics = [
            'Technology', 'Travel', 'Business', 'Movies', 'History',
            'Daily Life', 'Food', 'Sports', 'Music', 'Art'
        ]
        
        for name in topics:
            Topic.objects.get_or_create(name=name)
        self.stdout.write(f'Created {len(topics)} topics.')

        # Verbs (Sample)
        verbs = [
            {
                'word': 'to run', 'base_form': 'run', 'past_simple': 'ran', 'past_participle': 'run',
                'translation': {'pt': 'Correr'}, 'level': LEVEL_BEGINNER
            },
            {
                'word': 'to eat', 'base_form': 'eat', 'past_simple': 'ate', 'past_participle': 'eaten',
                'translation': {'pt': 'Comer'}, 'level': LEVEL_BEGINNER
            },
            {
                'word': 'to speak', 'base_form': 'speak', 'past_simple': 'spoke', 'past_participle': 'spoken',
                'translation': {'pt': 'Falar'}, 'level': LEVEL_INTERMEDIATE
            },
            {
                'word': 'to think', 'base_form': 'think', 'past_simple': 'thought', 'past_participle': 'thought',
                'translation': {'pt': 'Pensar'}, 'level': LEVEL_INTERMEDIATE
            },
             {
                'word': 'to understand', 'base_form': 'understand', 'past_simple': 'understood', 'past_participle': 'understood',
                'translation': {'pt': 'Entender'}, 'level': LEVEL_ADVANCED
            },
        ]

        for v in verbs:
            verb, created = Verb.objects.get_or_create(word=v['word'], defaults=v)
            if created:
                self.stdout.write(f"Created verb: {v['word']}")
        
        self.stdout.write(self.style.SUCCESS('Successfully seeded data.'))
