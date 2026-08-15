import React, { useState } from 'react';
import api from '../api';
import type { UserProfile } from '../types';
import { Eye, EyeOff, ArrowRight, CheckCircle2 } from 'lucide-react';

interface AuthModalProps {
  onSuccess: (user: UserProfile) => void;
  defaultMode?: 'login' | 'register';
  onClose?: () => void;
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

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess, defaultMode = 'login', onClose }) => {
  const [mode, setMode] = useState<'login' | 'register'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const switchMode = (m: 'login' | 'register') => {
    setMode(m);
    setError('');
    setEmail('');
    setPassword('');
    setFirstName('');
    setLastName('');
    setBusinessName('');
    setPhone('');
  };

  const handleLogin = async (e: React.FormEvent) => {
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/register/', {
        email: email.trim(),
        password,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        business_name: businessName.trim() || `${firstName.trim()} ${lastName.trim()}`.trim(),
        phone: phone.trim(),
      });
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-[#FFFEFB] border border-[#DAD4C4] rounded-xl p-7 max-w-md w-full shadow-2xl relative my-auto">
        {/* Close button (only if onClose provided) */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-[#5B6672] hover:text-[#1E2A38] text-xl font-bold cursor-pointer leading-none"
            aria-label="Close"
          >✕</button>
        )}

        {/* Brand */}
        <div className="mb-5">
          <h2 className="font-serif-brand text-2xl font-semibold text-[#1E2A38]">
            Invoice<span className="text-[#C9A96A]">Chaser</span>
          </h2>
          <p className="text-xs text-[#5B6672] mt-0.5">
            {mode === 'login' ? 'Sign in to your account' : 'Create your free account — no credit card required'}
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex bg-[#F6F4EF] rounded-lg p-1 mb-5 gap-1">
          <button
            onClick={() => switchMode('login')}
            className={`flex-1 py-2 rounded-md text-xs font-semibold transition cursor-pointer ${
              mode === 'login'
                ? 'bg-[#1E2A38] text-[#F1E9D6] shadow-sm'
                : 'text-[#5B6672] hover:text-[#1E2A38]'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => switchMode('register')}
            className={`flex-1 py-2 rounded-md text-xs font-semibold transition cursor-pointer ${
              mode === 'register'
                ? 'bg-[#1E2A38] text-[#F1E9D6] shadow-sm'
                : 'text-[#5B6672] hover:text-[#1E2A38]'
            }`}
          >
            Get Started Free
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-[#F5E5DF] text-[#B5533C] text-xs p-3 rounded mb-4 border border-[#B5533C]/20 font-medium">
            ⚠️ {error}
          </div>
        )}

        {/* Login Form */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4 text-sm">
            <div>
              <label className="block text-xs uppercase text-[#5B6672] mb-1 font-medium">Email Address</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-[#F6F4EF] border border-[#DAD4C4] rounded-lg px-3 py-2.5 text-[#1E2A38] focus:outline-none focus:border-[#1E2A38] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs uppercase text-[#5B6672] mb-1 font-medium">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  className="w-full bg-[#F6F4EF] border border-[#DAD4C4] rounded-lg px-3 py-2.5 pr-10 text-[#1E2A38] focus:outline-none focus:border-[#1E2A38] text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5B6672] hover:text-[#1E2A38] cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1E2A38] hover:bg-[#14202D] text-[#F1E9D6] py-2.5 rounded-lg text-sm font-semibold transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-1"
            >
              {loading ? 'Signing in...' : (<>Sign In <ArrowRight className="w-4 h-4" /></>)}
            </button>
            <p className="text-center text-xs text-[#5B6672] pt-1">
              No account?{' '}
              <button type="button" onClick={() => switchMode('register')} className="text-[#1E2A38] font-semibold underline cursor-pointer">
                Get started free →
              </button>
            </p>
          </form>
        )}

        {/* Register Form */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs uppercase text-[#5B6672] mb-1 font-medium">First Name</label>
                <input
                  type="text"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Soundarya"
                  className="w-full bg-[#F6F4EF] border border-[#DAD4C4] rounded-lg px-3 py-2.5 text-[#1E2A38] focus:outline-none focus:border-[#1E2A38] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs uppercase text-[#5B6672] mb-1 font-medium">Last Name</label>
                <input
                  type="text"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="P"
                  className="w-full bg-[#F6F4EF] border border-[#DAD4C4] rounded-lg px-3 py-2.5 text-[#1E2A38] focus:outline-none focus:border-[#1E2A38] text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs uppercase text-[#5B6672] mb-1 font-medium">Business / Freelancer Name</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Soundarya Studio"
                className="w-full bg-[#F6F4EF] border border-[#DAD4C4] rounded-lg px-3 py-2.5 text-[#1E2A38] focus:outline-none focus:border-[#1E2A38] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs uppercase text-[#5B6672] mb-1 font-medium">Email Address *</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-[#F6F4EF] border border-[#DAD4C4] rounded-lg px-3 py-2.5 text-[#1E2A38] focus:outline-none focus:border-[#1E2A38] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs uppercase text-[#5B6672] mb-1 font-medium">Phone (for WhatsApp)</label>
              <input
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9876543210"
                className="w-full bg-[#F6F4EF] border border-[#DAD4C4] rounded-lg px-3 py-2.5 text-[#1E2A38] focus:outline-none focus:border-[#1E2A38] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs uppercase text-[#5B6672] mb-1 font-medium">Password * (min. 6 characters)</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a secure password"
                  className="w-full bg-[#F6F4EF] border border-[#DAD4C4] rounded-lg px-3 py-2.5 pr-10 text-[#1E2A38] focus:outline-none focus:border-[#1E2A38] text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5B6672] hover:text-[#1E2A38] cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#C9A96A] hover:bg-[#B89758] text-[#1E2A38] py-2.5 rounded-lg text-sm font-bold transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-1"
            >
              {loading ? 'Creating account...' : (<><CheckCircle2 className="w-4 h-4" /> Create Free Account</>)}
            </button>
            <p className="text-center text-[10px] text-[#5B6672]">
              No credit card required. Free forever for solo freelancers.
            </p>
            <p className="text-center text-xs text-[#5B6672]">
              Already have an account?{' '}
              <button type="button" onClick={() => switchMode('login')} className="text-[#1E2A38] font-semibold underline cursor-pointer">
                Sign in →
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};
