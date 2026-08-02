from rest_framework import viewsets, permissions
from apps.clients.models import Client
from apps.clients.serializers import ClientSerializer

class ClientViewSet(viewsets.ModelViewSet):
    serializer_class = ClientSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        # Filter clients by current user or return all for dev
        return Client.objects.all()

    def perform_create(self, serializer):
        # Auto-assign user if authenticated, or grab first user
        user = self.request.user if self.request.user.is_authenticated else None
        if not user:
            from django.contrib.auth.models import User
            user = User.objects.first()
        serializer.save(user=user)
