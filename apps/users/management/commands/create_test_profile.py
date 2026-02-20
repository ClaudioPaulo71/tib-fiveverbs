from django.core.management.base import BaseCommand
from apps.users.models import UserProfile
from django.contrib.auth.models import User

class Command(BaseCommand):
    help = 'Creates a test profile for the first user.'

    def handle(self, *args, **kwargs):
        user = User.objects.first()
        if not user:
            self.stdout.write(self.style.ERROR('No users found.'))
            return

        profile, created = UserProfile.objects.get_or_create(user=user)
        profile.native_language = 'Portuguese'
        profile.proficiency_level = 'intermediate'
        profile.interests = ['Technology', 'Travel', 'Movies']
        profile.save()
        
        self.stdout.write(self.style.SUCCESS(f'Profile updated for {user.username}'))
