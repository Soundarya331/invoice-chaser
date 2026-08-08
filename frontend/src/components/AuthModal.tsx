import React, { useState } from 'react';
import api from '../api';
import type { UserProfile } from '../types';

interface AuthModalProps {
  onSuccess: (user: UserProfile) => void;
}

const parseApiError = (data: any): string => {
  if (!data) return 'An unexpected error occurred.';
  if (typeof data === 'string') return data;
  if (data.detail) return data.detail;
  if (data.error) return data.error;
  if (data.message) return data.message;
  
  if (typeof data === 'object') {
    const messages: string[] = [];
    for (const key of Object.keys(data)) {
      const val = data[key];
      if (Array.isArray(val)) {
        messages.push(`${key !== 'non_field_errors' ? `${key}: ` : ''}${val.join(' ')}`);
      } else if (typeof val === 'string') {
        messages.push(`${key !== 'non_field_errors' ? `${key}: ` : ''}${val}`);
      }
    }
    if (messages.length > 0) return messages.join(' | ');
  }
  
  return 'Authentication failed. Please check your credentials.';
};

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('soundarya.p331@gmail.com');
  const [password, setPassword] = useState('securePassword123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login/', { email, password });
      localStorage.setItem('access_token', res.data.tokens.access);
      localStorage.setItem('refresh_token', res.data.tokens.refresh);
      onSuccess(res.data.user);
    } catch (err: any) {
      setError(parseApiError(err.response?.data));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#FFFEFB] border border-[#DAD4C4] rounded-lg p-8 max-w-md w-full shadow-2xl">
        <h2 className="font-serif-brand text-2xl font-semibold mb-2 text-[#1E2A38]">
          Invoice<span className="text-[#C9A96A]">Flow</span>
        </h2>
        <p className="text-xs text-[#5B6672] uppercase tracking-widest mb-6">
          Sign in to your SaaS Account
        </p>

        {error && (
          <div className="bg-[#F5E5DF] text-[#B5533C] text-xs p-3 rounded mb-4 border border-[#B5533C]/20 font-medium">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs uppercase text-[#5B6672] mb-1 font-medium">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#F6F4EF] border border-[#DAD4C4] rounded px-3 py-2 text-[#1E2A38] focus:outline-none focus:border-[#1E2A38]"
            />
          </div>

          <div>
            <label className="block text-xs uppercase text-[#5B6672] mb-1 font-medium">Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#F6F4EF] border border-[#DAD4C4] rounded px-3 py-2 text-[#1E2A38] focus:outline-none focus:border-[#1E2A38]"
            />
            <div className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                id="showAuthPassword"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
                className="rounded accent-[#1E2A38] cursor-pointer"
              />
              <label htmlFor="showAuthPassword" className="text-xs text-[#5B6672] cursor-pointer select-none">
                Show Password
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1E2A38] hover:bg-[#14202D] text-[#F1E9D6] py-2.5 rounded text-sm font-medium transition cursor-pointer disabled:opacity-50 mt-2"
          >
            {loading ? 'Authenticating...' : 'Sign In →'}
          </button>
        </form>
      </div>
    </div>
  );
};
