"""
whatsapp_service.py
───────────────────
Sends automated WhatsApp reminder messages via the Meta (Facebook) WhatsApp
Cloud API (Graph API v19.0).

Free tier:  1,000 user-initiated conversations / month.
Outbound (business-initiated): charged per conversation (~$0.005 USD).
For small businesses sending < 250 reminders / month, cost ≈ $1–2 USD max.

API Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/messages
"""

import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────────────
# WhatsApp Tone Message Templates
# Uses WhatsApp-friendly plain text (no HTML). Keep lines short for mobile.
# ──────────────────────────────────────────────────────────────────────────────
WA_TONE_TEMPLATES = {
    'friendly': (
        "👋 Hi {client_name},\n\n"
        "Hope you're doing well!\n\n"
        "This is a gentle reminder that *Invoice #{invoice_number}* "
        "for *₹{total}* was due on *{due_date}* and is currently pending.\n\n"
        "{payment_line}"
        "Please feel free to reply here if you have any questions.\n\n"
        "Thank you 🙏\n"
        "— *{business_name}*"
    ),
    'firm': (
        "📋 Hello {client_name},\n\n"
        "Our records show that *Invoice #{invoice_number}* for *₹{total}*, "
        "which was due on *{due_date}*, is still unpaid.\n\n"
        "{payment_line}"
        "Kindly process the payment at your earliest convenience.\n\n"
        "— *{business_name}*"
    ),
    'final': (
        "⚠️ FINAL NOTICE — {client_name},\n\n"
        "*Invoice #{invoice_number}* for *₹{total}* "
        "(due: {due_date}) remains unpaid despite previous reminders.\n\n"
        "{payment_line}"
        "Please settle this *immediately* to avoid any account disruption.\n\n"
        "— *{business_name}*"
    ),
}

PAYMENT_CONFIRMED_TEMPLATE = (
    "✅ Payment Received!\n\n"
    "Hi {client_name}, we've received your payment of *₹{total}* "
    "for *Invoice #{invoice_number}*.\n\n"
    "Thank you for settling on time! 🎉\n\n"
    "— *{business_name}*"
)


def _build_payment_line(invoice, user_profile):
    """Build a dynamic payment link / UPI ID line for the message body."""
    lines = []
    if user_profile and user_profile.upi_id:
        lines.append(f"💳 Pay via UPI: *{user_profile.upi_id}*")
    rzp_key = user_profile.razorpay_key_id if user_profile else None
    if rzp_key:
        lines.append(
            f"🔗 Pay via Card/UPI: https://invoice-chaser-wine.vercel.app/pay/{invoice.id}"
        )
    return "\n".join(lines) + "\n\n" if lines else ""


def build_whatsapp_message(invoice, tone='friendly'):
    """
    Returns the fully formatted plain-text WhatsApp message for a given invoice
    and tone. Can be used for preview / template rendering without sending.
    """
    client = invoice.client
    user_profile = getattr(invoice.user, 'profile', None)
    business_name = (
        user_profile.business_name
        if user_profile and user_profile.business_name
        else invoice.user.get_full_name() or invoice.user.username
    )

    template = WA_TONE_TEMPLATES.get(tone, WA_TONE_TEMPLATES['friendly'])
    payment_line = _build_payment_line(invoice, user_profile)

    return template.format(
        client_name=client.name,
        invoice_number=invoice.invoice_number,
        total=f"{invoice.total:,.2f}",
        due_date=str(invoice.due_date),
        business_name=business_name,
        payment_line=payment_line,
    )


def build_payment_confirmation_message(invoice):
    """Returns a payment confirmation WhatsApp message."""
    client = invoice.client
    user_profile = getattr(invoice.user, 'profile', None)
    business_name = (
        user_profile.business_name
        if user_profile and user_profile.business_name
        else invoice.user.get_full_name() or invoice.user.username
    )
    return PAYMENT_CONFIRMED_TEMPLATE.format(
        client_name=client.name,
        invoice_number=invoice.invoice_number,
        total=f"{invoice.total:,.2f}",
        business_name=business_name,
    )


# ──────────────────────────────────────────────────────────────────────────────
# Core Sender
# ──────────────────────────────────────────────────────────────────────────────

