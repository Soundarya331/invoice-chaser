from rest_framework import serializers
from apps.invoices.models import Invoice, InvoiceItem
from apps.clients.serializers import ClientSerializer
from apps.clients.models import Client

class InvoiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceItem
        fields = ['id', 'description', 'quantity', 'unit_price', 'amount']
        read_only_fields = ['id', 'amount']

class InvoiceSerializer(serializers.ModelSerializer):
    client_detail = ClientSerializer(source='client', read_only=True)
    client_id = serializers.PrimaryKeyRelatedField(
        queryset=Client.objects.all(), source='client', write_only=True
    )
    items = InvoiceItemSerializer(many=True, required=False)

    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'client_id', 'client_detail', 
            'issue_date', 'due_date', 'status', 'subtotal', 'tax', 
            'total', 'notes', 'automate_enabled', 'items', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        invoice = Invoice.objects.create(**validated_data)
        
        for item_data in items_data:
            InvoiceItem.objects.create(invoice=invoice, **item_data)
            
        invoice.recalculate_totals()
        return invoice

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if items_data is not None:
            instance.items.all().delete()
            for item_data in items_data:
                InvoiceItem.objects.create(invoice=instance, **item_data)
            instance.recalculate_totals()

        return instance
