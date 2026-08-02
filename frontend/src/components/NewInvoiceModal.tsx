import React, { useState } from 'react';
import type { Client } from '../types';
import api from '../api';
import { parseApiError } from '../utils';

interface NewInvoiceModalProps {
  clients: Client[];
  onClose: () => void;
  onSuccess: () => void;
}

export const NewInvoiceModal: React.FC<NewInvoiceModalProps> = ({ clients, onClose, onSuccess }) => {
  const [clientId, setClientId] = useState<number>(clients[0]?.id || 1);
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${Math.floor(1000 + Math.random() * 9000)}`);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [status, setStatus] = useState<'pending' | 'paid' | 'overdue'>('pending');
  const [notes, setNotes] = useState('Payment due within 14 days of issue date.');
  const [automateEnabled, setAutomateEnabled] = useState(true);

  const [items, setItems] = useState<Array<{ description: string; quantity: number; unit_price: number }>>([
    { description: 'Brand Identity & Web UI Design', quantity: 1, unit_price: 32000 },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unit_price: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const calculatedSubtotal = items.reduce((acc, item) => acc + item.quantity * item.unit_price, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      setError('Please select or add a client first.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      await api.post('/invoices/', {
        invoice_number: invoiceNumber,
        client_id: clientId,
        issue_date: issueDate,
        due_date: dueDate,
        status: status,
        notes: notes,
        automate_enabled: automateEnabled,
        items: items,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(parseApiError(err.response?.data));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-[#FFFEFB] border border-[#DAD4C4] rounded-lg p-6 max-w-2xl w-full my-8 shadow-2xl">
        <div className="flex justify-between items-center mb-4 border-b border-[#DAD4C4] pb-3">
          <h2 className="font-serif-brand text-xl font-semibold text-[#1E2A38]">Create New Invoice</h2>
          <button onClick={onClose} className="text-[#5B6672] hover:text-[#1E2A38] text-lg font-bold cursor-pointer">
            ✕
          </button>
        </div>

        {error && (
          <div className="bg-[#F5E5DF] text-[#B5533C] text-xs p-3 rounded mb-4 border border-[#B5533C]/20 font-medium">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase text-[#5B6672] mb-1 font-medium">Invoice Number</label>
              <input
                type="text"
                required
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full bg-[#F6F4EF] border border-[#DAD4C4] rounded px-3 py-2 text-[#1E2A38] font-mono-code font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs uppercase text-[#5B6672] mb-1 font-medium">Select Client</label>
              <select
                value={clientId}
                onChange={(e) => setClientId(Number(e.target.value))}
                className="w-full bg-[#F6F4EF] border border-[#DAD4C4] rounded px-3 py-2 text-[#1E2A38]"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.email})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs uppercase text-[#5B6672] mb-1 font-medium">Issue Date</label>
              <input
                type="date"
                required
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full bg-[#F6F4EF] border border-[#DAD4C4] rounded px-3 py-2 text-[#1E2A38]"
              />
            </div>
            <div>
              <label className="block text-xs uppercase text-[#5B6672] mb-1 font-medium">Due Date</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-[#F6F4EF] border border-[#DAD4C4] rounded px-3 py-2 text-[#1E2A38]"
              />
            </div>
            <div>
              <label className="block text-xs uppercase text-[#5B6672] mb-1 font-medium">Initial Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-[#F6F4EF] border border-[#DAD4C4] rounded px-3 py-2 text-[#1E2A38]"
              >
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs uppercase text-[#5B6672] font-semibold">Line Items</label>
              <button
                type="button"
                onClick={addItem}
                className="text-xs text-[#C9A96A] hover:underline font-medium cursor-pointer"
              >
                + Add Item
              </button>
            </div>
            {items.map((item, index) => (
              <div key={index} className="flex gap-2 items-center mb-2">
                <input
                  type="text"
                  placeholder="Item Description"
                  required
                  value={item.description}
                  onChange={(e) => updateItem(index, 'description', e.target.value)}
                  className="flex-1 bg-[#F6F4EF] border border-[#DAD4C4] rounded px-3 py-1.5 text-xs"
                />
                <input
                  type="number"
                  placeholder="Qty"
                  min="1"
                  required
                  value={item.quantity}
                  onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                  className="w-16 bg-[#F6F4EF] border border-[#DAD4C4] rounded px-2 py-1.5 text-xs font-mono-code"
                />
                <input
                  type="number"
                  placeholder="Price ₹"
                  required
                  value={item.unit_price}
                  onChange={(e) => updateItem(index, 'unit_price', Number(e.target.value))}
                  className="w-28 bg-[#F6F4EF] border border-[#DAD4C4] rounded px-2 py-1.5 text-xs font-mono-code font-semibold"
                />
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="text-[#B5533C] text-xs px-2 py-1 cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <div className="text-right font-mono-code font-semibold text-[#1E2A38] mt-2">
              Calculated Total: ₹{calculatedSubtotal.toLocaleString('en-IN')}
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase text-[#5B6672] mb-1 font-medium">Notes / Payment Terms</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#F6F4EF] border border-[#DAD4C4] rounded px-3 py-2 text-xs text-[#1E2A38]"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="automate"
              checked={automateEnabled}
              onChange={(e) => setAutomateEnabled(e.target.checked)}
              className="rounded accent-[#1E2A38]"
            />
            <label htmlFor="automate" className="text-xs text-[#5B6672]">
              Enable daily automated email reminders via Celery/Brevo
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#DAD4C4]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#DAD4C4] rounded text-xs text-[#5B6672] hover:bg-[#F6F4EF] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-[#1E2A38] hover:bg-[#14202D] text-[#F1E9D6] rounded text-xs font-medium cursor-pointer"
            >
              {loading ? 'Creating...' : 'Save & Issue Invoice →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
