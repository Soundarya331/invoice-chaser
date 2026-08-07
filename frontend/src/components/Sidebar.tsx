import React, { useState } from 'react';
import type { UserProfile } from '../types';
import { Menu, X } from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  user: UserProfile | null;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onTabChange, user, onLogout }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'invoices', label: 'Invoices' },
    { id: 'clients', label: 'Clients' },
    { id: 'reminders', label: 'Reminders' },
    { id: 'settings', label: 'Settings' },
  ];

  const handleNavClick = (tabId: string) => {
    onTabChange(tabId);
    setMobileOpen(false);
  };

  const navContent = (
    <div className="flex flex-col h-full">
      <div className="font-serif-brand text-[21px] font-semibold text-white mb-1 tracking-wide">
        Invoice<span className="text-[#C9A96A]">Flow</span>
      </div>
      <div className="text-[11px] text-[#8A93A0] uppercase tracking-[1.5px] mb-8 font-mono-code">
        ledger &amp; reminders
      </div>

      <nav className="flex flex-col gap-1.5 flex-1">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full text-left px-3 py-2.5 rounded text-[14.5px] transition flex items-center gap-2.5 cursor-pointer ${
                isActive
                  ? 'bg-[#C9A96A]/15 text-[#F1E9D6] border-l-2 border-[#C9A96A] pl-2.5 font-medium'
                  : 'text-[#C4C9D2] hover:text-white'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isActive ? 'bg-[#C9A96A]' : 'bg-current opacity-60'
                }`}
              />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto pt-5 border-t border-white/10 text-[12px] text-[#6E7683]">
        <div>Signed in as</div>
        <div className="font-semibold text-[#C4C9D2] truncate">
          {user ? `${user.first_name} ${user.last_name}` : 'Soundarya P.'}
        </div>
        <button
          onClick={onLogout}
          className="mt-2 text-[11px] text-[#C9A96A] hover:underline cursor-pointer"
        >
          Sign Out →
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Navbar (Screen < md) */}
      <div className="md:hidden bg-[#1E2A38] text-white p-4 flex justify-between items-center fixed top-0 left-0 right-0 z-40 border-b border-[#DAD4C4]/20">
        <div className="font-serif-brand text-[18px] font-semibold">
          Invoice<span className="text-[#C9A96A]">Flow</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1 text-[#F1E9D6] focus:outline-none cursor-pointer"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-[240px] bg-[#1E2A38] text-[#E8E4D8] p-6 transition-transform duration-300 md:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {navContent}
      </aside>

      {/* Desktop Sidebar (Screen >= md) */}
      <aside className="hidden md:flex w-[220px] bg-[#1E2A38] text-[#E8E4D8] p-7 flex-col min-h-screen shrink-0 border-r border-[#DAD4C4]/20">
        {navContent}
      </aside>
    </>
  );
};
