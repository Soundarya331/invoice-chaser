import React, { useState } from 'react';
import { AuthModal } from './AuthModal';
import type { UserProfile } from '../types';
import { Mail, Zap, Shield, BarChart3, ArrowRight, CheckCircle2, MessageSquare, CreditCard } from 'lucide-react';

interface LandingPageProps {
  onSuccess: (user: UserProfile) => void;
}

const features = [
  {
    icon: <Mail className="w-5 h-5 text-[#C9A96A]" />,
    title: 'Automated Email Reminders',
    desc: 'Friendly, firm, or final — your tone, your brand. Powered by Brevo.',
  },
  {
    icon: <MessageSquare className="w-5 h-5 text-[#25D366]" />,
    title: 'WhatsApp Reminders',
    desc: 'Send payment nudges directly to your client\'s WhatsApp — zero friction.',
  },
  {
    icon: <CreditCard className="w-5 h-5 text-[#6772E5]" />,
    title: 'Razorpay & UPI Payments',
    desc: 'Embed a UPI QR code or Razorpay payment link directly in every invoice.',
  },
  {
    icon: <Zap className="w-5 h-5 text-[#F6B93B]" />,
    title: 'Auto-Chase on Schedule',
    desc: 'Celery background tasks check overdue invoices every 6 hours automatically.',
  },
  {
    icon: <BarChart3 className="w-5 h-5 text-[#2F6F4F]" />,
    title: 'Real-Time Dashboard',
    desc: 'Outstanding, paid, and overdue at a glance. Always know your cash position.',
  },
  {
    icon: <Shield className="w-5 h-5 text-[#1E2A38]" />,
    title: 'Multi-Tenant & Secure',
    desc: 'JWT auth, Fernet-encrypted API keys, strict data isolation per subscriber.',
  },
];

const stats = [
  { value: '25–40%', label: 'Cash flow boost' },
  { value: '3 hrs', label: 'Saved per week' },
  { value: '₹0', label: 'Setup cost' },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onSuccess }) => {
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');

  const openRegister = () => { setAuthMode('register'); setShowAuth(true); };
  const openLogin = () => { setAuthMode('login'); setShowAuth(true); };

  return (
    <>
      <div className="min-h-screen bg-[#0D1117] text-white flex flex-col">
        {/* Nav */}
        <nav className="flex items-center justify-between px-6 md:px-12 py-4 border-b border-white/10">
          <span className="font-serif-brand text-xl font-semibold tracking-tight">
            Invoice<span className="text-[#C9A96A]">Chaser</span>
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={openLogin}
              className="text-sm text-white/70 hover:text-white transition px-4 py-2 cursor-pointer"
            >
              Sign In
            </button>
            <button
              onClick={openRegister}
              id="nav-get-started"
              className="bg-[#C9A96A] hover:bg-[#B89758] text-[#1E2A38] text-sm font-bold px-5 py-2 rounded-lg transition cursor-pointer"
            >
              Get Started Free
            </button>
          </div>
        </nav>

        {/* Hero */}
        <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 md:py-32">
          <div className="inline-flex items-center gap-2 bg-white/10 text-white/80 text-[11px] uppercase tracking-widest px-3 py-1.5 rounded-full mb-6 border border-white/10 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C9A96A] animate-pulse"></span>
            Automated Invoice Reminders for Freelancers
          </div>
          <h1 className="text-4xl md:text-6xl font-bold leading-tight max-w-3xl mb-6 tracking-tight">
            Stop Chasing Invoices.<br />
            <span className="text-[#C9A96A]">Start Getting Paid.</span>
          </h1>
          <p className="text-white/60 text-lg md:text-xl max-w-xl mb-8 leading-relaxed">
            Automate professional payment reminders and boost your cash flow by 25–40%, saving you hours every week.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              id="hero-get-started"
              onClick={openRegister}
              className="bg-[#C9A96A] hover:bg-[#B89758] text-[#1E2A38] font-bold text-base px-8 py-3.5 rounded-xl transition cursor-pointer flex items-center gap-2 shadow-lg shadow-[#C9A96A]/20"
            >
              Get Started Free <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={openLogin}
              className="text-white/70 hover:text-white text-sm px-6 py-3.5 rounded-xl border border-white/20 hover:border-white/40 transition cursor-pointer"
            >
              Already have an account →
            </button>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap items-center justify-center gap-8 mt-14 pt-8 border-t border-white/10 w-full max-w-lg">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="font-mono-code text-2xl font-bold text-[#C9A96A]">{s.value}</div>
                <div className="text-[11px] text-white/50 uppercase tracking-wider mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="px-6 md:px-12 py-16 bg-[#0A0F14] border-t border-white/10">
          <div className="max-w-5xl mx-auto">
            <h2 className="font-serif-brand text-2xl md:text-3xl font-semibold text-center mb-2">
              Everything a freelancer needs
            </h2>
            <p className="text-white/50 text-center text-sm mb-10">Built for solopreneurs, agencies, and small businesses.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {features.map((f) => (
                <div key={f.title} className="bg-white/5 border border-white/10 rounded-xl p-5 hover:border-white/20 transition">
                  <div className="mb-3">{f.icon}</div>
                  <h3 className="text-sm font-semibold text-white mb-1">{f.title}</h3>
                  <p className="text-white/50 text-xs leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-6 py-16 text-center border-t border-white/10">
          <h2 className="font-serif-brand text-2xl md:text-3xl font-semibold mb-3">
            Ready to get paid on time?
          </h2>
          <p className="text-white/50 text-sm mb-6">Join freelancers automating their invoice follow-ups today.</p>
          <button
            id="cta-get-started"
            onClick={openRegister}
            className="bg-[#C9A96A] hover:bg-[#B89758] text-[#1E2A38] font-bold text-base px-8 py-3.5 rounded-xl transition cursor-pointer inline-flex items-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5" /> Create Free Account — No card required
          </button>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10 px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-white/30 text-xs">
          <span>© {new Date().getFullYear()} InvoiceChaser. Built for freelancers.</span>
          <button onClick={openLogin} className="text-white/40 hover:text-white/70 cursor-pointer transition">
            Sign In →
          </button>
        </footer>
      </div>

      {showAuth && (
        <AuthModal
          onSuccess={onSuccess}
          defaultMode={authMode}
          onClose={() => setShowAuth(false)}
        />
      )}
    </>
  );
};
