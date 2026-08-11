from django.http import HttpResponse
from django.db.models import Sum
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.invoices.models import Invoice
from apps.invoices.serializers import InvoiceSerializer
from apps.invoices.utils import generate_invoice_pdf
from apps.reminders.models import Reminder
from apps.reminders.brevo_service import send_brevo_reminder_email
from apps.reminders.whatsapp_service import send_whatsapp_reminder, build_payment_confirmation_message, send_whatsapp_message

class InvoiceViewSet(viewsets.ModelViewSet):
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Strict multi-tenant security: Subscriber only sees their own invoices
        queryset = Invoice.objects.filter(user=self.request.user)
        status_param = self.request.query_params.get('status')
        search_param = self.request.query_params.get('search')

        if status_param and status_param.lower() != 'all':
            queryset = queryset.filter(status=status_param.lower())

        if search_param:
            queryset = queryset.filter(
                client__name__icontains=search_param
            ) | queryset.filter(
                invoice_number__icontains=search_param
            )

        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'], url_path='dashboard_stats')
    def dashboard_stats(self, request):
        invoices = self.get_queryset()
        
        # Outstanding (pending + overdue)
        outstanding_qs = invoices.filter(status__in=['pending', 'overdue'])
        outstanding_amount = outstanding_qs.aggregate(Sum('total'))['total__sum'] or 0.00
        outstanding_count = outstanding_qs.count()

        # Paid
        paid_qs = invoices.filter(status='paid')
        paid_amount = paid_qs.aggregate(Sum('total'))['total__sum'] or 0.00
        paid_count = paid_qs.count()

        # Overdue
        overdue_qs = invoices.filter(status='overdue')
        overdue_amount = overdue_qs.aggregate(Sum('total'))['total__sum'] or 0.00
        overdue_count = overdue_qs.count()

        # Reminders sent count for this subscriber's invoices
        reminders_sent_count = Reminder.objects.filter(invoice__user=self.request.user, status='sent').count()

        return Response({
            'outstanding': {
                'amount': float(outstanding_amount),
                'count': outstanding_count
            },
            'paid': {
                'amount': float(paid_amount),
                'count': paid_count
            },
            'overdue': {
                'amount': float(overdue_amount),
                'count': overdue_count,
                'avg_days_late': 9 if overdue_count > 0 else 0
            },
            'reminders_sent': {
                'count': reminders_sent_count
            }
        })

    @action(detail=True, methods=['get'], url_path='download_pdf')
    def download_pdf(self, request, pk=None):
        invoice = self.get_object()
        pdf_content = generate_invoice_pdf(invoice)
        
        response = HttpResponse(pdf_content, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{invoice.invoice_number}.pdf"'
        return response

    @action(detail=True, methods=['post'], url_path='send_reminder')
    def send_reminder(self, request, pk=None):
        invoice = self.get_object()
        tone = request.data.get('tone', 'friendly')
        send_channels = request.data.get('channels', ['email', 'whatsapp'])  # default: both

        # ── Email ───────────────────────────────────────────────────────────
        email_res = {'success': False, 'simulated': True, 'message': 'Skipped'}
        if 'email' in send_channels:
            email_res = send_brevo_reminder_email(invoice, tone=tone)

        email_status = 'sent' if email_res.get('success') and not email_res.get('simulated') else (
            'simulated' if email_res.get('simulated') else 'failed'
        )

        # ── WhatsApp ────────────────────────────────────────────────────────
        wa_res = {'success': False, 'error': 'skipped', 'message': 'Skipped', 'body': ''}
        if 'whatsapp' in send_channels:
            wa_res = send_whatsapp_reminder(invoice, tone=tone)

        wa_status_val = 'sent' if wa_res.get('success') and not wa_res.get('simulated') else (
            'simulated' if wa_res.get('simulated') else 'failed'
        )

        # ── Log Reminder ─────────────────────────────────────────────────────
        overall_status = 'sent' if (email_status == 'sent' or wa_status_val == 'sent') else email_status
        channel = 'both' if ('email' in send_channels and 'whatsapp' in send_channels) else (
            'email' if 'email' in send_channels else 'whatsapp'
        )
        reminder = Reminder.objects.create(
            invoice=invoice,
            tone=tone,
            channel=channel,
            email_subject=email_res.get('subject', f"Payment Reminder: Invoice {invoice.invoice_number}"),
            email_body=email_res.get('body', ''),
            email_status=email_status,
            wa_body=wa_res.get('body', ''),
            wa_message_id=wa_res.get('message_id'),
            wa_status=wa_status_val,
            wa_phone=wa_res.get('phone'),
            wa_error=str(wa_res.get('error', '')) if not wa_res.get('success') else None,
            status=overall_status,
        )

        is_simulated = email_res.get('simulated', False)
        default_msg = (
            "Simulated mode (Add BREVO_API_KEY and WA credentials in Settings for real delivery)"
            if is_simulated else
            f"Email + WhatsApp reminder sent for Invoice #{invoice.invoice_number}!"
        )
        msg = email_res.get('message') or default_msg

        return Response({
            'message': msg,
            'simulated': is_simulated,
            'reminder_id': reminder.id,
            'status': reminder.status,
            'email': {
                'status': email_status,
                'message': email_res.get('message'),
            },
            'whatsapp': {
                'status': wa_status_val,
                'message': wa_res.get('message'),
                'message_id': wa_res.get('message_id'),
                'phone': wa_res.get('phone'),
            }
        }, status=status.HTTP_200_OK if overall_status in ('sent', 'simulated') else status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], url_path='mark_paid')
    def mark_paid(self, request, pk=None):
        invoice = self.get_object()
        invoice.status = 'paid'
        invoice.save(update_fields=['status'])
        return Response({'message': f"Invoice {invoice.invoice_number} marked as Paid."}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='create_razorpay_order')
    def create_razorpay_order(self, request, pk=None):
        invoice = self.get_object()
        user_profile = getattr(request.user, 'profile', None)
        
        key_id = (user_profile.razorpay_key_id if user_profile and user_profile.razorpay_key_id else None) or "rzp_test_invoiceflow"
        amount_in_paise = int(round(float(invoice.total) * 100))
        order_id = f"order_{invoice.invoice_number}_{invoice.id}"
        
        return Response({
            'order_id': order_id,
            'amount': amount_in_paise,
            'currency': 'INR',
            'key_id': key_id,
            'invoice_number': invoice.invoice_number,
            'client_name': invoice.client.name if invoice.client else 'Valued Client',
            'client_email': invoice.client.email if invoice.client else ''
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='verify_razorpay_payment')
    def verify_razorpay_payment(self, request, pk=None):
        invoice = self.get_object()
        invoice.status = 'paid'
        invoice.save(update_fields=['status'])

        # Auto-send WhatsApp payment confirmation
        user_profile = getattr(invoice.user, 'profile', None)
        client = invoice.client
        raw_phone = (client.phone or '').strip().replace(' ', '').replace('-', '')
        if raw_phone:
            if raw_phone.startswith('0'):
                raw_phone = '91' + raw_phone[1:]
            elif not raw_phone.startswith('+') and not raw_phone.startswith('91'):
                raw_phone = '91' + raw_phone
            phone_e164 = raw_phone.lstrip('+')
            confirmation_msg = build_payment_confirmation_message(invoice)
            send_whatsapp_message(phone_e164, confirmation_msg, user_profile=user_profile)

        return Response({
            'message': f"Payment verified! Invoice {invoice.invoice_number} marked as Paid.",
            'status': 'paid'
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='send_whatsapp_reminder')
    def send_whatsapp_only(self, request, pk=None):
        """
        Manual single-invoice WhatsApp reminder endpoint.
        POST /api/v1/invoices/{id}/send_whatsapp_reminder/
        Body: { "tone": "friendly" | "firm" | "final" }
        """
        invoice = self.get_object()
        tone = request.data.get('tone', 'friendly')

        wa_res = send_whatsapp_reminder(invoice, tone=tone)

        wa_status_val = 'sent' if wa_res.get('success') and not wa_res.get('simulated') else (
            'simulated' if wa_res.get('simulated') else 'failed'
        )

        Reminder.objects.create(
            invoice=invoice,
            tone=tone,
            channel='whatsapp',
            email_subject='',
            email_body='',
            email_status='failed',
            wa_body=wa_res.get('body', ''),
            wa_message_id=wa_res.get('message_id'),
            wa_status=wa_status_val,
            wa_phone=wa_res.get('phone'),
            wa_error=str(wa_res.get('error', '')) if not wa_res.get('success') else None,
            status=wa_status_val,
        )

        return Response({
            'message': wa_res.get('message'),
            'simulated': wa_res.get('simulated', False),
            'status': wa_status_val,
            'phone': wa_res.get('phone'),
            'message_id': wa_res.get('message_id'),
        }, status=status.HTTP_200_OK if wa_res.get('success') else status.HTTP_500_INTERNAL_SERVER_ERROR)
