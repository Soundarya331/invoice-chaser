import logging
import requests
from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"

TONE_TEMPLATES = {
    'friendly': {
        'subject': "Friendly Reminder: Invoice #{invoice_number} is pending",
        'body': (
            "Hi {client_name},\n\n"
            "Hope you're doing well!\n\n"
            "This is a gentle reminder that invoice #{invoice_number} for INR {total} "
            "(due on {due_date}) is currently pending payment.\n\n"
            "Please feel free to reach out if you have any questions or need another copy of the invoice.\n\n"
            "Best regards,\n"
            "{business_name}"
        )
    },
    'firm': {
        'subject': "Payment Reminder: Invoice #{invoice_number} is past due",
        'body': (
            "Hello {client_name},\n\n"
            "Our records indicate that invoice #{invoice_number} for INR {total}, which was due on {due_date}, "
            "remains unpaid.\n\n"
            "Please process the payment at your earliest convenience to maintain an up-to-date account status.\n\n"
            "Thank you,\n"
            "{business_name}"
        )
    },
    'final': {
        'subject': "URGENT: Final Notice for Invoice #{invoice_number}",
        'body': (
            "ATTN: {client_name},\n\n"
            "This is a final notice regarding overdue invoice #{invoice_number} for INR {total}, "
            "originally due on {due_date}.\n\n"
            "Please settle this payment immediately to avoid any administrative actions or account disruption.\n\n"
            "Sincerely,\n"
            "{business_name}"
        )
    }
}

def send_brevo_reminder_email(invoice, tone='friendly', sender_email=None, sender_name=None, api_key=None):
    """
    Sends an invoice reminder email via Brevo SMTP Relay or Brevo REST API v3.
    """
    client = invoice.client
    user = invoice.user
    user_profile = getattr(user, 'profile', None)
    business_name = user_profile.business_name if user_profile and user_profile.business_name else user.get_full_name() or user.username

    template = TONE_TEMPLATES.get(tone, TONE_TEMPLATES['friendly'])
    
    subject = template['subject'].format(
        invoice_number=invoice.invoice_number,
        total=invoice.total,
        due_date=invoice.due_date,
        client_name=client.name,
        business_name=business_name
    )
    
    body = template['body'].format(
        invoice_number=invoice.invoice_number,
        total=invoice.total,
        due_date=invoice.due_date,
        client_name=client.name,
        business_name=business_name
    )

    smtp_password = getattr(settings, 'EMAIL_HOST_PASSWORD', '')
    smtp_user = getattr(settings, 'EMAIL_HOST_USER', '')
    
    # Priority: explicit api_key param > user_profile decrypted key > system BREVO_API_KEY
    user_brevo_key = user_profile.get_brevo_api_key() if user_profile else None
    brevo_key = api_key or user_brevo_key or getattr(settings, 'BREVO_API_KEY', '')
    
    from_email = sender_email or (user.email if user and user.email else None) or smtp_user or getattr(settings, 'DEFAULT_FROM_EMAIL', 'invoices@invoicechaser.com')

    # 1. Check if SMTP configuration is present (Brevo SMTP Key)
    if smtp_password and smtp_user:
        try:
            send_mail(
                subject=subject,
                message=body,
                from_email=from_email,
                recipient_list=[client.email],
                fail_silently=False,
            )
            return {
                'success': True,
                'method': 'Brevo SMTP',
                'simulated': False,
                'subject': subject,
                'body': body,
                'recipient': client.email,
                'message': f"Email sent successfully via Brevo SMTP to {client.email}!"
            }
        except Exception as e:
            logger.exception("Brevo SMTP sending failed")
            return {
                'success': False,
                'method': 'Brevo SMTP',
                'simulated': False,
                'subject': subject,
                'body': body,
                'recipient': client.email,
                'error': str(e),
                'message': f"Failed to send email via Brevo SMTP: {str(e)}"
            }

    # 2. Check if Brevo REST API Key is present
    if brevo_key:
        headers = {
            'accept': 'application/json',
            'api-key': brevo_key,
            'content-type': 'application/json'
        }
        payload = {
            'sender': {'name': business_name, 'email': from_email},
            'to': [{'email': client.email, 'name': client.name}],
            'subject': subject,
            'textContent': body
        }
        try:
            response = requests.post(BREVO_API_URL, json=payload, headers=headers, timeout=10)
            if response.status_code in [200, 201, 202]:
                return {
                    'success': True,
                    'method': 'Brevo REST API',
                    'simulated': False,
                    'subject': subject,
                    'body': body,
                    'recipient': client.email,
                    'message_id': response.json().get('messageId'),
                    'message': f"Email sent successfully via Brevo API to {client.email}!"
                }
            else:
                return {
                    'success': False,
                    'method': 'Brevo REST API',
                    'simulated': False,
                    'subject': subject,
                    'body': body,
                    'recipient': client.email,
                    'error': response.text,
                    'message': f"Brevo API error status {response.status_code}"
                }
        except Exception as e:
            return {
                'success': False,
                'method': 'Brevo REST API',
                'simulated': False,
                'subject': subject,
                'body': body,
                'recipient': client.email,
                'error': str(e),
                'message': f"Failed to connect to Brevo API: {str(e)}"
            }

    # 3. Dev simulation if neither key is provided
    logger.warning("Neither Brevo SMTP nor BREVO_API_KEY configured. Simulating email send.")
    return {
        'success': True,
        'method': 'Simulation',
        'simulated': True,
        'subject': subject,
        'body': body,
        'recipient': client.email,
        'message': 'Simulated sending (neither Brevo SMTP nor API Key configured).'
    }
