import os
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User

class Command(BaseCommand):
    help = "Creates or updates an admin superuser account for Django Admin management."

    def handle(self, *args, **options):
        admin_username = os.environ.get('ADMIN_USERNAME', 'admin')
        admin_email = os.environ.get('ADMIN_EMAIL', 'soundaryap182@gmail.com')
        admin_password = os.environ.get('ADMIN_PASSWORD', 'AdminSecure123!')

        user, created = User.objects.get_or_create(
            username=admin_username,
            defaults={'email': admin_email, 'is_staff': True, 'is_superuser': True}
        )

        user.email = admin_email
        user.is_staff = True
        user.is_superuser = True
        user.set_password(admin_password)
        user.save()

        if created:
            self.stdout.write(self.style.SUCCESS(f"Superuser '{admin_username}' created successfully!"))
        else:
            self.stdout.write(self.style.SUCCESS(f"Superuser '{admin_username}' password & permissions updated successfully!"))
