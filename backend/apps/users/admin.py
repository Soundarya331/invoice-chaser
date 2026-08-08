from django.contrib import admin
from apps.users.models import UserProfile

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'business_name', 'phone', 'default_reminder_tone', 'default_reminder_interval', 'created_at')
    list_filter = ('default_reminder_tone', 'created_at')
    search_fields = ('user__email', 'business_name', 'phone')