def send_whatsapp_message(phone_number: str, message_body: str, user_profile=None):
    """
    Sends a plain-text WhatsApp message via Meta Graph API.

    Priority for credentials:
        1. user_profile.wa_phone_number_id + user_profile.get_wa_access_token()
        2. settings.WA_PHONE_NUMBER_ID + settings.WA_ACCESS_TOKEN  (platform default)
        3. Simulation mode (dev fallback)

    Args:
        phone_number:  Recipient phone in E.164 format, e.g. "919876543210"
        message_body:  Plain-text WhatsApp message (supports *bold* and _italic_)
        user_profile:  UserProfile instance (optional, for per-user API credentials)

    Returns:
        dict with keys: success (bool), method, message_id (if sent), error (if failed),
                        simulated (bool), phone, body_preview
    """

    # ── Resolve credentials ────────────────────────────────────────────────
    phone_number_id = None
    access_token = None

    if user_profile:
        phone_number_id = user_profile.wa_phone_number_id
        access_token = user_profile.get_wa_access_token()

    # Fall back to platform-wide settings
    if not phone_number_id or not access_token:
        phone_number_id = getattr(settings, 'WA_PHONE_NUMBER_ID', None)
        access_token = getattr(settings, 'WA_ACCESS_TOKEN', None)

    body_preview = message_body[:80] + "..." if len(message_body) > 80 else message_body

    # ── Simulation mode (no credentials configured) ────────────────────────
    if not phone_number_id or not access_token:
        logger.warning(
            "WhatsApp credentials not configured — SIMULATING send to %s", phone_number
        )
        return {
            'success': True,
            'simulated': True,
            'method': 'Simulation',
            'phone': phone_number,
            'body_preview': body_preview,
            'message': 'Simulated WhatsApp send (WA credentials not configured).',
        }

    # ── Real Meta Cloud API send ───────────────────────────────────────────
    api_version = getattr(settings, 'WA_API_VERSION', 'v19.0')
    url = f"https://graph.facebook.com/{api_version}/{phone_number_id}/messages"

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": phone_number,
        "type": "text",
        "text": {
            "preview_url": False,
            "body": message_body,
        },
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=15)
        resp_json = response.json()

        if response.status_code == 200 and resp_json.get('messages'):
            wa_message_id = resp_json['messages'][0].get('id', '')
            logger.info("WhatsApp sent → %s | wa_message_id=%s", phone_number, wa_message_id)
            return {
                'success': True,
                'simulated': False,
                'method': 'Meta WhatsApp Cloud API',
                'phone': phone_number,
                'message_id': wa_message_id,
                'body_preview': body_preview,
                'message': f"WhatsApp message sent successfully to {phone_number}.",
            }
        else:
            error_detail = resp_json.get('error', {})
            logger.error(
                "WhatsApp API error → %s | status=%s | error=%s",
                phone_number, response.status_code, error_detail
            )
            return {
                'success': False,
                'simulated': False,
                'method': 'Meta WhatsApp Cloud API',
                'phone': phone_number,
                'body_preview': body_preview,
                'error': error_detail,
                'message': f"Meta API error {response.status_code}: {error_detail.get('message', 'Unknown')}",
            }
    except requests.exceptions.Timeout:
        return {
            'success': False,
            'simulated': False,
            'method': 'Meta WhatsApp Cloud API',
            'phone': phone_number,
            'body_preview': body_preview,
            'error': 'timeout',
            'message': 'Meta WhatsApp API request timed out (15s).',
        }
    except Exception as e:
        logger.exception("Unexpected error sending WhatsApp to %s", phone_number)
        return {
            'success': False,
            'simulated': False,
            'method': 'Meta WhatsApp Cloud API',
            'phone': phone_number,
            'body_preview': body_preview,
            'error': str(e),
            'message': f"Unexpected error: {str(e)}",
        }


def send_whatsapp_reminder(invoice, tone='friendly'):
    """
    High-level helper: resolves the client phone number, builds the reminder
    message, and dispatches it via Meta Cloud API.

    Returns:  send_whatsapp_message result dict + 'body' key (full message text)
    """
    client = invoice.client
    user_profile = getattr(invoice.user, 'profile', None)

    # Normalise phone: strip spaces/dashes, ensure E.164 (91XXXXXXXXXX)
    raw_phone = (client.phone or '').strip().replace(' ', '').replace('-', '')
    if not raw_phone:
        return {
            'success': False,
            'simulated': False,
            'method': 'Meta WhatsApp Cloud API',
            'error': 'no_phone',
            'message': f"Client '{client.name}' has no phone number configured.",
        }

    # Prefix Indian country code if missing
    if raw_phone.startswith('0'):
        raw_phone = '91' + raw_phone[1:]
    elif not raw_phone.startswith('+') and not raw_phone.startswith('91'):
        raw_phone = '91' + raw_phone

    phone_e164 = raw_phone.lstrip('+')

    message_body = build_whatsapp_message(invoice, tone=tone)
    result = send_whatsapp_message(phone_e164, message_body, user_profile=user_profile)
    result['body'] = message_body
    return result
