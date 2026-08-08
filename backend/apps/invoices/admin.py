from django.contrib import admin
from apps.invoices.models import Invoice, InvoiceItem

class InvoiceItemInline(admin.TabularInline):
    model = InvoiceItem
    extra = 1

@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ('invoice_number', 'user', 'client', 'status', 'total', 'due_date', 'automate_enabled')
    list_filter = ('status', 'automate_enabled', 'issue_date', 'due_date')
    search_fields = ('invoice_number', 'client__name', 'user__email')
    inlines = [InvoiceItemInline]
