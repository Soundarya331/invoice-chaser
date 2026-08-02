import io
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

def generate_invoice_pdf(invoice):
    """
    Generates a professional PDF binary stream for a given Invoice instance.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    story = []
    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'InvoiceTitle',
        parent=styles['Heading1'],
        fontSize=24,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor('#1E2A38'),
        spaceAfter=4
    )
    subtitle_style = ParagraphStyle(
        'InvoiceSubTitle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#5B6672'),
        spaceAfter=15
    )
    normal_style = ParagraphStyle(
        'NormalText',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#1E2A38')
    )

    # Header / Brand
    story.append(Paragraph("InvoiceFlow", title_style))
    story.append(Paragraph(f"Invoice Reference: <b>{invoice.invoice_number}</b>", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#DAD4C4'), spaceAfter=15))

    # Meta Details (Client info & Invoice dates)
    client_info = f"""
    <b>Bill To:</b><br/>
    {invoice.client.name}<br/>
    {invoice.client.company or ''}<br/>
    Email: {invoice.client.email}<br/>
    Phone: {invoice.client.phone or 'N/A'}
    """
    
    status_color = "#2F6F4F" if invoice.status == 'paid' else ("#B5533C" if invoice.status == 'overdue' else "#B4872F")

    meta_info = f"""
    <b>Issue Date:</b> {invoice.issue_date}<br/>
    <b>Due Date:</b> {invoice.due_date}<br/>
    <b>Status:</b> <font color="{status_color}"><b>{invoice.status.upper()}</b></font><br/>
    <b>Automated Reminders:</b> {'Enabled' if invoice.automate_enabled else 'Disabled'}
    """

    meta_table_data = [
        [Paragraph(client_info, normal_style), Paragraph(meta_info, normal_style)]
    ]
    meta_table = Table(meta_table_data, colWidths=[270, 270])
    meta_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 20))

    # Line Items Table
    table_data = [
        [Paragraph("<b>Description</b>", normal_style), 
         Paragraph("<b>Qty</b>", normal_style), 
         Paragraph("<b>Unit Price (₹)</b>", normal_style), 
         Paragraph("<b>Amount (₹)</b>", normal_style)]
    ]

    items = invoice.items.all()
    if items.exists():
        for item in items:
            table_data.append([
                Paragraph(item.description, normal_style),
                Paragraph(str(item.quantity), normal_style),
                Paragraph(f"₹{item.unit_price:,.2f}", normal_style),
                Paragraph(f"₹{item.amount:,.2f}", normal_style)
            ])
    else:
        # Fallback if no items added yet
        table_data.append([
            Paragraph("Professional Services", normal_style),
            Paragraph("1", normal_style),
            Paragraph(f"₹{invoice.subtotal:,.2f}", normal_style),
            Paragraph(f"₹{invoice.subtotal:,.2f}", normal_style)
        ])

    items_table = Table(table_data, colWidths=[240, 60, 120, 120])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F6F4EF')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1E2A38')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#DAD4C4')),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 15))

    # Summary Totals
    totals_data = [
        ["Subtotal:", f"₹{invoice.subtotal:,.2f}"],
        ["Tax:", f"₹{invoice.tax:,.2f}"],
        ["Total Amount:", f"₹{invoice.total:,.2f}"]
    ]
    totals_table = Table(totals_data, colWidths=[420, 120])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(totals_table)

    if invoice.notes:
        story.append(Spacer(1, 20))
        story.append(Paragraph(f"<b>Notes:</b> {invoice.notes}", subtitle_style))

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()
