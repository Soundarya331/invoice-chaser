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


class UserListView(generics.ListAPIView):
    """
    Protected Admin Endpoint: GET /api/v1/auth/users/
    Returns a list of all registered users in the database (Admin only).
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAdminUser]


class AdminResetPasswordView(APIView):
    """
    Protected Superadmin Endpoint: POST /api/v1/auth/admin/reset-user-password/
    Allows only superadmins (is_superuser=True) to update any user's password using their email address.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # 1. Verify logged-in user is a superadmin
        if not request.user.is_superuser:
            return Response(
                {'error': 'Permission denied. Only superadmins can reset user passwords.'},
                status=status.HTTP_403_FORBIDDEN
            )

        email = request.data.get('email')
        new_password = request.data.get('new_password')

        # 2. Validate input parameters
        if not email or not new_password:
            return Response(
                {'error': 'Both target email and new_password parameters are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(str(new_password)) < 6:
            return Response(
                {'error': 'New password must be at least 6 characters long.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 3. Check if user exists in the users table
        target_user = User.objects.filter(email__iexact=email.strip()).first()
        if not target_user:
            return Response(
                {'error': f'User with email "{email}" does not exist in the users table.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # 4. Update password securely
        target_user.set_password(new_password)
        target_user.save()

        return Response({
            'message': f'Password for user "{target_user.email}" updated successfully.',
            'user': {
                'id': target_user.id,
                'username': target_user.username,
                'email': target_user.email
            }
        }, status=status.HTTP_200_OK)


class WhatsAppWebhookView(APIView):
    """
    Public Endpoint for Meta WhatsApp Cloud API Webhook.

    GET  /api/v1/auth/whatsapp/webhook/  — Meta verification handshake
    POST /api/v1/auth/whatsapp/webhook/  — Delivery status / inbound message events
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        """
        Meta sends a GET request with hub.challenge when you first register
        the webhook in the Meta Developers Dashboard. We echo back the
        challenge to verify ownership.
        """
        from django.conf import settings
        verify_token = request.GET.get('hub.verify_token', '')
        challenge    = request.GET.get('hub.challenge', '')
        mode         = request.GET.get('hub.mode', '')

        expected_token = getattr(settings, 'WA_WEBHOOK_VERIFY_TOKEN', 'invoiceflow_webhook_secret')

        if mode == 'subscribe' and verify_token == expected_token:
            return Response(int(challenge), status=status.HTTP_200_OK)

        return Response({'error': 'Verification token mismatch.'}, status=status.HTTP_403_FORBIDDEN)

    def post(self, request):
        """
        Receives delivery status updates and inbound message notifications from Meta.
        Logs them and updates Reminder.wa_status on delivery/read receipts.
        """
        import logging
        logger = logging.getLogger(__name__)
        data = request.data

        try:
            for entry in data.get('entry', []):
                for change in entry.get('changes', []):
                    value = change.get('value', {})

                    # Delivery / read status updates
                    for stat in value.get('statuses', []):
                        wa_message_id = stat.get('id')
                        delivery_status = stat.get('status')  # sent/delivered/read/failed
                        logger.info(
                            "WhatsApp delivery update: wamid=%s status=%s",
                            wa_message_id, delivery_status
                        )
                        if wa_message_id and delivery_status in ('delivered', 'read'):
                            from apps.reminders.models import Reminder
                            Reminder.objects.filter(wa_message_id=wa_message_id).update(
                                wa_status='sent'
                            )

                    # Inbound messages (clients replying on WhatsApp)
                    for msg in value.get('messages', []):
                        from_phone = msg.get('from')
                        text = msg.get('text', {}).get('body', '')
                        logger.info(
                            "Inbound WhatsApp from %s: %s", from_phone, text[:200]
                        )
        except Exception as exc:
            logger.exception("Error processing WhatsApp webhook payload: %s", exc)

        # Meta requires HTTP 200 to stop retries
        return Response({'status': 'ok'}, status=status.HTTP_200_OK)
