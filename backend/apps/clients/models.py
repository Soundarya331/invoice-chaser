from django.db import models
from django.contrib.auth.models import User

class Client(models.Model):
    """
    Represents an external client/customer billed by a SaaS Subscriber.
    Strictly scoped to a specific User (subscriber).
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='clients')
    name = models.CharField(max_length=255, help_text="Client contact or company name")
    email = models.EmailField(help_text="Email address where invoice reminders will be sent")
    company = models.CharField(max_length=255, blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.company or self.email})"
