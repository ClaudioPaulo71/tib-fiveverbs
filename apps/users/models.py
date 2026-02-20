from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

# Proficience Levels
LEVEL_BEGINNER = 'beginner'
LEVEL_INTERMEDIATE = 'intermediate'
LEVEL_ADVANCED = 'advanced'

LEVEL_CHOICES = (
    (LEVEL_BEGINNER, 'Beginner'),
    (LEVEL_INTERMEDIATE, 'Intermediate'),
    (LEVEL_ADVANCED, 'Advanced'),
)

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    native_language = models.CharField(max_length=50, default='Portuguese') # Simplification: default to PT
    proficiency_level = models.CharField(max_length=20, choices=LEVEL_CHOICES, default=LEVEL_BEGINNER)
    interests = models.JSONField(default=list, blank=True)
    streak_days = models.IntegerField(default=0)
    last_activity_date = models.DateField(null=True, blank=True)
    xp_points = models.IntegerField(default=0)
    
    # New fields for product readiness
    phone = models.CharField(max_length=20, blank=True, null=True)
    location = models.CharField(max_length=100, blank=True, null=True)
    avatar_url = models.URLField(max_length=500, blank=True, null=True)
    
    def __str__(self):
        return f"{self.user.username}'s Profile"

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    if hasattr(instance, 'profile'):
        instance.profile.save()

class UserActionLog(models.Model):
    ACTION_TYPES = (
        ('ENTRY', 'Entry/Login'),
        ('TRANSACTION', 'Business Transaction'),
        ('PROFILE_UPDATE', 'Profile Update'),
    )
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='action_logs')
    action_type = models.CharField(max_length=20, choices=ACTION_TYPES)
    timestamp = models.DateTimeField(auto_now_add=True)
    description = models.CharField(max_length=255)
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.user.username} - {self.action_type} - {self.timestamp}"
