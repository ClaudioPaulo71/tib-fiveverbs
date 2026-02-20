from rest_framework import generics, permissions
from .models import UserProfile
from .serializers import UserProfileSerializer

class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        # Ensure the profile exists (it should be created by signals, but good for safety)
        user = self.request.user
        profile, created = UserProfile.objects.get_or_create(user=user)
        
        # LOG ENTRY: User accessed profile (typically happens on login/app startup)
        from .models import UserActionLog
        UserActionLog.objects.create(
            user=user,
            action_type='ENTRY',
            description="User accessed dashboard/profile",
            metadata={"ip": self.request.META.get('REMOTE_ADDR')}
        )
        
        return profile
