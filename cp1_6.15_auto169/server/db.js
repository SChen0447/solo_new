const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(__dirname, 'tools.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS tools (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    qr_code_url TEXT,
    status TEXT DEFAULT 'available',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS reservations (
    id TEXT PRIMARY KEY,
    tool_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    reservation_date TEXT NOT NULL,
    time_slot TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    notified INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tool_id) REFERENCES tools(id)
  );

  CREATE TABLE IF NOT EXISTS borrow_records (
    id TEXT PRIMARY KEY,
    tool_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    borrow_time DATETIME,
    return_time DATETIME,
    status TEXT DEFAULT 'borrowed',
    FOREIGN KEY (tool_id) REFERENCES tools(id)
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user'
  );
`);

const initAdmin = db.prepare("SELECT * FROM users WHERE username = 'admin'");
if (!initAdmin.get()) {
  const insertAdmin = db.prepare("INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)");
  insertAdmin.run(uuidv4(), 'admin', 'admin123', 'admin');
}

const sampleTools = [
  { id: uuidv4(), name: '电钻', category: '电动', description: '大功率充电式电钻，适用于家庭装修', image_url: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400', status: 'available' },
  { id: uuidv4(), name: '螺丝刀套装', category: '手动', description: '精密螺丝刀套装，含多种规格', image_url: 'https://images.unsplash.com/photo-1581783898377-1c85bf937427?w=400', status: 'available' },
  { id: uuidv4(), name: '草坪修剪机', category: '园林', description: '电动草坪修剪机，操作简便', image_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', status: 'available' },
  { id: uuidv4(), name: '高压水枪', category: '清洁', description: '高压清洗水枪，适合清洗车辆和外墙', image_url: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400', status: 'available' },
  { id: uuidv4(), name: '电锯', category: '电动', description: '便携式电锯，适用于木材切割', image_url: 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=400', status: 'borrowed' },
  { id: uuidv4(), name: '扳手组', category: '手动', description: '套筒扳手组，汽车维修必备', image_url: 'https://images.unsplash.com/photo-1530124566582-a46bfe6c8b28?w=400', status: 'maintenance' },
];

const checkTools = db.prepare("SELECT COUNT(*) as count FROM tools");
if (checkTools.get().count === 0) {
  const insertTool = db.prepare("INSERT INTO tools (id, name, category, description, image_url, status) VALUES (?, ?, ?, ?, ?, ?)");
  sampleTools.forEach(tool => {
    insertTool.run(tool.id, tool.name, tool.category, tool.description, tool.image_url, tool.status);
  });
}

const toolQueries = {
  getAll: (category, search) => {
    let query = "SELECT * FROM tools WHERE 1=1";
    const params = [];
    if (category) {
      query += " AND category = ?";
      params.push(category);
    }
    if (search) {
      query += " AND (name LIKE ? OR description LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }
    return db.prepare(query).all(...params);
  },
  getById: (id) => db.prepare("SELECT * FROM tools WHERE id = ?").get(id),
  create: (tool) => {
    const id = uuidv4();
    db.prepare("INSERT INTO tools (id, name, category, description, image_url, qr_code_url, status) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(id, tool.name, tool.category, tool.description, tool.image_url, tool.qr_code_url, 'available');
    return id;
  },
  update: (id, tool) => {
    db.prepare("UPDATE tools SET name = ?, category = ?, description = ?, image_url = ?, status = ? WHERE id = ?")
      .run(tool.name, tool.category, tool.description, tool.image_url, tool.status, id);
  },
  updateStatus: (id, status) => {
    db.prepare("UPDATE tools SET status = ? WHERE id = ?").run(status, id);
  },
  updateQrCode: (id, qrCodeUrl) => {
    db.prepare("UPDATE tools SET qr_code_url = ? WHERE id = ?").run(qrCodeUrl, id);
  },
  delete: (id) => {
    db.prepare("DELETE FROM tools WHERE id = ?").run(id);
  }
};

const reservationQueries = {
  getAll: (status) => {
    let query = `
      SELECT r.*, t.name as tool_name 
      FROM reservations r 
      JOIN tools t ON r.tool_id = t.id
    `;
    if (status) {
      query += " WHERE r.status = ?";
      return db.prepare(query).all(status);
    }
    query += " ORDER BY r.reservation_date DESC, r.created_at DESC";
    return db.prepare(query).all();
  },
  getByToolId: (toolId) => {
    return db.prepare("SELECT * FROM reservations WHERE tool_id = ? AND status = 'pending'").all(toolId);
  },
  getByUser: (userName) => {
    return db.prepare(`
      SELECT r.*, t.name as tool_name 
      FROM reservations r 
      JOIN tools t ON r.tool_id = t.id 
      WHERE r.user_name = ? 
      ORDER BY r.reservation_date DESC
    `).all(userName);
  },
  getUpcoming: (userName, minutesBefore = 30) => {
    const now = new Date();
    const threshold = new Date(now.getTime() + minutesBefore * 60000);
    return db.prepare(`
      SELECT r.*, t.name as tool_name 
      FROM reservations r 
      JOIN tools t ON r.tool_id = t.id 
      WHERE r.user_name = ? AND r.status = 'pending'
      AND r.notified = 0
    `).all(userName).filter(r => {
      const reservationTime = new Date(`${r.reservation_date}T${r.time_slot.split('-')[0]}:00`);
      return reservationTime <= threshold && reservationTime > now;
    });
  },
  markNotified: (id) => {
    db.prepare("UPDATE reservations SET notified = 1 WHERE id = ?").run(id);
  },
  checkConflict: (toolId, date, timeSlot) => {
    return db.prepare("SELECT * FROM reservations WHERE tool_id = ? AND reservation_date = ? AND time_slot = ? AND status = 'pending'")
      .get(toolId, date, timeSlot);
  },
  create: (reservation) => {
    const id = uuidv4();
    db.prepare("INSERT INTO reservations (id, tool_id, user_name, reservation_date, time_slot, status) VALUES (?, ?, ?, ?, ?, 'pending')")
      .run(id, reservation.tool_id, reservation.user_name, reservation.date, reservation.time_slot);
    return id;
  },
  updateStatus: (id, status) => {
    db.prepare("UPDATE reservations SET status = ? WHERE id = ?").run(status, id);
  }
};

const borrowQueries = {
  getAll: () => {
    return db.prepare(`
      SELECT b.*, t.name as tool_name 
      FROM borrow_records b 
      JOIN tools t ON b.tool_id = t.id 
      ORDER BY b.borrow_time DESC
    `).all();
  },
  getActiveByToolId: (toolId) => {
    return db.prepare("SELECT * FROM borrow_records WHERE tool_id = ? AND status = 'borrowed'").get(toolId);
  },
  create: (record) => {
    const id = uuidv4();
    db.prepare("INSERT INTO borrow_records (id, tool_id, user_name, borrow_time, status) VALUES (?, ?, ?, CURRENT_TIMESTAMP, 'borrowed')")
      .run(id, record.tool_id, record.user_name);
    return id;
  },
  returnTool: (id) => {
    db.prepare("UPDATE borrow_records SET return_time = CURRENT_TIMESTAMP, status = 'returned' WHERE id = ?").run(id);
  },
  getStats: () => {
    const totalBorrows = db.prepare("SELECT COUNT(*) as count FROM borrow_records").get().count;
    const currentBorrows = db.prepare("SELECT COUNT(*) as count FROM borrow_records WHERE status = 'borrowed'").get().count;
    const popularTools = db.prepare(`
      SELECT t.name, COUNT(b.id) as borrow_count 
      FROM borrow_records b 
      JOIN tools t ON b.tool_id = t.id 
      GROUP BY b.tool_id 
      ORDER BY borrow_count DESC 
      LIMIT 5
    `).all();
    return { totalBorrows, currentBorrows, popularTools };
  }
};

const userQueries = {
  login: (username, password) => {
    return db.prepare("SELECT * FROM users WHERE username = ? AND password = ?").get(username, password);
  }
};

module.exports = {
  db,
  toolQueries,
  reservationQueries,
  borrowQueries,
  userQueries
};
