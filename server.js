const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const initSqlJs = require('sql.js');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'crm.db');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---- DB BOOTSTRAP ----
let db;

async function initDB() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Open',
      priority TEXT NOT NULL DEFAULT 'Medium',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id TEXT NOT NULL,
      note_text TEXT NOT NULL,
      author TEXT NOT NULL DEFAULT 'Support Agent',
      created_at TEXT NOT NULL
    );
  `);

  saveDB();
  console.log('Database ready');
}

function saveDB() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// ---- HELPERS ----
function dbAll(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  } catch (e) {
    console.error('dbAll error:', e.message);
    return [];
  }
}

function dbGet(sql, params = []) {
  const rows = dbAll(sql, params);
  return rows[0] || null;
}

function dbRun(sql, params = []) {
  db.run(sql, params);
  saveDB();
}

function generateTicketId() {
  const row = dbGet('SELECT COUNT(*) as cnt FROM tickets');
  const count = row ? Number(row.cnt) : 0;
  return `TKT-${String(count + 1).padStart(4, '0')}`;
}

// ---- ROUTES ----

// POST /api/tickets
app.post('/api/tickets', (req, res) => {
  try {
    const { customer_name, customer_email, subject, description, priority = 'Medium' } = req.body;
    if (!customer_name || !customer_email || !subject || !description) {
      return res.status(400).json({ error: 'All fields are required.' });
    }
    const ticket_id = generateTicketId();
    const now = new Date().toISOString();
    dbRun(
      `INSERT INTO tickets (ticket_id, customer_name, customer_email, subject, description, status, priority, created_at, updated_at)
       VALUES (?,?,?,?,?,'Open',?,?,?)`,
      [ticket_id, customer_name, customer_email, subject, description, priority, now, now]
    );
    res.status(201).json({ ticket_id, created_at: now, message: 'Ticket created successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/tickets/stats  — must come BEFORE /:ticket_id
app.get('/api/tickets/stats', (req, res) => {
  try {
    const total = Number(dbGet('SELECT COUNT(*) as cnt FROM tickets').cnt);
    const open = Number(dbGet("SELECT COUNT(*) as cnt FROM tickets WHERE status='Open'").cnt);
    const inProgress = Number(dbGet("SELECT COUNT(*) as cnt FROM tickets WHERE status='In Progress'").cnt);
    const closed = Number(dbGet("SELECT COUNT(*) as cnt FROM tickets WHERE status='Closed'").cnt);
    const today = new Date().toISOString().split('T')[0];
    const todayCount = Number(dbGet("SELECT COUNT(*) as cnt FROM tickets WHERE created_at LIKE ?", [`${today}%`]).cnt);
    res.json({ total, open, inProgress, closed, today: todayCount });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/tickets
app.get('/api/tickets', (req, res) => {
  try {
    const { status, search, priority, sort = 'created_at', order = 'DESC' } = req.query;
    let query = 'SELECT * FROM tickets WHERE 1=1';
    const params = [];

    if (status && status !== 'All') {
      query += ' AND status = ?';
      params.push(status);
    }
    if (priority && priority !== 'All') {
      query += ' AND priority = ?';
      params.push(priority);
    }
    if (search) {
      query += ' AND (customer_name LIKE ? OR customer_email LIKE ? OR ticket_id LIKE ? OR subject LIKE ? OR description LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term, term);
    }

    const validSorts = ['created_at', 'updated_at', 'customer_name', 'status'];
    const safeSort = validSorts.includes(sort) ? sort : 'created_at';
    const safeOrder = order === 'ASC' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${safeSort} ${safeOrder}`;

    const tickets = dbAll(query, params);
    res.json(tickets);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/tickets/:ticket_id
app.get('/api/tickets/:ticket_id', (req, res) => {
  try {
    const ticket = dbGet('SELECT * FROM tickets WHERE ticket_id = ?', [req.params.ticket_id]);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });
    const notes = dbAll('SELECT * FROM notes WHERE ticket_id = ? ORDER BY created_at ASC', [req.params.ticket_id]);
    res.json({ ...ticket, notes });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// PUT /api/tickets/:ticket_id
app.put('/api/tickets/:ticket_id', (req, res) => {
  try {
    const { status, note, author = 'Support Agent', priority } = req.body;
    const { ticket_id } = req.params;

    const ticket = dbGet('SELECT * FROM tickets WHERE ticket_id = ?', [ticket_id]);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });

    const now = new Date().toISOString();

    if (status) {
      dbRun('UPDATE tickets SET status = ?, updated_at = ? WHERE ticket_id = ?', [status, now, ticket_id]);
    }
    if (priority) {
      dbRun('UPDATE tickets SET priority = ?, updated_at = ? WHERE ticket_id = ?', [priority, now, ticket_id]);
    }
    if (note && note.trim()) {
      dbRun('INSERT INTO notes (ticket_id, note_text, author, created_at) VALUES (?,?,?,?)',
        [ticket_id, note.trim(), author, now]);
    }

    res.json({ success: true, updated_at: now });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// DELETE /api/tickets/:ticket_id
app.delete('/api/tickets/:ticket_id', (req, res) => {
  try {
    const ticket = dbGet('SELECT * FROM tickets WHERE ticket_id = ?', [req.params.ticket_id]);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });
    dbRun('DELETE FROM notes WHERE ticket_id = ?', [req.params.ticket_id]);
    dbRun('DELETE FROM tickets WHERE ticket_id = ?', [req.params.ticket_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Serve frontend SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---- START ----
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`SupportDesk CRM running at http://localhost:${PORT}`);
  });
});
