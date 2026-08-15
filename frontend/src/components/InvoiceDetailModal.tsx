import React, { useState } from 'react';
import { CreditCard, MessageSquare, Download, CheckCircle2, AlertTriangle } from 'lucide-react';
import api, { API_BASE_URL } from '../api';
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
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  const upiId = user.upi_id || 'soundaryap182@okicici';
  const upiPayUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(user.business_name || 'Soundarya Studio')}&am=${invoice.total}&tr=${invoice.invoice_number}&cu=INR`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiPayUrl)}`;

  const showMsg = (msg: string, type: 'success' | 'error' = 'success') => {
    setMessage(msg);
    setMessageType(type);
  };

  const handleRazorpayPayment = async () => {
    setLoadingPayment(true);
    setMessage('');
    try {
      // Dynamically load Razorpay checkout script
      if (!window.hasOwnProperty('Razorpay')) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Razorpay SDK'));
          document.body.appendChild(script);
        });
      }

      const res = await api.post(`/invoices/${invoice.id}/create_razorpay_order/`);
      const data = res.data;

      const options = {
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        name: user.business_name || 'InvoiceChaser',
        description: `Payment for Invoice #${data.invoice_number}`,
        order_id: data.order_id,
        prefill: {
          name: data.client_name,
          email: data.client_email,
        },
        theme: { color: '#1E2A38' },
        modal: {
          ondismiss: () => {
            setLoadingPayment(false);
            showMsg('⚠️ Payment cancelled.', 'error');
          }
        },
        handler: async function (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) {
          try {
            await api.post(`/invoices/${invoice.id}/verify_razorpay_payment/`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            showMsg('✅ Payment received & verified! Invoice marked as Paid.', 'success');
            onStatusChange();
          } catch (verifyErr: any) {
            showMsg(
              `⚠️ ${verifyErr.response?.data?.message || 'Payment received but verification failed. Please contact support.'}`,
              'error'
            );
          } finally {
            setLoadingPayment(false);
          }
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', (response: any) => {
        setLoadingPayment(false);
        showMsg(
          `❌ Payment failed: ${response.error?.description || 'Unknown error'}`,
          'error'
        );
      });
      rzp.open();
    } catch (err: any) {
      setLoadingPayment(false);
      showMsg(
        `⚠️ ${err.response?.data?.message || 'Failed to initialize Razorpay payment. Please check your Razorpay Keys in Settings.'}`,
        'error'
      );
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/invoices/${invoice.id}/download_pdf/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice.invoice_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      showMsg('⚠️ Failed to download PDF. Please try again.', 'error');
    }
  };

  const handleSendSingleWhatsApp = () => {
    const phoneRaw = invoice.client_detail?.phone || '';
    let phoneClean = phoneRaw.replace(/[^0-9]/g, '');
    if (phoneClean.length === 10) phoneClean = `91${phoneClean}`;

    const text = `Hi ${invoice.client_detail?.name || 'Valued Client'},\n\nPayment Reminder for Invoice *#${invoice.invoice_number}* for *₹${invoice.total.toLocaleString('en-IN')}* (Due Date: ${invoice.due_date}).\n\nPay via UPI: ${upiPayUrl}\n\nThank you!\n- ${user.business_name || 'InvoiceChaser'}`;
    window.open(`https://wa.me/${phoneClean}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const subtotal = invoice.subtotal ?? invoice.items?.reduce((s, i) => s + (i.amount ?? i.quantity * i.unit_price), 0) ?? invoice.total;
  const tax = invoice.tax ?? 0;

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
          <button onClick={onClose} className="text-[#5B6672] hover:text-[#1E2A38] text-lg font-bold cursor-pointer" aria-label="Close">✕</button>
        </div>

        {/* Status Message */}
        {message && (
          <div className={`flex items-center gap-2 text-xs p-3 rounded mb-4 border font-medium ${
            messageType === 'success'
              ? 'bg-[#E4EEE7] text-[#2F6F4F] border-[#2F6F4F]/20'
              : 'bg-[#F5E5DF] text-[#B5533C] border-[#B5533C]/20'
          }`}>
            {messageType === 'success'
              ? <CheckCircle2 className="w-4 h-4 shrink-0" />
              : <AlertTriangle className="w-4 h-4 shrink-0" />
            }
            {message}
          </div>
        )}

        {/* Top Summary: Client Info + Payment Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          {/* Client Info */}
          <div className="bg-[#F6F4EF] p-4 rounded border border-[#DAD4C4] space-y-2 text-xs">
            <div>
              <span className="text-[#5B6672] uppercase font-medium text-[10px] tracking-wider">Client</span>
              <p className="text-[#1E2A38] font-semibold text-sm mt-0.5">{invoice.client_detail?.name || 'N/A'}</p>
              <p className="text-[#5B6672]">{invoice.client_detail?.email}</p>
              {invoice.client_detail?.company && (
                <p className="text-[#8A6D3B] mt-0.5">{invoice.client_detail.company}</p>
              )}
              {invoice.client_detail?.phone && (
                <p className="text-[#25D366] font-mono-code mt-1">📱 {invoice.client_detail.phone}</p>
              )}
            </div>
            <div className="pt-2 border-t border-[#DAD4C4]/60">
              <span className="text-[#5B6672] uppercase font-medium text-[10px] tracking-wider">Timeline</span>
              <p className="text-[#1E2A38] mt-0.5">Issued: <span className="font-mono-code">{invoice.issue_date}</span></p>
              <p className={`mt-0.5 ${invoice.status === 'overdue' ? 'text-[#B5533C] font-semibold' : 'text-[#1E2A38]'}`}>
                Due: <span className="font-mono-code">{invoice.due_date}</span>
                {invoice.status === 'overdue' && ' ⚠️ Overdue'}
              </p>
            </div>
          </div>

          {/* Payment Amount + UPI QR */}
          <div className="bg-[#FFFEFB] border border-[#C9A96A] p-4 rounded shadow-xs flex flex-col justify-between items-center text-center">
            <div className="w-full">
              <span className="text-xs text-[#5B6672] uppercase font-semibold tracking-wider">Total Amount Due</span>
              <div className="font-mono-code text-3xl font-bold text-[#1E2A38] my-1.5">
                ₹{Number(invoice.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <span className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                invoice.status === 'paid'
                  ? 'bg-[#E4EEE7] text-[#2F6F4F]'
                  : invoice.status === 'overdue'
                  ? 'bg-[#F5E5DF] text-[#B5533C]'
                  : 'bg-[#FDF4E3] text-[#B4872F]'
              }`}>
                {invoice.status}
              </span>
            </div>

            {invoice.status !== 'paid' && (
              <div className="mt-3 flex flex-col items-center">
                <img
                  src={qrCodeUrl}
                  alt="UPI Payment QR Code"
                  className="w-28 h-28 rounded border border-[#DAD4C4] p-1 bg-white"
                />
                <span className="text-[10px] text-[#5B6672] font-mono-code mt-1.5">Scan to pay via GPay / PhonePe / BHIM</span>
                <span className="text-[10px] text-[#8A6D3B] font-mono-code">{upiId}</span>
              </div>
            )}
          </div>
        </div>

        {/* Line Items Table */}
        {invoice.items && invoice.items.length > 0 && (
          <div className="mb-5">
            <h3 className="text-[11px] uppercase tracking-widest text-[#5B6672] font-semibold mb-2">Line Items</h3>
            <div className="border border-[#DAD4C4] rounded overflow-hidden">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F6F4EF] border-b border-[#DAD4C4]">
                    <th className="text-left text-[10px] uppercase tracking-wider text-[#5B6672] font-medium px-4 py-2.5">Description</th>
                    <th className="text-right text-[10px] uppercase tracking-wider text-[#5B6672] font-medium px-4 py-2.5">Qty</th>
                    <th className="text-right text-[10px] uppercase tracking-wider text-[#5B6672] font-medium px-4 py-2.5">Unit Price</th>
                    <th className="text-right text-[10px] uppercase tracking-wider text-[#5B6672] font-medium px-4 py-2.5">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item, idx) => (
                    <tr key={item.id ?? idx} className="border-b border-[#DAD4C4]/50 last:border-b-0 hover:bg-[#F6F4EF]/30">
                      <td className="px-4 py-2.5 text-[#1E2A38] font-medium">{item.description}</td>
                      <td className="px-4 py-2.5 text-right font-mono-code text-[#5B6672]">{item.quantity}</td>
                      <td className="px-4 py-2.5 text-right font-mono-code text-[#5B6672]">
                        ₹{Number(item.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono-code font-semibold text-[#1E2A38]">
                        ₹{Number(item.amount ?? item.quantity * item.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end mt-2">
              <div className="text-xs space-y-1 min-w-[200px]">
                <div className="flex justify-between text-[#5B6672]">
                  <span>Subtotal</span>
                  <span className="font-mono-code">₹{Number(subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                {Number(tax) > 0 && (
                  <div className="flex justify-between text-[#5B6672]">
                    <span>Tax / GST</span>
                    <span className="font-mono-code">₹{Number(tax).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-[#1E2A38] border-t border-[#DAD4C4] pt-1 mt-1">
                  <span>Total</span>
                  <span className="font-mono-code">₹{Number(invoice.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        {invoice.notes && (
          <div className="mb-5 bg-[#F6F4EF] border border-[#DAD4C4] rounded p-3 text-xs text-[#5B6672]">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#8A6D3B]">Notes</span>
            <p className="mt-1">{invoice.notes}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-[#DAD4C4] pt-4">
          {/* Razorpay Payment */}
          <button
            id={`pay-razorpay-${invoice.id}`}
            onClick={handleRazorpayPayment}
            disabled={loadingPayment || invoice.status === 'paid'}
            className="bg-[#1E2A38] hover:bg-[#14202D] text-[#F1E9D6] py-2.5 px-3 rounded text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition"
          >
            <CreditCard className="w-4 h-4 text-[#C9A96A]" />
            {loadingPayment ? 'Opening Payment...' : invoice.status === 'paid' ? '✅ Already Paid' : 'Pay via Card / UPI'}
          </button>

          {/* WhatsApp Reminder */}
          <button
            id={`wa-remind-${invoice.id}`}
            onClick={handleSendSingleWhatsApp}
            disabled={!invoice.client_detail?.phone}
            title={!invoice.client_detail?.phone ? 'No phone number on record for this client' : ''}
            className="bg-[#25D366] hover:bg-[#1EBE5D] text-white py-2.5 px-3 rounded text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition"
          >
            <MessageSquare className="w-4 h-4" />
            WhatsApp Reminder
          </button>

          {/* PDF Download — uses auth token */}
          <button
            id={`pdf-download-${invoice.id}`}
            onClick={handleDownloadPDF}
            className="bg-[#F6F4EF] hover:bg-[#EBE7DF] text-[#1E2A38] border border-[#DAD4C4] py-2.5 px-3 rounded text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-sm transition"
          >
            <Download className="w-4 h-4 text-[#8A6D3B]" />
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
};
