import base64
import hashlib
from django.db import models
from django.contrib.auth.models import User
from django.conf import settings
from cryptography.fernet import Fernet

def _get_fernet_cipher():
    secret = (getattr(settings, 'SECRET_KEY', 'default-key')).encode('utf-8')
    key = base64.urlsafe_b64encode(hashlib.sha256(secret).digest())
    return Fernet(key)

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
    brevo_api_key_encrypted = models.TextField(blank=True, null=True, help_text="Fernet-encrypted Brevo API Key")
    razorpay_key_id = models.CharField(max_length=255, blank=True, null=True, help_text="Razorpay Key ID")
    razorpay_key_secret_encrypted = models.TextField(blank=True, null=True, help_text="Fernet-encrypted Razorpay Secret")
    upi_id = models.CharField(max_length=255, blank=True, null=True, help_text="Default UPI ID for payment QR codes")
    created_at = models.DateTimeField(auto_now_add=True)

    def get_razorpay_key_secret(self):
        if not self.razorpay_key_secret_encrypted:
            return None
        try:
            cipher = _get_fernet_cipher()
            return cipher.decrypt(self.razorpay_key_secret_encrypted.encode('utf-8')).decode('utf-8')
        except Exception:
            return None

    def set_razorpay_key_secret(self, raw_secret):
        if not raw_secret:
            self.razorpay_key_secret_encrypted = None
        else:
            cipher = _get_fernet_cipher()
            self.razorpay_key_secret_encrypted = cipher.encrypt(raw_secret.strip().encode('utf-8')).decode('utf-8')

    def get_brevo_api_key(self):
        if not self.brevo_api_key_encrypted:
            return None
        try:
            cipher = _get_fernet_cipher()
            return cipher.decrypt(self.brevo_api_key_encrypted.encode('utf-8')).decode('utf-8')
        except Exception:
            return None

    def set_brevo_api_key(self, raw_key):
        if not raw_key:
            self.brevo_api_key_encrypted = None
        else:
            cipher = _get_fernet_cipher()
            self.brevo_api_key_encrypted = cipher.encrypt(raw_key.strip().encode('utf-8')).decode('utf-8')

    def __str__(self):
        return f"{self.user.email} ({self.business_name or self.user.username})"
