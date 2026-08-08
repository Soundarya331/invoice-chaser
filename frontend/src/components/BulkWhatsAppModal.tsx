import React, { useState } from 'react';
import { Send, MessageSquare, AlertTriangle, ExternalLink } from 'lucide-react';
import type { Invoice } from '../types';

interface BulkWhatsAppModalProps {
  invoices: Invoice[];
  onClose: () => void;
}

export const BulkWhatsAppModal: React.FC<BulkWhatsAppModalProps> = ({ invoices, onClose }) => {
  // Filter invoices that have client phone numbers and pending/overdue status
  const eligibleInvoices = invoices.filter(
    (inv) => inv.status !== 'paid' && (inv.client_detail?.phone || '').trim().length > 0
  );

  const [selectedIds, setSelectedIds] = useState<number[]>(eligibleInvoices.map((inv) => inv.id));
  const [tone, setTone] = useState<'friendly' | 'firm' | 'final'>('friendly');
  const [currentIndex, setCurrentIndex] = useState(0);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectedInvoices = eligibleInvoices.filter((inv) => selectedIds.includes(inv.id));
  const activeInvoice = selectedInvoices[currentIndex] || null;

  const generateWhatsAppText = (inv: Invoice) => {
    const clientName = inv.client_detail?.name || 'Valued Client';
    const amountStr = `₹${inv.total.toLocaleString('en-IN')}`;
    const invoiceNum = inv.invoice_number;
    const dueDate = inv.due_date;
    const status = inv.status;

    let greeting = `Hi ${clientName},`;
    let messageBody = '';

    if (tone === 'friendly') {
      messageBody = `Hope you're doing well! This is a quick gentle reminder regarding Invoice *#${invoiceNum}* for *${amountStr}*, which was due on *${dueDate}*.`;
    } else if (tone === 'firm') {
      messageBody = `Notice regarding unpaid Invoice *#${invoiceNum}* for *${amountStr}*. According to our ledger, payment was due on *${dueDate}* and remains *${status.toUpperCase()}*. Please process payment today to avoid service pause.`;
    } else {
      messageBody = `URGENT / FINAL NOTICE: Invoice *#${invoiceNum}* for *${amountStr}* is severely overdue (due date: ${dueDate}). Please settle this payment immediately.`;
    }

    return `${greeting}\n\n${messageBody}\n\nInvoice Details:\n• Invoice #: ${invoiceNum}\n• Total Amount: ${amountStr}\n• Status: ${status.toUpperCase()}\n\nThank you!\n- Soundarya Studio`;
  };

  const handleSendCurrent = () => {
    if (!activeInvoice) return;
    const phoneRaw = activeInvoice.client_detail?.phone || '';
    let phoneClean = phoneRaw.replace(/[^0-9]/g, '');
    if (phoneClean.length === 10) {
      phoneClean = `91${phoneClean}`;
    }

    const text = generateWhatsAppText(activeInvoice);
    const encodedText = encodeURIComponent(text);
    const waUrl = `https://wa.me/${phoneClean}?text=${encodedText}`;

    window.open(waUrl, '_blank');

    if (currentIndex < selectedInvoices.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-[#FFFEFB] border border-[#DAD4C4] rounded-lg p-5 max-w-2xl w-[95vw] sm:w-full my-auto shadow-2xl">
        <div className="flex justify-between items-center mb-4 border-b border-[#DAD4C4] pb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#25D366]" />
            <h2 className="font-serif-brand text-lg sm:text-xl font-semibold text-[#1E2A38]">
              Bulk WhatsApp Reminders ($0 Free)
            </h2>
          </div>
          <button onClick={onClose} className="text-[#5B6672] hover:text-[#1E2A38] text-lg font-bold cursor-pointer">
            ✕
          </button>
        </div>

        {eligibleInvoices.length === 0 ? (
          <div className="text-center py-8 text-[#5B6672] text-sm">
            <AlertTriangle className="w-8 h-8 text-[#8A6D3B] mx-auto mb-2" />
            No pending or overdue invoices found with valid client phone numbers.
            <p className="text-xs text-[#5B6672] mt-1">
              Add phone numbers in Clients Directory to enable WhatsApp reminders.
            </p>
          </div>
        ) : (
          <div className="space-y-4 text-sm">
            {/* Options */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F6F4EF] p-3 rounded border border-[#DAD4C4]">
              <div>
                <span className="text-xs uppercase font-semibold text-[#5B6672] block mb-1">Reminder Tone</span>
                <div className="flex gap-2">
                  {(['friendly', 'firm', 'final'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTone(t)}
                      className={`px-3 py-1 rounded text-xs capitalize transition cursor-pointer font-medium ${
                        tone === t ? 'bg-[#1E2A38] text-[#F1E9D6]' : 'bg-[#FFFEFB] text-[#5B6672] border border-[#DAD4C4]'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs text-[#5B6672]">
                  Queue: <strong className="text-[#1E2A38]">{selectedInvoices.length}</strong> invoices selected
                </span>
              </div>
            </div>

            {/* List Selection */}
            <div className="max-h-40 overflow-y-auto space-y-1.5 border border-[#DAD4C4] rounded p-2 bg-[#FFFEFB]">
              {eligibleInvoices.map((inv) => (
                <label
                  key={inv.id}
                  className="flex items-center justify-between p-2 rounded hover:bg-[#F6F4EF] cursor-pointer text-xs"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(inv.id)}
                      onChange={() => toggleSelect(inv.id)}
                      className="rounded accent-[#1E2A38]"
                    />
                    <span className="font-mono-code font-semibold text-[#1E2A38]">{inv.invoice_number}</span>
                    <span className="text-[#5B6672]">({inv.client_detail?.name})</span>
                    <span className="text-[#25D366] font-mono-code">📱 {inv.client_detail?.phone}</span>
                  </div>
                  <span className="font-mono-code font-semibold text-[#1E2A38]">₹{inv.total.toLocaleString('en-IN')}</span>
                </label>
              ))}
            </div>

            {/* Active Queue Card */}
            {activeInvoice && (
              <div className="bg-[#25D366]/10 border border-[#25D366]/30 p-4 rounded-md">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#1E2A38]">
                    Dispatch ({currentIndex + 1} of {selectedInvoices.length}): {activeInvoice.client_detail?.name}
                  </span>
                  <span className="text-xs font-mono-code text-[#25D366] font-semibold">
                    {activeInvoice.client_detail?.phone}
                  </span>
                </div>

                <div className="bg-[#FFFEFB] border border-[#DAD4C4] rounded p-3 text-xs font-mono-code text-[#1E2A38] whitespace-pre-wrap max-h-36 overflow-y-auto mb-3">
                  {generateWhatsAppText(activeInvoice)}
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                    <button
                      disabled={currentIndex === 0}
                      onClick={() => setCurrentIndex((prev) => prev - 1)}
                      className="px-3 py-1.5 rounded text-xs bg-[#FFFEFB] border border-[#DAD4C4] disabled:opacity-40 cursor-pointer font-medium"
                    >
                      ← Previous
                    </button>
                    <button
                      disabled={currentIndex >= selectedInvoices.length - 1}
                      onClick={() => setCurrentIndex((prev) => prev + 1)}
                      className="px-3 py-1.5 rounded text-xs bg-[#FFFEFB] border border-[#DAD4C4] disabled:opacity-40 cursor-pointer font-medium"
                    >
                      Next →
                    </button>
                  </div>

                  <button
                    onClick={handleSendCurrent}
                    className="bg-[#25D366] hover:bg-[#1EBE5D] text-white px-5 py-2 rounded text-xs font-semibold transition flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    <Send className="w-3.5 h-3.5" /> Send via WhatsApp <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
