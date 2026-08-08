import React, { useState } from 'react';
import { CreditCard, MessageSquare, Download } from 'lucide-react';
import api from '../api';
import type { Invoice, UserProfile } from '../types';

interface InvoiceDetailModalProps {
  invoice: Invoice;
  user: UserProfile;
  onClose: () => void;
  onStatusChange: () => void;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  invoice,
  user,
  onClose,
  onStatusChange,
}) => {
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [message, setMessage] = useState('');

  const upiId = user.upi_id || 'soundaryap182@okicici';
  const upiPayUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(user.business_name || 'Soundarya Studio')}&am=${invoice.total}&tr=${invoice.invoice_number}&cu=INR`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiPayUrl)}`;

  const handleRazorpayPayment = async () => {
    setLoadingPayment(true);
    setMessage('');
    try {
      // Load Razorpay Script if not loaded
      if (!window.hasOwnProperty('Razorpay')) {
        await new Promise((resolve) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = resolve;
          document.body.appendChild(script);
        });
      }

      const res = await api.post(`/invoices/${invoice.id}/create_razorpay_order/`);
      const data = res.data;

      const options = {
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        name: user.business_name || 'Soundarya Studio',
        description: `Invoice #${data.invoice_number}`,
        order_id: data.order_id,
        prefill: {
          name: data.client_name,
          email: data.client_email,
        },
        theme: {
          color: '#1E2A38',
        },
        handler: async function (response: any) {
          await api.post(`/invoices/${invoice.id}/verify_razorpay_payment/`, response);
          setMessage('✅ Payment received successfully via Razorpay! Invoice marked as Paid.');
          onStatusChange();
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      setMessage(`⚠️ ${err.response?.data?.message || 'Failed to initialize Razorpay payment.'}`);
    } finally {
      setLoadingPayment(false);
    }
  };

  const handleSendSingleWhatsApp = () => {
    const phoneRaw = invoice.client_detail?.phone || '';
    let phoneClean = phoneRaw.replace(/[^0-9]/g, '');
    if (phoneClean.length === 10) {
      phoneClean = `91${phoneClean}`;
    }

    const text = `Hi ${invoice.client_detail?.name || 'Valued Client'},\n\nPayment Reminder for Invoice *#${invoice.invoice_number}* for *₹${invoice.total.toLocaleString('en-IN')}* (Due Date: ${invoice.due_date}).\n\nPay via UPI: ${upiPayUrl}\n\nThank you!\n- ${user.business_name || 'Soundarya Studio'}`;
    const waUrl = `https://wa.me/${phoneClean}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-[#FFFEFB] border border-[#DAD4C4] rounded-lg p-5 sm:p-6 max-w-3xl w-[95vw] sm:w-full my-auto shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-[#DAD4C4] pb-4 mb-4">
          <div>
            <span className="text-xs uppercase tracking-widest text-[#5B6672] font-semibold">Invoice Detail</span>
            <h2 className="font-serif-brand text-xl sm:text-2xl font-semibold text-[#1E2A38]">
              #{invoice.invoice_number}
            </h2>
          </div>
          <button onClick={onClose} className="text-[#5B6672] hover:text-[#1E2A38] text-lg font-bold cursor-pointer">
            ✕
          </button>
        </div>

        {message && (
          <div className="bg-[#E4EEE7] text-[#2F6F4F] text-xs p-3 rounded mb-4 border border-[#2F6F4F]/20 font-medium">
            {message}
          </div>
        )}

        {/* Invoice Summary Box */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-[#F6F4EF] p-4 rounded border border-[#DAD4C4] space-y-2 text-xs">
            <div>
              <span className="text-[#5B6672] uppercase font-medium">Client:</span>
              <p className="text-[#1E2A38] font-semibold text-sm">{invoice.client_detail?.name || 'N/A'}</p>
              <p className="text-[#5B6672]">{invoice.client_detail?.email}</p>
              {invoice.client_detail?.phone && (
                <p className="text-[#25D366] font-mono-code">📱 {invoice.client_detail.phone}</p>
              )}
            </div>
            <div className="pt-2 border-t border-[#DAD4C4]/60">
              <span className="text-[#5B6672] uppercase font-medium">Dates:</span>
              <p className="text-[#1E2A38]">Issued: {invoice.issue_date} | Due: {invoice.due_date}</p>
            </div>
          </div>

          {/* Payment QR & Total Card */}
          <div className="bg-[#FFFEFB] border border-[#C9A96A] p-4 rounded shadow-xs flex flex-col justify-between items-center text-center">
            <div>
              <span className="text-xs text-[#5B6672] uppercase font-semibold">Total Amount Due</span>
              <div className="font-mono-code text-2xl font-bold text-[#1E2A38] my-1">
                ₹{invoice.total.toLocaleString('en-IN')}
              </div>
              <span className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-bold uppercase ${
                invoice.status === 'paid' ? 'bg-[#E4EEE7] text-[#2F6F4F]' : 'bg-[#F5E5DF] text-[#B5533C]'
              }`}>
                {invoice.status}
              </span>
            </div>

            {invoice.status !== 'paid' && (
              <div className="mt-3 flex flex-col items-center">
                <img src={qrCodeUrl} alt="UPI Payment QR" className="w-24 h-24 rounded border border-[#DAD4C4] p-1 bg-white" />
                <span className="text-[10px] text-[#5B6672] font-mono-code mt-1">Scan to Pay via GPay/PhonePe</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-[#DAD4C4] pt-4">
          <button
            onClick={handleRazorpayPayment}
            disabled={loadingPayment || invoice.status === 'paid'}
            className="bg-[#1E2A38] hover:bg-[#14202D] text-[#F1E9D6] py-2.5 px-3 rounded text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
          >
            <CreditCard className="w-4 h-4 text-[#C9A96A]" />
            {invoice.status === 'paid' ? 'Paid' : 'Pay via Card / UPI'}
          </button>

          <button
            onClick={handleSendSingleWhatsApp}
            disabled={!invoice.client_detail?.phone}
            className="bg-[#25D366] hover:bg-[#1EBE5D] text-white py-2.5 px-3 rounded text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
          >
            <MessageSquare className="w-4 h-4" />
            Send WhatsApp Reminder
          </button>

          <a
            href={`${api.defaults.baseURL}/invoices/${invoice.id}/download_pdf/`}
            target="_blank"
            rel="noreferrer"
            className="bg-[#F6F4EF] hover:bg-[#EBE7DF] text-[#1E2A38] border border-[#DAD4C4] py-2.5 px-3 rounded text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#8A6D3B]" />
            Download PDF
          </a>
        </div>
      </div>
    </div>
  );
};
