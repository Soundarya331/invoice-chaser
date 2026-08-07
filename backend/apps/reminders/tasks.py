import logging
from datetime import date
from celery import shared_task
from django.utils import timezone
from apps.invoices.models import Invoice
from apps.reminders.models import Reminder
from apps.reminders.brevo_service import send_brevo_reminder_email

logger = logging.getLogger(__name__)

def process_automated_reminders():
    """
    Core automation engine:
    1. Flips status to 'overdue' for any invoice past due_date.
    2. Scans invoices with automate_enabled=True and status='overdue'.
    3. Performs concrete de-duplication against default_reminder_interval.
    4. Escalate tone based on days overdue (1-7 friendly, 8-14 firm, 15+ final).
    5. Sends Brevo reminder and logs Reminder entry.
    """
    today = date.today()
    results = {
        'overdue_flipped': 0,
        'reminders_sent': 0,
        'reminders_skipped': 0,
        'reminders_failed': 0,
    }

    # 1. Automatically recalculate & flip status to 'overdue' for overdue pending invoices
    pending_overdue_invoices = Invoice.objects.filter(status='pending', due_date__lt=today)
    results['overdue_flipped'] = pending_overdue_invoices.update(status='overdue')

    # 2. Query overdue invoices where automation is enabled
    candidate_invoices = Invoice.objects.filter(
        status='overdue', 
        automate_enabled=True
    ).select_related('user__profile', 'client')

    for invoice in candidate_invoices:
        user_profile = getattr(invoice.user, 'profile', None)
        interval = user_profile.default_reminder_interval if user_profile else 7

        # De-duplication check: Check last sent reminder
        last_reminder = invoice.reminders.filter(status='sent').order_by('-sent_at').first()
        if last_reminder:
            last_sent_date = timezone.localtime(last_reminder.sent_at).date()
            days_since_last_reminder = (today - last_sent_date).days
            if days_since_last_reminder < interval:
                logger.info(f"Skipping Invoice #{invoice.invoice_number}: Last reminder sent {days_since_last_reminder} days ago (< {interval} days interval).")
                results['reminders_skipped'] += 1
                continue

        # Calculate days overdue & tone escalation
        days_overdue = (today - invoice.due_date).days
        if days_overdue <= 7:
            tone = 'friendly'
        elif days_overdue <= 14:
            tone = 'firm'
        else:
            tone = 'final'

        # Send Brevo email
        email_res = send_brevo_reminder_email(invoice, tone=tone)

        # Log Reminder
        status_val = 'sent' if email_res.get('success') else 'failed'
        Reminder.objects.create(
            invoice=invoice,
            tone=tone,
            email_subject=email_res.get('subject', f"Payment Reminder: Invoice #{invoice.invoice_number}"),
            email_body=email_res.get('body', ''),
            status=status_val
        )

        if status_val == 'sent':
            results['reminders_sent'] += 1
            logger.info(f"Automated {tone.upper()} reminder sent for Invoice #{invoice.invoice_number} to {invoice.client.email}")
        else:
            results['reminders_failed'] += 1
            logger.warning(f"Failed sending automated reminder for Invoice #{invoice.invoice_number}")

    return results


@shared_task
def check_and_send_automated_reminders():
    """
    Celery Beat Periodic Task wrapper.
    """
    logger.info("Starting scheduled Celery Beat reminder automation task...")
    return process_automated_reminders()
