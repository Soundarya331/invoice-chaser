from rest_framework import serializers
from apps.clients.models import Client

class ClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = ['id', 'name', 'email', 'company', 'phone', 'notes', 'created_at']
        read_only_fields = ['id', 'created_at']
