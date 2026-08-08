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
    business_name = serializers.CharField(source='profile.business_name', required=False, allow_blank=True)
    phone = serializers.CharField(source='profile.phone', required=False, allow_blank=True)
    default_reminder_tone = serializers.CharField(source='profile.default_reminder_tone', required=False)
    default_reminder_interval = serializers.IntegerField(source='profile.default_reminder_interval', required=False)
    brevo_api_key = serializers.CharField(write_only=True, required=False, allow_blank=True)
    brevo_api_key_masked = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 
            'business_name', 'phone', 'default_reminder_tone', 
            'default_reminder_interval', 'brevo_api_key', 'brevo_api_key_masked',
            'is_superuser', 'is_staff'
        ]

    def get_brevo_api_key_masked(self, obj):
        profile = getattr(obj, 'profile', None)
        if not profile:
            return None
        raw_key = profile.get_brevo_api_key()
        if not raw_key:
            return None
        # Mask key safely: show prefix and last 4 chars
        if len(raw_key) > 8:
            return f"{raw_key[:7]}-••••••••{raw_key[-4:]}"
        return "••••••••"

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', {})
        brevo_key = validated_data.pop('brevo_api_key', None)

        instance.first_name = validated_data.get('first_name', instance.first_name)
        instance.last_name = validated_data.get('last_name', instance.last_name)
        instance.save()

        profile, _ = UserProfile.objects.get_or_create(user=instance)
        if 'business_name' in profile_data:
            profile.business_name = profile_data['business_name']
        if 'phone' in profile_data:
            profile.phone = profile_data['phone']
        if 'default_reminder_tone' in profile_data:
            profile.default_reminder_tone = profile_data['default_reminder_tone']
        if 'default_reminder_interval' in profile_data:
            profile.default_reminder_interval = profile_data['default_reminder_interval']

        if brevo_key is not None:
            profile.set_brevo_api_key(brevo_key)

        profile.save()
        return instance
