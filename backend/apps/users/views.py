from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.contrib.auth.models import User

from apps.users.serializers import RegisterSerializer, UserSerializer

def get_tokens_for_user(user):
    """Generates stateless JWT access and refresh tokens for a user."""
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }

class RegisterView(generics.CreateAPIView):
    """
    Public Endpoint: POST /api/v1/auth/register/
    Registers a new subscriber and returns JWT access & refresh tokens.
    """
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        tokens = get_tokens_for_user(user)
        user_data = UserSerializer(user).data
        
        return Response({
            'message': 'User registered successfully!',
            'tokens': tokens,
            'user': user_data
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """
    Public Endpoint: POST /api/v1/auth/login/
    Authenticates subscriber using Email + Password and returns JWT tokens.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email') or request.data.get('username')
        password = request.data.get('password')

        if not email or not password:
            return Response(
                {'error': 'Please provide both email and password.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        user = None
        try:
            user_obj = User.objects.get(email=email)
            user = authenticate(username=user_obj.username, password=password)
        except User.DoesNotExist:
            user = None

        if not user:
            return Response(
                {'error': 'Invalid email or password.'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )

        tokens = get_tokens_for_user(user)
        user_data = UserSerializer(user).data

        return Response({
            'message': 'Login successful!',
            'tokens': tokens,
            'user': user_data
        }, status=status.HTTP_200_OK)


class ProfileView(generics.RetrieveUpdateAPIView):
    """
    Protected Endpoint: GET/PUT /api/v1/auth/profile/
    Returns/Updates current logged-in user profile.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user
