from django.contrib import admin
from apps.reminders.models import Reminder

@admin.register(Reminder)
class ReminderAdmin(admin.ModelAdmin):
    list_display = ('id', 'invoice', 'tone', 'status', 'sent_at', 'email_subject')
    list_filter = ('tone', 'status', 'sent_at')
    search_fields = ('invoice__invoice_number', 'email_subject', 'email_body')
