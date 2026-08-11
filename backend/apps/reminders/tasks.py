import logging
from datetime import date
from celery import shared_task
from django.utils import timezone
from apps.invoices.models import Invoice
from apps.reminders.models import Reminder
from apps.reminders.brevo_service import send_brevo_reminder_email
from apps.reminders.whatsapp_service import send_whatsapp_reminder

logger = logging.getLogger(__name__)


def process_automated_reminders():
    """
    Core automation engine — runs daily via Celery Beat.

    Steps:
    1. Flips status to 'overdue' for any invoice past due_date.
    2. Scans invoices with automate_enabled=True and status='overdue'.
    3. De-duplicates against user's default_reminder_interval.
    4. Escalates tone based on days overdue:
          1–7  days  → friendly
          8–14 days  → firm
          15+  days  → final
    5. Sends Email (Brevo) + WhatsApp (Meta Cloud API) simultaneously.
    6. Logs a Reminder entry with full channel tracking.
    """
    today = date.today()
    results = {
        'overdue_flipped': 0,
        'reminders_sent': 0,
        'reminders_skipped': 0,
        'reminders_failed': 0,
        'whatsapp_sent': 0,
        'whatsapp_failed': 0,
        'whatsapp_skipped': 0,
    }

    # 1. Automatically flip pending → overdue for past-due invoices
    pending_overdue = Invoice.objects.filter(status='pending', due_date__lt=today)
    results['overdue_flipped'] = pending_overdue.update(status='overdue')

    # 2. Query overdue invoices where automation is enabled
    candidate_invoices = Invoice.objects.filter(
        status='overdue',
        automate_enabled=True
    ).select_related('user__profile', 'client')

    for invoice in candidate_invoices:
        user_profile = getattr(invoice.user, 'profile', None)
        interval = user_profile.default_reminder_interval if user_profile else 7

        # 3. De-duplication: skip if last reminder was sent within interval
        last_reminder = invoice.reminders.filter(status='sent').order_by('-sent_at').first()
        if last_reminder:
            last_sent_date = timezone.localtime(last_reminder.sent_at).date()
            days_since = (today - last_sent_date).days
            if days_since < interval:
                logger.info(
                    "Skipping Invoice #%s: last reminder %d days ago (< %d day interval).",
                    invoice.invoice_number, days_since, interval
                )
                results['reminders_skipped'] += 1
                continue

        # 4. Tone escalation based on days overdue
        days_overdue = (today - invoice.due_date).days
        if days_overdue <= 7:
            tone = 'friendly'
        elif days_overdue <= 14:
            tone = 'firm'
        else:
            tone = 'final'

        # 5a. Send Email via Brevo
        email_res = send_brevo_reminder_email(invoice, tone=tone)
        email_status = 'sent' if email_res.get('success') else 'failed'
        if email_res.get('simulated'):
            email_status = 'simulated'

        if email_status == 'sent':
            results['reminders_sent'] += 1
            logger.info(
                "Automated %s email sent for Invoice #%s → %s",
                tone.upper(), invoice.invoice_number, invoice.client.email
            )
        else:
            results['reminders_failed'] += 1
            logger.warning(
                "Failed email reminder for Invoice #%s: %s",
                invoice.invoice_number, email_res.get('message')
            )

        # 5b. Send WhatsApp via Meta Cloud API
        wa_res = send_whatsapp_reminder(invoice, tone=tone)
        wa_status_val = 'sent' if wa_res.get('success') and not wa_res.get('simulated') else (
            'simulated' if wa_res.get('simulated') else 'failed'
        )

        if wa_res.get('success'):
            results['whatsapp_sent'] += 1
            logger.info(
                "Automated %s WhatsApp sent for Invoice #%s → %s",
                tone.upper(), invoice.invoice_number, wa_res.get('phone')
            )
        elif wa_res.get('error') == 'no_phone':
            results['whatsapp_skipped'] += 1
            logger.info(
                "WhatsApp skipped for Invoice #%s: no client phone configured.",
                invoice.invoice_number
            )
        else:
            results['whatsapp_failed'] += 1
            logger.warning(
                "Failed WhatsApp reminder for Invoice #%s: %s",
                invoice.invoice_number, wa_res.get('message')
            )

        # 6. Log Reminder record (with both email + WhatsApp details)
        overall_status = 'sent' if (email_status == 'sent' or wa_status_val == 'sent') else email_status
        Reminder.objects.create(
            invoice=invoice,
            tone=tone,
            channel='both',
            # Email fields
            email_subject=email_res.get('subject', f"Payment Reminder: Invoice #{invoice.invoice_number}"),
            email_body=email_res.get('body', ''),
            email_status=email_status,
            # WhatsApp fields
            wa_body=wa_res.get('body', ''),
            wa_message_id=wa_res.get('message_id'),
            wa_status=wa_status_val,
            wa_phone=wa_res.get('phone'),
            wa_error=str(wa_res.get('error', '')) if not wa_res.get('success') else None,
            # Overall
            status=overall_status,
        )

    return results


@shared_task
def check_and_send_automated_reminders():
    """
    Celery Beat Periodic Task — called daily.
    """
    logger.info("Starting scheduled Celery Beat reminder automation task...")
    return process_automated_reminders()
