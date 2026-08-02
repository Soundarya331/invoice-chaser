from decimal import Decimal
from django.db import models
from django.contrib.auth.models import User
from apps.clients.models import Client

class Invoice(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('overdue', 'Overdue'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='invoices')
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='invoices')
    invoice_number = models.CharField(max_length=50, help_text="e.g. INV-0192")
    issue_date = models.DateField()
    due_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    tax = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    notes = models.TextField(blank=True, null=True)
    automate_enabled = models.BooleanField(default=True, help_text="If True, Celery background worker auto-sends reminders")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-issue_date']
        unique_together = ['user', 'invoice_number']

    def recalculate_totals(self):
        """Recalculates subtotal, tax, and total strictly using Decimal arithmetic."""
        items_total = sum((item.amount for item in self.items.all()), Decimal('0.00'))
        self.subtotal = Decimal(str(items_total))
        tax_decimal = Decimal(str(self.tax or '0.00'))
        self.total = self.subtotal + tax_decimal
        self.save(update_fields=['subtotal', 'total'])

    def __str__(self):
        return f"{self.invoice_number} - {self.client.name} (₹{self.total})"


class InvoiceItem(models.Model):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='items')
    description = models.CharField(max_length=255)
    quantity = models.IntegerField(default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    amount = models.DecimalField(max_digits=12, decimal_places=2)

    def save(self, *args, **kwargs):
        self.amount = Decimal(str(self.quantity)) * Decimal(str(self.unit_price))
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.description} ({self.quantity} x ₹{self.unit_price})"
