from django.contrib import admin
from apps.clients.models import Client

@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'email', 'company', 'phone', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('name', 'email', 'company', 'user__email')
