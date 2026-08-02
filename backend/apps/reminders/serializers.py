from rest_framework import serializers
from apps.reminders.models import Reminder

class ReminderSerializer(serializers.ModelSerializer):
    invoice_number = serializers.CharField(source='invoice.invoice_number', read_only=True)
    client_name = serializers.CharField(source='invoice.client.name', read_only=True)

    class Meta:
        model = Reminder
        fields = ['id', 'invoice', 'invoice_number', 'client_name', 'sent_at', 'tone', 'email_subject', 'email_body', 'status']
        read_only_fields = ['id', 'sent_at']
