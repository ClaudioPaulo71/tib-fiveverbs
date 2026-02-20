from rest_framework import serializers
from .models import UserProfile, LEVEL_CHOICES

class UserProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    
    class Meta:
        model = UserProfile
        fields = [
            'id', 'username', 'email', 'native_language', 'proficiency_level', 
            'interests', 'streak_days', 'xp_points', 'phone', 'location', 'avatar_url'
        ]
        read_only_fields = ['streak_days', 'xp_points']
