from rest_framework import viewsets, permissions
from apps.reminders.models import Reminder
from apps.reminders.serializers import ReminderSerializer

class ReminderViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ReminderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Reminder.objects.filter(invoice__user=self.request.user)
