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
        ('simulated', 'Simulated'),
    ]

    CHANNEL_CHOICES = [
        ('email', 'Email'),
        ('whatsapp', 'WhatsApp'),
        ('both', 'Email + WhatsApp'),
    ]

    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='reminders')
    sent_at = models.DateTimeField(auto_now_add=True)
    tone = models.CharField(max_length=20, choices=TONE_CHOICES, default='friendly')
    channel = models.CharField(max_length=20, choices=CHANNEL_CHOICES, default='email')

    # Email tracking
    email_subject = models.CharField(max_length=255, blank=True, default='')
    email_body = models.TextField(blank=True, default='')
    email_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='sent')

    # WhatsApp tracking
    wa_body = models.TextField(blank=True, default='', help_text="WhatsApp message body sent")
    wa_message_id = models.CharField(
        max_length=255, blank=True, null=True,
        help_text="Meta WhatsApp Cloud API message ID (wamid.*)"
    )
    wa_status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='sent',
        help_text="Status of the WhatsApp send attempt"
    )
    wa_phone = models.CharField(
        max_length=50, blank=True, null=True,
        help_text="Recipient E.164 phone number used for WhatsApp send"
    )
    wa_error = models.TextField(
        blank=True, null=True,
        help_text="Error details if WhatsApp send failed"
    )

    # Overall status (reflects the primary channel used)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='sent')

    class Meta:
        ordering = ['-sent_at']

    def __str__(self):
        return (
            f"Reminder ({self.tone}/{self.channel}) "
            f"for {self.invoice.invoice_number} — {self.status}"
        )
