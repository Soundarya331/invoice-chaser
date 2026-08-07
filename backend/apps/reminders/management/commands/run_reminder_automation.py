from django.core.management.base import BaseCommand
from apps.reminders.tasks import process_automated_reminders

class Command(BaseCommand):
    help = "Scans overdue invoices, updates statuses, and auto-sends reminder emails with tone escalation (Celery-free Render Cron compatible)."

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Executing automated invoice reminder scan..."))
        results = process_automated_reminders()
        self.stdout.write(
            self.style.SUCCESS(
                f"Automation complete!\n"
                f"  - Overdue Invoices Updated: {results['overdue_flipped']}\n"
                f"  - Reminders Sent: {results['reminders_sent']}\n"
                f"  - Reminders Skipped (Interval Deduplication): {results['reminders_skipped']}\n"
                f"  - Reminders Failed: {results['reminders_failed']}"
            )
        )
