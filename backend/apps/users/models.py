from django.db import models
from django.contrib.auth.models import User

class UserProfile(models.Model):
    """
    Extends Django's built-in User model for SaaS Subscribers.
    Each subscriber gets their own business details and default settings.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    business_name = models.CharField(max_length=255, blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    default_reminder_tone = models.CharField(
        max_length=20, 
        default='friendly', 
        choices=[
            ('friendly', 'Friendly'),
            ('firm', 'Firm'),
            ('final', 'Final')
        ]
    )
    default_reminder_interval = models.IntegerField(default=7, help_text="Interval in days between reminders")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.email} ({self.business_name or self.user.username})"
