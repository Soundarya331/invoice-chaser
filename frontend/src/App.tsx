import { useState, useEffect } from 'react';
import api, { API_BASE_URL } from './api';
import { Sidebar } from './components/Sidebar';
import { AuthModal } from './components/AuthModal';
import { NewInvoiceModal } from './components/NewInvoiceModal';
import { NewClientModal } from './components/NewClientModal';
import type { Invoice, Client, DashboardStats, UserProfile, ReminderLog } from './types';

import { Download, Mail, CheckCircle2, Search, Plus, UserPlus, RefreshCw } from 'lucide-react';

export function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [stats, setStats] = useState<DashboardStats>({
    outstanding: { amount: 184200, count: 9 },
    paid: { amount: 96500, count: 6 },
    overdue: { amount: 4200, count: 3, avg_days_late: 9 },
    reminders_sent: { count: 14 },
  });

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [reminders, setReminders] = useState<ReminderLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const [showNewInvoiceModal, setShowNewInvoiceModal] = useState(false);
  const [showNewClientModal, setShowNewClientModal] = useState(false);

  // Initial authentication check & fetch
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      fetchUserProfile();
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, statusFilter, searchQuery]);

  const fetchUserProfile = async () => {
    try {
      const res = await api.get('/auth/profile/');
      setUser(res.data);
    } catch {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, invoicesRes, clientsRes, remindersRes] = await Promise.all([
        api.get('/invoices/dashboard_stats/'),
        api.get(`/invoices/?status=${statusFilter}&search=${searchQuery}`),
        api.get('/clients/'),
        api.get('/reminders/'),
      ]);
      setStats(statsRes.data);
      setInvoices(invoicesRes.data.results || invoicesRes.data);
      setClients(clientsRes.data.results || clientsRes.data);
      setReminders(remindersRes.data.results || remindersRes.data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  // 1-Click PDF Download
  const handleDownloadPDF = async (invoice: Invoice) => {
    try {
      showToast(`Generating PDF for ${invoice.invoice_number}...`);
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/invoices/${invoice.id}/download_pdf/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice.invoice_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      showToast(`PDF ${invoice.invoice_number}.pdf downloaded successfully! 📄`);
    } catch {
      showToast(`Failed to download PDF for ${invoice.invoice_number}`);
    }
  };

  // 1-Click Send Reminder
  const handleSendReminder = async (invoice: Invoice) => {
    try {
      showToast(`Sending reminder for ${invoice.invoice_number}...`);
      await api.post(`/invoices/${invoice.id}/send_reminder/`, { tone: 'friendly' });
      showToast(`Reminder email sent to ${invoice.client_detail?.email || 'client'}! ✉️`);
      fetchDashboardData();
    } catch {
      showToast(`Failed to send reminder for ${invoice.invoice_number}`);
    }
  };

  // 1-Click Mark Paid
  const handleMarkPaid = async (invoice: Invoice) => {
    try {
      await api.post(`/invoices/${invoice.id}/mark_paid/`);
      showToast(`Invoice ${invoice.invoice_number} marked as Paid! 🎉`);
      fetchDashboardData();
    } catch {
      showToast(`Failed to mark ${invoice.invoice_number} as Paid`);
    }
  };

  if (!user) {
    return <AuthModal onSuccess={(u) => setUser(u)} />;
  }

  const currentDateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-9 pt-20 md:pt-9 max-w-7xl w-full overflow-hidden">
        {/* Toast Notification */}
        {notification && (
          <div className="fixed top-20 md:top-5 right-5 bg-[#1E2A38] text-[#F1E9D6] px-4 py-3 rounded shadow-xl border border-[#C9A96A]/30 text-xs font-mono-code z-50 animate-bounce">
            {notification}
          </div>
        )}

        {/* Topbar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 sm:gap-0 mb-8">
          <div>
            <h1 className="font-serif-brand text-2xl md:text-3xl font-semibold text-[#1E2A38]">
              {currentTab === 'dashboard' && 'Dashboard'}
              {currentTab === 'invoices' && 'Invoices Ledger'}
              {currentTab === 'clients' && 'Clients Directory'}
              {currentTab === 'reminders' && 'Reminders History'}
              {currentTab === 'settings' && 'Account Settings'}
            </h1>
            <p className="text-[#5B6672] text-[13.5px] mt-1">
              {currentDateStr} — {stats.overdue.count} invoices need attention
            </p>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <button
              onClick={() => setShowNewClientModal(true)}
              className="flex-1 sm:flex-none bg-transparent border border-[#DAD4C4] hover:border-[#1E2A38] text-[#1E2A38] px-4 py-2.5 text-[13.5px] font-medium rounded transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-[#8A6D3B]" /> + Add Client
            </button>
            <button
              onClick={() => setShowNewInvoiceModal(true)}
              className="flex-1 sm:flex-none bg-[#1E2A38] hover:bg-[#14202D] text-[#F1E9D6] px-5 py-2.5 text-[13.5px] font-medium rounded transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4 text-[#C9A96A]" /> + New Invoice
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-9">
          {/* Outstanding Card */}
          <div className="bg-[#FFFEFB] border border-[#DAD4C4] rounded-md p-[18px_20px] relative shadow-sm">
            <div className="text-[11px] uppercase tracking-widest text-[#5B6672] mb-2.5 font-medium">
              Outstanding
            </div>
            <div className="font-mono-code text-2xl font-semibold text-[#1E2A38] tracking-tight">
              ₹{stats.outstanding.amount.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-[#5B6672] mt-1.5">
              across {stats.outstanding.count} invoices
            </div>
          </div>

          {/* Paid Card */}
          <div className="bg-[#FFFEFB] border border-[#DAD4C4] rounded-md p-[18px_20px] relative shadow-sm">
            <div className="absolute top-3.5 right-3.5 w-1.5 h-1.5 rounded-full bg-[#2F6F4F]" />
            <div className="text-[11px] uppercase tracking-widest text-[#5B6672] mb-2.5 font-medium">
              Paid this month
            </div>
            <div className="font-mono-code text-2xl font-semibold text-[#2F6F4F] tracking-tight">
              ₹{stats.paid.amount.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-[#5B6672] mt-1.5">
              {stats.paid.count} invoices settled
            </div>
          </div>

          {/* Overdue Card */}
          <div className="bg-[#FFFEFB] border border-[#DAD4C4] rounded-md p-[18px_20px] relative shadow-sm">
            <div className="absolute top-3.5 right-3.5 w-1.5 h-1.5 rounded-full bg-[#B5533C]" />
            <div className="text-[11px] uppercase tracking-widest text-[#5B6672] mb-2.5 font-medium">
              Overdue
            </div>
            <div className="font-mono-code text-2xl font-semibold text-[#B5533C] tracking-tight">
              ₹{stats.overdue.amount.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-[#5B6672] mt-1.5">
              {stats.overdue.count} invoices, avg {stats.overdue.avg_days_late} days late
            </div>
          </div>

          {/* Reminders Card */}
          <div className="bg-[#FFFEFB] border border-[#DAD4C4] rounded-md p-[18px_20px] relative shadow-sm">
            <div className="text-[11px] uppercase tracking-widest text-[#5B6672] mb-2.5 font-medium">
              Reminders sent
            </div>
            <div className="font-mono-code text-2xl font-semibold text-[#1E2A38] tracking-tight">
              {stats.reminders_sent.count}
            </div>
            <div className="text-xs text-[#5B6672] mt-1.5">auto-sent this month</div>
          </div>
        </div>

        {/* Dynamic Views */}
        {currentTab === 'clients' ? (
          /* Clients View */
          <div className="bg-[#FFFEFB] border border-[#DAD4C4] rounded-md overflow-hidden shadow-sm p-6">
            <h2 className="font-serif-brand text-lg font-semibold mb-4 text-[#1E2A38]">
              Client Directory ({clients.length})
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {clients.map((c) => (
                <div key={c.id} className="p-4 border border-[#DAD4C4] rounded bg-[#F6F4EF]/50">
                  <div className="font-semibold text-sm text-[#1E2A38]">{c.name}</div>
                  <div className="text-xs text-[#5B6672]">{c.email}</div>
                  <div className="text-xs text-[#8A6D3B] mt-1">{c.company || 'Individual Client'}</div>
                  {c.phone && <div className="text-xs font-mono-code text-[#5B6672] mt-1">📞 {c.phone}</div>}
                </div>
              ))}
            </div>
          </div>
        ) : currentTab === 'reminders' ? (
          /* Reminders History View */
          <div className="bg-[#FFFEFB] border border-[#DAD4C4] rounded-md overflow-hidden shadow-sm p-6">
            <h2 className="font-serif-brand text-lg font-semibold mb-4 text-[#1E2A38]">
              Reminders Sent Log ({reminders.length})
            </h2>
            <div className="space-y-3">
              {reminders.map((r) => (
                <div key={r.id} className="p-3 border border-[#DAD4C4] rounded text-xs flex justify-between items-center">
                  <div>
                    <span className="font-mono-code font-semibold text-[#1E2A38] mr-2">
                      {r.invoice_number}
                    </span>
                    <span className="font-medium text-[#1E2A38]">{r.client_name}</span>
                    <div className="text-[#5B6672] mt-0.5">{r.email_subject}</div>
                  </div>
                  <div className="text-right">
                    <span className="stamp stamp-pending text-[10px]">{r.tone}</span>
                    <div className="font-mono-code text-[11px] text-[#5B6672] mt-1">
                      {new Date(r.sent_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : currentTab === 'settings' ? (
          /* Settings View */
          <div className="bg-[#FFFEFB] border border-[#DAD4C4] rounded-md p-6 max-w-xl shadow-sm">
            <h2 className="font-serif-brand text-lg font-semibold mb-4 text-[#1E2A38]">
              SaaS Account Settings
            </h2>
            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-xs uppercase text-[#5B6672] mb-1">Subscriber Business Name</label>
                <input
                  type="text"
                  readOnly
                  value={user.business_name}
                  className="w-full bg-[#F6F4EF] border border-[#DAD4C4] rounded px-3 py-2 text-[#1E2A38]"
                />
              </div>
              <div>
                <label className="block text-xs uppercase text-[#5B6672] mb-1">Email</label>
                <input
                  type="text"
                  readOnly
                  value={user.email}
                  className="w-full bg-[#F6F4EF] border border-[#DAD4C4] rounded px-3 py-2 text-[#1E2A38]"
                />
              </div>
              <div>
                <label className="block text-xs uppercase text-[#5B6672] mb-1">Central Email Gateway</label>
                <input
                  type="text"
                  readOnly
                  value="Brevo Transactional API (Configured via .env)"
                  className="w-full bg-[#F6F4EF] border border-[#DAD4C4] rounded px-3 py-2 text-[#1E2A38] font-mono-code text-xs"
                />
              </div>
            </div>
          </div>
        ) : (
          /* Main Ledger Table (Dashboard & Invoices View) */
          <div className="bg-[#FFFEFB] border border-[#DAD4C4] rounded-md overflow-hidden shadow-sm">
            {/* Ledger Head */}
            <div className="flex justify-between items-center p-4 px-5 border-b border-[#DAD4C4] bg-[#FFFEFB]">
              <div className="flex items-center gap-4">
                <h2 className="font-serif-brand text-[17px] font-semibold text-[#1E2A38]">
                  Recent Invoices
                </h2>
                <button
                  onClick={fetchDashboardData}
                  className="text-[#5B6672] hover:text-[#1E2A38] p-1 cursor-pointer"
                  title="Refresh Data"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="flex items-center gap-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#5B6672]" />
                  <input
                    type="text"
                    placeholder="Search client or INV..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-[#F6F4EF] border border-[#DAD4C4] rounded-full pl-8 pr-3 py-1 text-xs text-[#1E2A38] focus:outline-none w-44"
                  />
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-1 text-[12.5px]">
                  {['all', 'paid', 'pending', 'overdue'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setStatusFilter(tab)}
                      className={`px-3 py-1 rounded-full capitalize transition cursor-pointer ${
                        statusFilter === tab
                          ? 'bg-[#1E2A38] text-[#F1E9D6] font-medium'
                          : 'text-[#5B6672] hover:text-[#1E2A38]'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Invoices Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-[#DAD4C4] bg-[#F6F4EF]/50">
                    <th className="text-left text-[11px] uppercase tracking-wider text-[#5B6672] font-medium px-5 py-3">
                      Invoice
                    </th>
                    <th className="text-left text-[11px] uppercase tracking-wider text-[#5B6672] font-medium px-5 py-3">
                      Client
                    </th>
                    <th className="text-left text-[11px] uppercase tracking-wider text-[#5B6672] font-medium px-5 py-3">
                      Issued
                    </th>
                    <th className="text-left text-[11px] uppercase tracking-wider text-[#5B6672] font-medium px-5 py-3">
                      Amount
                    </th>
                    <th className="text-left text-[11px] uppercase tracking-wider text-[#5B6672] font-medium px-5 py-3">
                      Status
                    </th>
                    <th className="text-right text-[11px] uppercase tracking-wider text-[#5B6672] font-medium px-5 py-3">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-[#5B6672] text-sm">
                        No invoices found matching current filter.
                      </td>
                    </tr>
                  ) : (
                    invoices.map((inv) => (
                      <tr
                        key={inv.id}
                        className="border-b border-[#DAD4C4]/60 hover:bg-[#F6F4EF]/40 transition text-sm"
                      >
                        <td className="px-5 py-3.5 font-mono-code font-semibold text-[#1E2A38]">
                          {inv.invoice_number}
                        </td>
                        <td className="px-5 py-3.5 text-[#1E2A38]">
                          {inv.client_detail?.name || `Client #${inv.client}`}
                        </td>
                        <td className="px-5 py-3.5 text-[#5B6672] text-xs font-mono-code">
                          {inv.issue_date}
                        </td>
                        <td className="px-5 py-3.5 font-mono-code font-medium text-[#1E2A38]">
                          ₹{inv.total.toLocaleString('en-IN')}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-medium uppercase tracking-wider ${
                              inv.status === 'paid'
                                ? 'bg-[#EAF3EC] text-[#2F6F4F]'
                                : inv.status === 'overdue'
                                ? 'bg-[#F5E5DF] text-[#B5533C]'
                                : 'bg-[#FDF4E3] text-[#B4872F]'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-3 text-xs">
                            {/* 1-Click PDF Download */}
                            <button
                              onClick={() => handleDownloadPDF(inv)}
                              className="text-[#5B6672] hover:text-[#1E2A38] flex items-center gap-1 cursor-pointer font-mono-code"
                              title="Download PDF"
                            >
                              <Download className="w-3.5 h-3.5" /> PDF
                            </button>

                            {/* 1-Click Send Reminder */}
                            {inv.status !== 'paid' && (
                              <button
                                onClick={() => handleSendReminder(inv)}
                                className="text-[#8A6D3B] hover:text-[#1E2A38] flex items-center gap-1 font-medium cursor-pointer"
                              >
                                <Mail className="w-3.5 h-3.5" /> Remind →
                              </button>
                            )}

                            {/* 1-Click Mark Paid */}
                            {inv.status !== 'paid' && (
                              <button
                                onClick={() => handleMarkPaid(inv)}
                                className="text-[#2F6F4F] hover:underline flex items-center gap-1 font-medium cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Mark Paid
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-5 text-center text-[11.5px] text-[#5B6672] font-mono-code">
          — end of ledger —
        </div>
      </main>

      {/* Modals */}
      {showNewInvoiceModal && (
        <NewInvoiceModal
          clients={clients}
          onClose={() => setShowNewInvoiceModal(false)}
          onSuccess={fetchDashboardData}
        />
      )}

      {showNewClientModal && (
        <NewClientModal
          onClose={() => setShowNewClientModal(false)}
          onSuccess={fetchDashboardData}
        />
      )}
    </div>
  );
}

export default App;
