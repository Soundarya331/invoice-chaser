from django.db import models
from apps.invoices.models import Invoice

class Reminder(models.Model):
    TONE_CHOICES = [
        ('friendly', 'Friendly'),
        ('firm', 'Firm'),
        ('final', 'Final'),
    ]

    STATUS_CHOICES = [
        ('sent', 'Sent'),
        ('failed', 'Failed'),
    ]

    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='reminders')
    sent_at = models.DateTimeField(auto_now_add=True)
    tone = models.CharField(max_length=20, choices=TONE_CHOICES, default='friendly')
    email_subject = models.CharField(max_length=255)
    email_body = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='sent')

    class Meta:
        ordering = ['-sent_at']

    def __str__(self):
        return f"Reminder ({self.tone}) for {self.invoice.invoice_number} - {self.status}"
