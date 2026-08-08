import React, { useState } from 'react';
import type { Client } from '../types';
import api from '../api';
import { parseApiError } from '../utils';

interface NewClientModalProps {
  clientToEdit?: Client | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const NewClientModal: React.FC<NewClientModalProps> = ({ clientToEdit, onClose, onSuccess }) => {
  const [name, setName] = useState(clientToEdit?.name || '');
  const [email, setEmail] = useState(clientToEdit?.email || '');
  const [company, setCompany] = useState(clientToEdit?.company || '');
  const [phone, setPhone] = useState(clientToEdit?.phone || '');
  const [notes, setNotes] = useState(clientToEdit?.notes || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = { name, email, company, phone, notes };
      if (clientToEdit) {
        await api.put(`/clients/${clientToEdit.id}/`, payload);
      } else {
        await api.post('/clients/', payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(parseApiError(err.response?.data));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-[#FFFEFB] border border-[#DAD4C4] rounded-lg p-4 sm:p-6 max-w-md w-[95vw] sm:w-full shadow-2xl my-auto">
        <div className="flex justify-between items-center mb-4 border-b border-[#DAD4C4] pb-3">
          <h2 className="font-serif-brand text-lg sm:text-xl font-semibold text-[#1E2A38]">
            {clientToEdit ? `Edit Client: ${clientToEdit.name}` : 'Add New Client'}
          </h2>
          <button onClick={onClose} className="text-[#5B6672] hover:text-[#1E2A38] text-lg font-bold cursor-pointer">
            ✕
          </button>
        </div>

        {error && (
          <div className="bg-[#F5E5DF] text-[#B5533C] text-xs p-3 rounded mb-4 border border-[#B5533C]/20 font-medium">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 text-sm">
          <div>
            <label className="block text-xs uppercase text-[#5B6672] mb-1 font-medium">Client Name / Contact</label>
            <input
              type="text"
              required
              placeholder="e.g. Meridian Design Co."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#F6F4EF] border border-[#DAD4C4] rounded px-3 py-2 text-[#1E2A38] text-xs sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-xs uppercase text-[#5B6672] mb-1 font-medium">Email Address</label>
            <input
              type="email"
              required
              placeholder="accounts@meridian.co"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#F6F4EF] border border-[#DAD4C4] rounded px-3 py-2 text-[#1E2A38] text-xs sm:text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs uppercase text-[#5B6672] mb-1 font-medium">Company Name</label>
              <input
                type="text"
                placeholder="Meridian Studio"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full bg-[#F6F4EF] border border-[#DAD4C4] rounded px-3 py-2 text-[#1E2A38]"
              />
            </div>
            <div>
              <label className="block text-xs uppercase text-[#5B6672] mb-1 font-medium">Phone</label>
              <input
                type="text"
                placeholder="+91 98765 12345"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-[#F6F4EF] border border-[#DAD4C4] rounded px-3 py-2 text-[#1E2A38]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase text-[#5B6672] mb-1 font-medium">Notes</label>
            <textarea
              rows={2}
              placeholder="Optional notes or billing preferences"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#F6F4EF] border border-[#DAD4C4] rounded px-3 py-2 text-xs text-[#1E2A38]"
            />
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
              {loading ? 'Saving...' : clientToEdit ? 'Update Client →' : 'Save Client →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
