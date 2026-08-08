from django.contrib import admin
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from django.urls import reverse
from apps.users.models import UserProfile

try:
    admin.site.unregister(User)
except admin.sites.NotRegistered:
    pass

class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'Profile Settings'

@admin.register(User)
class CustomUserAdmin(BaseUserAdmin):
    inlines = [UserProfileInline]
    list_display = ('email', 'username', 'first_name', 'last_name', 'is_staff', 'is_superuser', 'reset_password_link', 'date_joined')
    search_fields = ('email', 'username', 'first_name', 'last_name')

    def reset_password_link(self, obj):
        url = reverse('admin:auth_user_password_change', args=[obj.pk])
        return format_html('<a class="button" style="background:#1E2A38; color:#F1E9D6; padding:3px 8px; border-radius:3px; font-size:11px; text-decoration:none;" href="{}">🔑 Reset Password</a>', url)
    
    reset_password_link.short_description = 'Password Action'

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'business_name', 'phone', 'default_reminder_tone', 'default_reminder_interval', 'created_at')
    list_filter = ('default_reminder_tone', 'created_at')
    search_fields = ('user__email', 'business_name', 'phone')
