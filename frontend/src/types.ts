export interface UserProfile {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  business_name: string;
  phone?: string;
  default_reminder_tone?: 'friendly' | 'firm' | 'final';
  default_reminder_interval?: number;
  brevo_api_key_masked?: string;
  is_superuser?: boolean;
  is_staff?: boolean;
}

export interface Client {
  id: number;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  notes?: string;
  created_at?: string;
}

export interface InvoiceItem {
  id?: number;
  description: string;
  quantity: number;
  unit_price: number;
  amount?: number;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  client?: number;
  client_id?: number;
  client_detail?: Client;
  issue_date: string;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue';
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  automate_enabled: boolean;
  items?: InvoiceItem[];
  created_at?: string;
}

export interface DashboardStats {
  outstanding: { amount: number; count: number };
  paid: { amount: number; count: number };
  overdue: { amount: number; count: number; avg_days_late: number };
  reminders_sent: { count: number };
}

export interface ReminderLog {
  id: number;
  invoice: number;
  invoice_number: string;
  client_name: string;
  sent_at: string;
  tone: 'friendly' | 'firm' | 'final';
  email_subject: string;
  email_body: string;
  status: 'sent' | 'failed';
}
