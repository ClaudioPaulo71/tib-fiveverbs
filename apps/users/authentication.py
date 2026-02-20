import jwt
import requests
from django.contrib.auth import get_user_model
from rest_framework import authentication
from rest_framework import exceptions
from django.conf import settings
import os

User = get_user_model()

class Auth0JSONWebTokenAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        auth = request.META.get('HTTP_AUTHORIZATION', None)
        if not auth:
            return None
        
        parts = auth.split()
        if parts[0].lower() != 'bearer':
            raise exceptions.AuthenticationFailed('Authorization header must start with Bearer.')
        elif len(parts) == 1:
            raise exceptions.AuthenticationFailed('Token not found.')
        elif len(parts) > 2:
            raise exceptions.AuthenticationFailed('Authorization header must be Bearer token.')
        
        token = parts[1]
        
        try:
            payload = self.validate_token(token)
        except Exception as e:
            raise exceptions.AuthenticationFailed(f'Invalid token: {str(e)}')
            
        user = self.get_user_from_payload(payload)
        return (user, token)

    def validate_token(self, token):
        domain = os.getenv('AUTH0_DOMAIN')
        audience = os.getenv('AUTH0_AUDIENCE')
        
        jwks_url = f'https://{domain}/.well-known/jwks.json'
        jwks = requests.get(jwks_url).json()
        
        public_key = None
        header = jwt.get_unverified_header(token)
        
        for key in jwks['keys']:
            if key['kid'] == header['kid']:
                public_key = jwt.algorithms.RSAAlgorithm.from_jwk(key)
        
        if public_key is None:
            raise Exception('Public key not found.')
            
        payload = jwt.decode(
            token,
            public_key,
            algorithms=['RS256'],
            audience=audience,
            issuer=f'https://{domain}/'
        )
        
        return payload

    def get_user_from_payload(self, payload):
        sub = payload.get('sub')
        if not sub:
            raise exceptions.AuthenticationFailed('Invalid payload: sub not found.')
            
        # Create or update user
        # We use the 'sub' as username to ensure uniqueness map to Auth0
        try:
            user, created = User.objects.get_or_create(username=sub)
            if created:
                # Set a dummy password or handle properly
                user.set_unusable_password()
                user.save()
            return user
        except User.MultipleObjectsReturned:
            raise exceptions.AuthenticationFailed('Multiple users found with this sub.')
