from rest_framework import viewsets, permissions
from apps.reminders.models import Reminder
from apps.reminders.serializers import ReminderSerializer

class ReminderViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ReminderSerializer
    permission_classes = [permissions.AllowAny]
    queryset = Reminder.objects.all()
