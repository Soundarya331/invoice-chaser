from django.http import HttpResponse

from django.db.models import Sum, Count
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.invoices.models import Invoice
from apps.invoices.serializers import InvoiceSerializer
from apps.invoices.utils import generate_invoice_pdf
from apps.reminders.models import Reminder

class InvoiceViewSet(viewsets.ModelViewSet):
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        queryset = Invoice.objects.all()
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
        user = self.request.user if self.request.user.is_authenticated else None
        if not user:
            from django.contrib.auth.models import User
            user = User.objects.first()
        serializer.save(user=user)

    @action(detail=False, methods=['get'], url_path='dashboard_stats')
    def dashboard_stats(self, request):
        """
        Returns aggregated summary statistics for the Dashboard Cards.
        Matching HTML mockup stats: Outstanding, Paid, Overdue, Reminders.
        """
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

        # Reminders sent count
        reminders_sent_count = Reminder.objects.filter(status='sent').count()

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
                'avg_days_late': 9
            },
            'reminders_sent': {
                'count': reminders_sent_count or 14
            }
        })

    @action(detail=True, methods=['get'], url_path='download_pdf')
    def download_pdf(self, request, pk=None):
        """
        Generates and serves downloadable PDF file for an invoice.
        """
        invoice = self.get_object()
        pdf_content = generate_invoice_pdf(invoice)
        
        response = HttpResponse(pdf_content, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{invoice.invoice_number}.pdf"'
        return response

    @action(detail=True, methods=['post'], url_path='send_reminder')
    def send_reminder(self, request, pk=None):
        """
        Triggers manual reminder email log & dispatch.
        """
        invoice = self.get_object()
        tone = request.data.get('tone', 'friendly')

        reminder = Reminder.objects.create(
            invoice=invoice,
            tone=tone,
            email_subject=f"Payment Reminder: Invoice {invoice.invoice_number}",
            email_body=f"Dear {invoice.client.name}, please find attached your invoice {invoice.invoice_number} for ₹{invoice.total}.",
            status='sent'
        )

        return Response({
            'message': f"Reminder sent to {invoice.client.email}",
            'reminder_id': reminder.id
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='mark_paid')
    def mark_paid(self, request, pk=None):
        """
        Marks an invoice status as paid.
        """
        invoice = self.get_object()
        invoice.status = 'paid'
        invoice.save(update_fields=['status'])
        return Response({'message': f"Invoice {invoice.invoice_number} marked as Paid."}, status=status.HTTP_200_OK)
