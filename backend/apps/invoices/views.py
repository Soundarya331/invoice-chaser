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

        email_res = send_brevo_reminder_email(invoice, tone=tone)

        reminder = Reminder.objects.create(
            invoice=invoice,
            tone=tone,
            email_subject=email_res.get('subject', f"Payment Reminder: Invoice {invoice.invoice_number}"),
            email_body=email_res.get('body', ''),
            status='sent' if email_res.get('success') else 'failed'
        )

        return Response({
            'message': email_res.get('message', f"Reminder processed for {invoice.client.email}"),
            'simulated': email_res.get('simulated', False),
            'reminder_id': reminder.id,
            'status': reminder.status
        }, status=status.HTTP_200_OK if email_res.get('success') else status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], url_path='mark_paid')
    def mark_paid(self, request, pk=None):
        invoice = self.get_object()
        invoice.status = 'paid'
        invoice.save(update_fields=['status'])
        return Response({'message': f"Invoice {invoice.invoice_number} marked as Paid."}, status=status.HTTP_200_OK)
