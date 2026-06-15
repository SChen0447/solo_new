import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../../workshop.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS time_slots (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      time_start TEXT NOT NULL,
      time_end TEXT NOT NULL,
      capacity INTEGER DEFAULT 2,
      booked_count INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      customer_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      project_type TEXT NOT NULL,
      description TEXT,
      time_slot TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_orders_time_slot ON orders(time_slot);
    CREATE INDEX IF NOT EXISTS idx_time_slots_date ON time_slots(date);
  `);

  const count = db.prepare('SELECT COUNT(*) as count FROM time_slots').get() as { count: number };
  if (count.count === 0) {
    seedTimeSlots();
  }
}

function seedTimeSlots() {
  const insertSlot = db.prepare(`
    INSERT INTO time_slots (id, date, time_start, time_end, capacity, booked_count)
    VALUES (?, ?, ?, ?, 2, 0)
  `);

  const morningSlots = [
    ['09:00', '09:30'],
    ['09:30', '10:00'],
    ['10:00', '10:30'],
    ['10:30', '11:00'],
    ['11:00', '11:30'],
    ['11:30', '12:00'],
  ];

  const afternoonSlots = [
    ['13:00', '13:30'],
    ['13:30', '14:00'],
    ['14:00', '14:30'],
    ['14:30', '15:00'],
    ['15:00', '15:30'],
    ['15:30', '16:00'],
    ['16:00', '16:30'],
    ['16:30', '17:00'],
    ['17:00', '17:30'],
    ['17:30', '18:00'],
  ];

  const allSlots = [...morningSlots, ...afternoonSlots];

  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    for (const [start, end] of allSlots) {
      const id = uuidv4();
      insertSlot.run(id, dateStr, start, end);
    }
  }
}

export function getTimeSlotsByDate(date: string) {
  const slots = db.prepare(`
    SELECT ts.*, 
      (SELECT COUNT(*) FROM orders o 
       WHERE o.time_slot = (ts.date || ' ' || ts.time_start) 
       AND o.status != 'cancelled') as actual_booked
    FROM time_slots ts
    WHERE ts.date = ?
    ORDER BY ts.time_start
  `).all(date) as Array<{
    id: string;
    date: string;
    time_start: string;
    time_end: string;
    capacity: number;
    booked_count: number;
    actual_booked: number;
  }>;

  return slots.map(slot => ({
    ...slot,
    booked_count: slot.actual_booked,
  }));
}

export function createOrder(order: {
  customer_name: string;
  phone: string;
  project_type: string;
  description?: string;
  time_slot: string;
}) {
  const id = uuidv4();
  const stmt = db.prepare(`
    INSERT INTO orders (id, customer_name, phone, project_type, description, time_slot, status)
    VALUES (?, ?, ?, ?, ?, ?, 'pending')
  `);
  stmt.run(id, order.customer_name, order.phone, order.project_type, order.description || null, order.time_slot);
  return getOrderById(id);
}

export function getOrderById(id: string) {
  return db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
}

export function getAllOrders(status?: string) {
  if (status) {
    return db.prepare('SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC').all(status);
  }
  return db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
}

export function updateOrderStatus(id: string, status: string) {
  const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw new Error('无效的状态值');
  }
  
  const stmt = db.prepare('UPDATE orders SET status = ? WHERE id = ?');
  const result = stmt.run(status, id);
  if (result.changes === 0) {
    return null;
  }
  return getOrderById(id);
}

export function getStats() {
  const today = new Date().toISOString().split('T')[0];
  
  const todayCount = db.prepare(`
    SELECT COUNT(*) as count FROM orders 
    WHERE date(time_slot) = ?
  `).get(today) as { count: number };

  const pendingCount = db.prepare(`
    SELECT COUNT(*) as count FROM orders 
    WHERE status = 'pending'
  `).get() as { count: number };

  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartStr = monthStart.toISOString().split('T')[0];
  
  const completedThisMonth = db.prepare(`
    SELECT COUNT(*) as count FROM orders 
    WHERE status = 'completed' AND date(created_at) >= ?
  `).get(monthStartStr) as { count: number };

  const projectStats = db.prepare(`
    SELECT project_type, COUNT(*) as count 
    FROM orders 
    GROUP BY project_type
  `).all() as Array<{ project_type: string; count: number }>;

  return {
    todayCount: todayCount.count,
    pendingCount: pendingCount.count,
    completedThisMonth: completedThisMonth.count,
    projectStats,
  };
}

export default db;
