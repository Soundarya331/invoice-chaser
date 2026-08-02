from django.test import TestCase
from django.contrib.auth.models import User
from datetime import date
from apps.clients.models import Client
from apps.invoices.models import Invoice, InvoiceItem

class InvoiceAPITestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', email='test@example.com')
        self.client_record = Client.objects.create(
            user=self.user,
            name='Test Client Co',
            email='testclient@example.com'
        )
        self.invoice = Invoice.objects.create(
            user=self.user,
            client=self.client_record,
            invoice_number='INV-TEST-001',
            issue_date=date(2026, 7, 1),
            due_date=date(2026, 7, 15),
            status='overdue',
            subtotal=1000.00,
            tax=0.00,
            total=1000.00
        )
        InvoiceItem.objects.create(
            invoice=self.invoice,
            description='Web Development Services',
            quantity=1,
            unit_price=1000.00,
            amount=1000.00
        )

    def test_dashboard_stats_endpoint(self):
        response = self.client.get('/api/v1/invoices/dashboard_stats/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('outstanding', data)
        self.assertIn('paid', data)
        self.assertIn('overdue', data)

    def test_download_pdf_endpoint(self):
        response = self.client.get(f'/api/v1/invoices/{self.invoice.id}/download_pdf/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/pdf')
        self.assertTrue(len(response.content) > 0)

    def test_mark_paid_action(self):
        response = self.client.post(f'/api/v1/invoices/{self.invoice.id}/mark_paid/')
        self.assertEqual(response.status_code, 200)
        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.status, 'paid')
