from rest_framework import serializers
from django.contrib.auth.models import User
from apps.users.models import UserProfile

class RegisterSerializer(serializers.ModelSerializer):
    """
    User-Friendly Registration Serializer.
    No username required! Users register with Email, Password, Name & Business Name.
    """
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, min_length=6)
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    business_name = serializers.CharField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'password', 'first_name', 'last_name', 'business_name', 'phone']

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email address already exists.")
        return value

    def create(self, validated_data):
        email = validated_data['email']
        password = validated_data['password']
        first_name = validated_data.get('first_name', '')
        last_name = validated_data.get('last_name', '')
        business_name = validated_data.pop('business_name', '')
        phone = validated_data.pop('phone', '')

        # Set username equal to email under the hood for Django compatibility
        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name
        )

        UserProfile.objects.create(
            user=user,
            business_name=business_name or f"{first_name} {last_name}".strip(),
            phone=phone
        )

        return user

class UserSerializer(serializers.ModelSerializer):
    business_name = serializers.CharField(source='profile.business_name', read_only=True)
    phone = serializers.CharField(source='profile.phone', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'business_name', 'phone']
