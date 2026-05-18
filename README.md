# SupportDesk — Customer Support CRM System

A fully functional, production-ready customer support ticketing system built with Node.js, Express, SQLite, and a clean dark-themed UI.

---

## 🚀 Live Demo

> **[Insert your deployed URL here]**

---

## ✨ Features

| Feature | Description |
|---|---|
| **Create Tickets** | Form with customer name, email, subject, description, and priority |
| **List All Tickets** | Clean table view with ID, name, subject, priority, status, and date |
| **Search** | Real-time search across name, email, ticket ID, subject, description |
| **Filter by Status** | Filter: Open, In Progress, Closed |
| **View & Update Tickets** | Detailed ticket view — update status, update priority |
| **Notes / Comments** | Add timestamped notes to any ticket |
| **Delete Tickets** | Remove tickets permanently |
| **Dashboard Stats** | Live counts for total, open, in-progress, and closed tickets |
| **Priority Levels** | High / Medium / Low priority tracking |

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Node.js + Express |
| **Database** | SQLite via `better-sqlite3` |
| **Frontend** | Vanilla HTML/CSS/JS (no framework needed) |
| **Fonts** | Google Fonts — Syne + DM Sans |
| **Deploy** | Railway.app / Render / Vercel |

---

## 📁 Project Structure

```
support-crm/
├── server.js          # Express app + all API routes
├── package.json
├── .env.example
├── .gitignore
├── crm.db             # Auto-created SQLite database (gitignored)
└── public/
    └── index.html     # Complete single-page frontend
```

---

## ⚙️ Local Setup

### Prerequisites
- Node.js v18+ installed

### Steps

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/support-crm.git
cd support-crm

# 2. Install dependencies
npm install

# 3. Copy environment file
cp .env.example .env

# 4. Start the server
npm start

# 5. Open in browser
# http://localhost:3000
```

For development with auto-reload:
```bash
npm run dev
```

---

## 🌐 Deployment

### Option 1: Railway.app (Recommended — Free)

1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click **New Project → Deploy from GitHub Repo**
3. Select this repo
4. Railway auto-detects Node.js and runs `npm start`
5. Your app is live in ~2 minutes!

### Option 2: Render.com

1. Go to [render.com](https://render.com) → New Web Service
2. Connect your GitHub repo
3. Build command: `npm install`
4. Start command: `node server.js`
5. Set environment variable `PORT=3000`

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/tickets` | Create a new ticket |
| `GET` | `/api/tickets` | List all tickets (supports `?status=`, `?search=`, `?sort=`, `?order=`) |
| `GET` | `/api/tickets/stats` | Get dashboard counts |
| `GET` | `/api/tickets/:ticket_id` | Get ticket with notes |
| `PUT` | `/api/tickets/:ticket_id` | Update status/priority, add note |
| `DELETE` | `/api/tickets/:ticket_id` | Delete a ticket |

### Example: Create Ticket
```bash
curl -X POST http://localhost:3000/api/tickets \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "Priya Sharma",
    "customer_email": "priya@example.com",
    "subject": "Login issue",
    "description": "Cannot log in after password reset.",
    "priority": "High"
  }'
```

### Example: Search Tickets
```bash
curl "http://localhost:3000/api/tickets?search=priya&status=Open"
```

---

## 🗄 Database Schema

**tickets**
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT
ticket_id TEXT UNIQUE NOT NULL        -- e.g. TKT-0001
customer_name TEXT NOT NULL
customer_email TEXT NOT NULL
subject TEXT NOT NULL
description TEXT NOT NULL
status TEXT NOT NULL DEFAULT 'Open'   -- Open | In Progress | Closed
priority TEXT NOT NULL DEFAULT 'Medium' -- Low | Medium | High
created_at TEXT NOT NULL
updated_at TEXT NOT NULL
```

**notes**
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT
ticket_id TEXT NOT NULL (FK → tickets)
note_text TEXT NOT NULL
author TEXT NOT NULL DEFAULT 'Support Agent'
created_at TEXT NOT NULL
```

---

## 🎯 Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl/Cmd + K` | Jump to All Tickets with search focused |
| `Escape` | Close modal |

---

## 📝 Approach & Decisions

- **SQLite over PostgreSQL** — Zero config, runs on any server, ideal for MVP. Easily swappable with pg later.
- **Vanilla JS frontend** — No build step, no bundler, deploys instantly. Fast and lightweight.
- **better-sqlite3** — Synchronous SQLite driver, simpler than async alternatives for Express.
- **Single HTML file** — All CSS/JS in one file makes deployment and maintenance trivial.
- **Auto-seed demo data** — First load populates sample tickets so evaluators see the system in action.

---

## 🔮 Future Improvements

- User authentication with JWT
- Email notifications on ticket creation/update
- Pagination for large ticket lists
- File attachment support
- Analytics dashboard with charts
- Agent assignment and workload view
- Webhook integrations (Slack, Teams)
