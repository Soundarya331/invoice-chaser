import React, { useState } from 'react';
import api from '../api';
import type { UserProfile } from '../types';


interface AuthModalProps {
  onSuccess: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('soundarya.p331@gmail.com');
  const [password, setPassword] = useState('securePassword123');
  const [firstName, setFirstName] = useState('Soundarya');
  const [lastName, setLastName] = useState('P');
  const [businessName, setBusinessName] = useState('Soundarya Studio — Tech & Design');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const res = await api.post('/auth/login/', { email, password });
        localStorage.setItem('access_token', res.data.tokens.access);
        localStorage.setItem('refresh_token', res.data.tokens.refresh);
        onSuccess(res.data.user);
      } else {
        const res = await api.post('/auth/register/', {
          email,
          password,
          first_name: firstName,
          last_name: lastName,
          business_name: businessName,
        });
        localStorage.setItem('access_token', res.data.tokens.access);
        localStorage.setItem('refresh_token', res.data.tokens.refresh);
        onSuccess(res.data.user);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Authentication failed. Please check your credentials.');
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
          {isLogin ? 'Sign in to your SaaS Account' : 'Create your Subscriber Account'}
        </p>

        {error && (
          <div className="bg-[#F5E5DF] text-[#B5533C] text-xs p-3 rounded mb-4 border border-[#B5533C]/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          {!isLogin && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase text-[#5B6672] mb-1 font-medium">First Name</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-[#F6F4EF] border border-[#DAD4C4] rounded px-3 py-2 text-[#1E2A38] focus:outline-none focus:border-[#1E2A38]"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase text-[#5B6672] mb-1 font-medium">Last Name</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-[#F6F4EF] border border-[#DAD4C4] rounded px-3 py-2 text-[#1E2A38] focus:outline-none focus:border-[#1E2A38]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase text-[#5B6672] mb-1 font-medium">Business Name</label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full bg-[#F6F4EF] border border-[#DAD4C4] rounded px-3 py-2 text-[#1E2A38] focus:outline-none focus:border-[#1E2A38]"
                />
              </div>
            </>
          )}

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
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#F6F4EF] border border-[#DAD4C4] rounded px-3 py-2 text-[#1E2A38] focus:outline-none focus:border-[#1E2A38]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1E2A38] hover:bg-[#14202D] text-[#F1E9D6] py-2.5 rounded text-sm font-medium transition cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Processing...' : isLogin ? 'Sign In →' : 'Register Account →'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-[#5B6672]">
          {isLogin ? "Don't have an account?" : 'Already registered?'}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="ml-2 text-[#1E2A38] font-semibold underline cursor-pointer"
          >
            {isLogin ? 'Create one now' : 'Sign in here'}
          </button>
        </div>
      </div>
    </div>
  );
};
