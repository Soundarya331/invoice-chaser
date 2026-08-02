# InvoiceChaser 🚀

> Automated invoice reminder system for freelancers built with React, Django REST Framework, Celery, Redis, PostgreSQL, and Brevo.

## 🏗️ Tech Stack

- **Frontend**: React (Vite / Vercel)
- **Backend API**: Django REST Framework (Render)
- **Database**: PostgreSQL (Render / Neon)
- **Background Tasks**: Celery Worker + Celery Beat
- **Message Broker**: Redis (Upstash)
- **Email Gateway**: Brevo (Transactional Email API)

---

## 📊 Data Models & Architecture

### User (Freelancer)
- `id`, `name`, `email`, `business_name`, `brevo_api_key` (encrypted), `created_at`

### Client
- `id`, `user_id` (FK), `name`, `email`, `company`, `phone`, `notes`, `created_at`

### Invoice
- `id`, `invoice_number` (`INV-0001`…), `user_id` (FK), `client_id` (FK), `issue_date`, `due_date`, `status` (`pending`, `paid`, `overdue`), `subtotal`, `tax`, `total`, `notes`, `automate_enabled`

### InvoiceItem
- `id`, `invoice_id` (FK), `description`, `quantity`, `unit_price`, `amount`

### Reminder
- `id`, `invoice_id` (FK), `sent_at`, `tone` (`friendly`, `firm`, `final`), `email_subject`, `email_body`, `status` (`sent`, `failed`)

---

## 🖥️ App Features & Pages

- 📈 **Dashboard**: Summary metrics cards & recent invoice ledger.
- 📑 **Invoices List**: Status filtering (`pending`, `paid`, `overdue`) & client search.
- 🔍 **Invoice Detail**: Line item breakdown, payment status, reminder logs, & instant "Send Reminder" button.
- 📝 **Create / Edit Invoice**: Client selection, dynamic line items, auto-tax calculation, and due dates.
- 👥 **Clients Management**: Client roster with add/edit drawer.
- ⚙️ **Settings**: Business credentials, Brevo API integration, default reminder tone & intervals.

---

## 📦 Project Structure

```text
invoice-chaser/
├── backend/            # Django REST API + Celery Tasks
│   ├── apps/
│   │   ├── users/
│   │   ├── clients/
│   │   ├── invoices/
│   │   └── reminders/
│   ├── core/           # Django settings, Celery app & Redis config
│   └── requirements.txt
├── frontend/           # React + Tailwind / Modern UI
│   └── src/
└── docker-compose.yml
```

---

## 🛠️ GitHub Remote Setup

```bash
git remote add origin git@github.com:Soundarya331/invoice-chaser.git
git branch -M main
git push -u origin main
```
