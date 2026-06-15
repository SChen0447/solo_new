import express, { Request, Response } from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const db = new Database('./data.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    zone TEXT NOT NULL CHECK (zone IN ('A', 'B', 'C')),
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'occupied', 'reserved', 'maintenance'))
  );

  CREATE TABLE IF NOT EXISTS workspace_reservations (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    duration INTEGER NOT NULL,
    member_name TEXT NOT NULL,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
  );

  CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    company TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS visitors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    company TEXT NOT NULL,
    phone TEXT NOT NULL,
    expected_time TEXT NOT NULL,
    member_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'checked_in')),
    qr_code TEXT NOT NULL,
    FOREIGN KEY (member_id) REFERENCES members(id)
  );

  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    room_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('projector', 'whiteboard', 'video_conference')),
    FOREIGN KEY (room_id) REFERENCES rooms(id)
  );

  CREATE TABLE IF NOT EXISTS device_reservations (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL,
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    member_name TEXT NOT NULL,
    FOREIGN KEY (device_id) REFERENCES devices(id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    member_id TEXT NOT NULL,
    message TEXT NOT NULL,
    read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (member_id) REFERENCES members(id)
  );

  CREATE INDEX IF NOT EXISTS idx_wr_date ON workspace_reservations(date);
  CREATE INDEX IF NOT EXISTS idx_wr_workspace ON workspace_reservations(workspace_id);
  CREATE INDEX IF NOT EXISTS idx_visitors_time ON visitors(expected_time);
  CREATE INDEX IF NOT EXISTS idx_dr_date ON device_reservations(date);
  CREATE INDEX IF NOT EXISTS idx_dr_device ON device_reservations(device_id);
`);

const initData = db.transaction(() => {
  const workspaceCount = db.prepare('SELECT COUNT(*) as count FROM workspaces').get() as { count: number };
  if (workspaceCount.count === 0) {
    const insertWorkspace = db.prepare(
      'INSERT INTO workspaces (id, name, zone, x, y, status) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const workspaces = [
      ['ws-001', 'A01', 'A', 50, 50, 'idle'],
      ['ws-002', 'A02', 'A', 150, 50, 'idle'],
      ['ws-003', 'A03', 'A', 250, 50, 'idle'],
      ['ws-004', 'A04', 'A', 350, 50, 'idle'],
      ['ws-005', 'B01', 'B', 50, 200, 'idle'],
      ['ws-006', 'B02', 'B', 150, 200, 'idle'],
      ['ws-007', 'B03', 'B', 250, 200, 'idle'],
      ['ws-008', 'B04', 'B', 350, 200, 'idle'],
      ['ws-009', 'C01', 'C', 50, 350, 'idle'],
      ['ws-010', 'C02', 'C', 150, 350, 'idle'],
      ['ws-011', 'C03', 'C', 250, 350, 'idle'],
      ['ws-012', 'C04', 'C', 350, 350, 'idle'],
    ];
    workspaces.forEach(w => insertWorkspace.run(...w));
  }

  const roomCount = db.prepare('SELECT COUNT(*) as count FROM rooms').get() as { count: number };
  if (roomCount.count === 0) {
    const insertRoom = db.prepare('INSERT INTO rooms (id, name) VALUES (?, ?)');
    [['room-001', '会议室A'], ['room-002', '会议室B'], ['room-003', '会议室C'], ['room-004', '会议室D']].forEach(r => insertRoom.run(...r));
  }

  const deviceCount = db.prepare('SELECT COUNT(*) as count FROM devices').get() as { count: number };
  if (deviceCount.count === 0) {
    const insertDevice = db.prepare('INSERT INTO devices (id, name, room_id, type) VALUES (?, ?, ?, ?)');
    const devices = [
      ['dev-001', '投影仪-A', 'room-001', 'projector'],
      ['dev-002', '白板-A', 'room-001', 'whiteboard'],
      ['dev-003', '视频会议-A', 'room-001', 'video_conference'],
      ['dev-004', '投影仪-B', 'room-002', 'projector'],
      ['dev-005', '白板-B', 'room-002', 'whiteboard'],
      ['dev-006', '视频会议-B', 'room-002', 'video_conference'],
      ['dev-007', '投影仪-C', 'room-003', 'projector'],
      ['dev-008', '白板-C', 'room-003', 'whiteboard'],
      ['dev-009', '视频会议-C', 'room-003', 'video_conference'],
      ['dev-010', '投影仪-D', 'room-004', 'projector'],
      ['dev-011', '白板-D', 'room-004', 'whiteboard'],
      ['dev-012', '视频会议-D', 'room-004', 'video_conference'],
    ];
    devices.forEach(d => insertDevice.run(...d));
  }

  const memberCount = db.prepare('SELECT COUNT(*) as count FROM members').get() as { count: number };
  if (memberCount.count === 0) {
    const insertMember = db.prepare('INSERT INTO members (id, name, company) VALUES (?, ?, ?)');
    [['m-001', '张三', '科技公司A'], ['m-002', '李四', '设计公司B'], ['m-003', '王五', '咨询公司C'], ['m-004', '赵六', '互联网公司D']].forEach(m => insertMember.run(...m));
  }
});

initData();

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function checkWorkspaceConflict(workspaceId: string, date: string, startTime: string, duration: number): boolean {
  const reservations = db.prepare(
    'SELECT start_time, duration FROM workspace_reservations WHERE workspace_id = ? AND date = ?'
  ).all(workspaceId, date) as { start_time: string; duration: number }[];

  const newStart = timeToMinutes(startTime);
  const newEnd = newStart + duration * 60;

  for (const r of reservations) {
    const existStart = timeToMinutes(r.start_time);
    const existEnd = existStart + r.duration * 60;
    if (!(newEnd <= existStart || newStart >= existEnd)) {
      return true;
    }
  }
  return false;
}

function checkDeviceConflict(deviceId: string, date: string, startTime: string, endTime: string): boolean {
  const reservations = db.prepare(
    'SELECT start_time, end_time FROM device_reservations WHERE device_id = ? AND date = ?'
  ).all(deviceId, date) as { start_time: string; end_time: string }[];

  const newStart = timeToMinutes(startTime);
  const newEnd = timeToMinutes(endTime);

  for (const r of reservations) {
    const existStart = timeToMinutes(r.start_time);
    const existEnd = timeToMinutes(r.end_time);
    if (!(newEnd <= existStart || newStart >= existEnd)) {
      return true;
    }
  }
  return false;
}

app.get('/api/workspaces', (req: Request, res: Response) => {
  const workspaces = db.prepare('SELECT * FROM workspaces').all();
  res.json({ success: true, data: workspaces });
});

app.post('/api/workspaces/reserve', (req: Request, res: Response) => {
  const { workspaceId, date, startTime, duration, memberName } = req.body;

  if (duration < 1 || duration > 8) {
    return res.json({ success: false, error: '时长必须在1-8小时之间' });
  }

  if (checkWorkspaceConflict(workspaceId, date, startTime, duration)) {
    return res.json({ success: false, error: '该时段已被预约' });
  }

  const id = uuidv4();
  db.prepare(
    'INSERT INTO workspace_reservations (id, workspace_id, date, start_time, duration, member_name) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, workspaceId, date, startTime, duration, memberName);

  db.prepare("UPDATE workspaces SET status = 'reserved' WHERE id = ?").run(workspaceId);

  res.json({ success: true, data: { id } });
});

app.get('/api/members', (req: Request, res: Response) => {
  const members = db.prepare('SELECT * FROM members').all();
  res.json({ success: true, data: members });
});

app.get('/api/visitors', (req: Request, res: Response) => {
  const visitors = db.prepare(`
    SELECT v.*, m.name as member_name 
    FROM visitors v 
    JOIN members m ON v.member_id = m.id 
    ORDER BY v.expected_time DESC
  `).all();
  res.json({ success: true, data: visitors });
});

app.post('/api/visitors', async (req: Request, res: Response) => {
  const { name, company, phone, expectedTime, memberId } = req.body;

  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(memberId);
  if (!member) {
    return res.json({ success: false, error: '被访人不存在' });
  }

  const id = uuidv4();
  const qrData = `visitor:${id}:${Date.now()}`;
  const qrCode = await QRCode.toDataURL(qrData, { width: 150, margin: 1 });

  db.prepare(
    'INSERT INTO visitors (id, name, company, phone, expected_time, member_id, status, qr_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, name, company, phone, expectedTime, memberId, 'pending', qrCode);

  const notifId = uuidv4();
  const notifMessage = `访客 ${name} (${company}) 将于 ${expectedTime} 到访`;
  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO notifications (id, member_id, message, read, created_at) VALUES (?, ?, ?, 0, ?)'
  ).run(notifId, memberId, notifMessage, now);

  res.json({ success: true, data: { id, qrCode } });
});

app.post('/api/visitors/checkin', (req: Request, res: Response) => {
  const { visitorId } = req.body;

  const visitor = db.prepare('SELECT * FROM visitors WHERE id = ?').get(visitorId);
  if (!visitor) {
    return res.json({ success: false, error: '访客不存在' });
  }

  db.prepare("UPDATE visitors SET status = 'checked_in' WHERE id = ?").run(visitorId);

  res.json({ success: true });
});

app.get('/api/notifications/:memberId', (req: Request, res: Response) => {
  const { memberId } = req.params;
  const notifications = db.prepare(
    'SELECT * FROM notifications WHERE member_id = ? ORDER BY created_at DESC'
  ).all(memberId);
  const unreadCount = db.prepare(
    'SELECT COUNT(*) as count FROM notifications WHERE member_id = ? AND read = 0'
  ).get(memberId) as { count: number };
  res.json({ success: true, data: { notifications, unreadCount: unreadCount.count } });
});

app.post('/api/notifications/read/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  db.prepare('UPDATE notifications SET read = 1 WHERE id = ?').run(id);
  res.json({ success: true });
});

app.get('/api/devices', (req: Request, res: Response) => {
  const date = req.query.date as string || new Date().toISOString().split('T')[0];
  const devices = db.prepare(`
    SELECT d.*, r.name as room_name 
    FROM devices d 
    JOIN rooms r ON d.room_id = r.id
  `).all();

  const reservations = db.prepare(`
    SELECT * FROM device_reservations WHERE date = ?
  `).all(date);

  res.json({ success: true, data: { devices, reservations } });
});

app.post('/api/devices/reserve', (req: Request, res: Response) => {
  const { deviceId, date, startTime, endTime, memberName } = req.body;

  if (checkDeviceConflict(deviceId, date, startTime, endTime)) {
    return res.json({ success: false, error: '该时段已被预约' });
  }

  const id = uuidv4();
  db.prepare(
    'INSERT INTO device_reservations (id, device_id, date, start_time, end_time, member_name) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, deviceId, date, startTime, endTime, memberName);

  res.json({ success: true, data: { id } });
});

app.get('/api/dashboard', (req: Request, res: Response) => {
  const today = new Date().toISOString().split('T')[0];

  const workspaceStats = db.prepare(`
    SELECT 
      (SELECT COUNT(*) FROM workspaces WHERE status IN ('occupied', 'reserved')) as occupied,
      (SELECT COUNT(*) FROM workspaces) as total
  `).get() as { occupied: number; total: number };

  const occupancy = workspaceStats.total > 0 ? Math.round((workspaceStats.occupied / workspaceStats.total) * 100) : 0;

  const visitorStats: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const count = db.prepare(
      "SELECT COUNT(*) as count FROM visitors WHERE DATE(expected_time) = ?"
    ).get(dateStr) as { count: number };
    visitorStats.push({ date: dateStr, count: count.count });
  }

  const deviceRanking = db.prepare(`
    SELECT d.name, COUNT(dr.id) as count
    FROM devices d
    LEFT JOIN device_reservations dr ON d.id = dr.device_id
    GROUP BY d.id
    ORDER BY count DESC
    LIMIT 5
  `).all() as { name: string; count: number }[];

  res.json({
    success: true,
    data: {
      workspaceOccupancy: occupancy,
      visitorStats,
      deviceRanking,
    },
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
