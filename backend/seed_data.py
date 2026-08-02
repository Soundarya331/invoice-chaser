import os
import django
from datetime import date

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from apps.users.models import UserProfile
from apps.clients.models import Client
from apps.invoices.models import Invoice, InvoiceItem
from apps.reminders.models import Reminder

def seed():
    print("[INFO] Seeding InvoiceFlow reference data...")


    # 1. Create default user
    user, created = User.objects.get_or_create(
        username='soundarya',
        defaults={'email': 'soundarya.p331@gmail.com', 'first_name': 'Soundarya', 'last_name': 'P.'}
    )
    if created:
        user.set_password('password123')
        user.save()

    profile, _ = UserProfile.objects.get_or_create(
        user=user,
        defaults={'business_name': 'Soundarya P. — Tech & Design', 'phone': '+91 98765 43210'}
    )

    # 2. Create reference clients
    clients_data = [
        {'name': 'Meridian Design Co.', 'email': 'accounts@meridian.co', 'company': 'Meridian Design'},
        {'name': 'Kavya R. — Freelance', 'email': 'kavya.r@gmail.com', 'company': 'Kavya R.'},
        {'name': 'Bluewave Studio', 'email': 'finance@bluewave.io', 'company': 'Bluewave Studio'},
        {'name': 'Northgate Retail Pvt Ltd', 'email': 'ap@northgate.in', 'company': 'Northgate Retail'},
        {'name': 'Studio Ferro', 'email': 'hello@studioferro.com', 'company': 'Studio Ferro'},
    ]

    clients = {}
    for cdata in clients_data:
        client, _ = Client.objects.get_or_create(
            user=user,
            email=cdata['email'],
            defaults={'name': cdata['name'], 'company': cdata['company']}
        )
        clients[cdata['email']] = client

    # 3. Create reference invoices
    invoices_data = [
        {
            'num': 'INV-0192',
            'client': clients['accounts@meridian.co'],
            'issue': date(2026, 7, 18),
            'due': date(2026, 7, 28),
            'status': 'overdue',
            'subtotal': 32000.00,
            'desc': 'Brand Identity & Web UI Design'
        },
        {
            'num': 'INV-0191',
            'client': clients['kavya.r@gmail.com'],
            'issue': date(2026, 7, 22),
            'due': date(2026, 8, 5),
            'status': 'pending',
            'subtotal': 8500.00,
            'desc': 'Consulting & Technical Audit'
        },
        {
            'num': 'INV-0190',
            'client': clients['finance@bluewave.io'],
            'issue': date(2026, 7, 12),
            'due': date(2026, 7, 22),
            'status': 'paid',
            'subtotal': 56000.00,
            'desc': 'Full-Stack Web App Development'
        },
        {
            'num': 'INV-0189',
            'client': clients['ap@northgate.in'],
            'issue': date(2026, 7, 5),
            'due': date(2026, 7, 15),
            'status': 'paid',
            'subtotal': 110000.00,
            'desc': 'E-Commerce Platform Integration'
        },
        {
            'num': 'INV-0188',
            'client': clients['hello@studioferro.com'],
            'issue': date(2026, 6, 29),
            'due': date(2026, 7, 9),
            'status': 'overdue',
            'subtotal': 9700.00,
            'desc': 'API Maintenance & Bug Fixes'
        },
    ]

    for idata in invoices_data:
        inv, _ = Invoice.objects.get_or_create(
            user=user,
            invoice_number=idata['num'],
            defaults={
                'client': idata['client'],
                'issue_date': idata['issue'],
                'due_date': idata['due'],
                'status': idata['status'],
                'subtotal': idata['subtotal'],
                'tax': 0.00,
                'total': idata['subtotal']
            }
        )
        InvoiceItem.objects.get_or_create(
            invoice=inv,
            description=idata['desc'],
            defaults={
                'quantity': 1,
                'unit_price': idata['subtotal'],
                'amount': idata['subtotal']
            }
        )
        if idata['status'] == 'overdue':
            Reminder.objects.get_or_create(
                invoice=inv,
                tone='firm',
                defaults={
                    'email_subject': f"Payment Reminder: Invoice {inv.invoice_number} is Overdue",
                    'email_body': f"Dear {inv.client.name}, invoice {inv.invoice_number} for ₹{inv.total} was due on {inv.due_date}. Please settle payment at your earliest convenience.",
                    'status': 'sent'
                }
            )

    print("[SUCCESS] Seed data populated successfully!")


if __name__ == '__main__':
    seed()
