import Database from 'better-sqlite3';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const dbPath = path.join(__dirname, '..', 'cafe.db');
export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      phone TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      totalPoints INTEGER NOT NULL DEFAULT 0,
      level TEXT NOT NULL DEFAULT '铜卡',
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pointsRecords (
      id TEXT PRIMARY KEY,
      memberId TEXT NOT NULL,
      changeType TEXT NOT NULL,
      changeAmount INTEGER NOT NULL,
      balanceAfter INTEGER NOT NULL,
      note TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (memberId) REFERENCES members(id)
    );

    CREATE TABLE IF NOT EXISTS gifts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      requiredPoints INTEGER NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      imageUrl TEXT
    );

    CREATE TABLE IF NOT EXISTS exchangeRecords (
      id TEXT PRIMARY KEY,
      memberId TEXT NOT NULL,
      giftId TEXT NOT NULL,
      pointsCost INTEGER NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (memberId) REFERENCES members(id),
      FOREIGN KEY (giftId) REFERENCES gifts(id)
    );

    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      startDate TEXT NOT NULL,
      endDate TEXT NOT NULL,
      multiplier INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT '未开始'
    );
  `);

  seedData();
}

function getLevel(points: number): string {
  if (points >= 300) return '金卡';
  if (points >= 100) return '银卡';
  return '铜卡';
}

function seedData() {
  const memberCount = db.prepare('SELECT COUNT(*) as count FROM members').get() as { count: number };
  if (memberCount.count === 0) {
    const now = new Date().toISOString();
    const insertMember = db.prepare(
      'INSERT INTO members (id, phone, name, totalPoints, level, createdAt) VALUES (?, ?, ?, ?, ?, ?)'
    );

    const members = [
      { phone: '13800138001', name: '张三', points: 50 },
      { phone: '13800138002', name: '李四', points: 150 },
      { phone: '13800138003', name: '王五', points: 350 },
    ];

    members.forEach((m) => {
      const id = uuidv4();
      insertMember.run(id, m.phone, m.name, m.points, getLevel(m.points), now);
    });
  }

  const giftCount = db.prepare('SELECT COUNT(*) as count FROM gifts').get() as { count: number };
  if (giftCount.count === 0) {
    const insertGift = db.prepare(
      'INSERT INTO gifts (id, name, requiredPoints, stock, imageUrl) VALUES (?, ?, ?, ?, ?)'
    );

    const gifts = [
      { name: '美式咖啡兑换券', points: 50, stock: 20, img: '☕' },
      { name: '拿铁兑换券', points: 80, stock: 15, img: '🥛' },
      { name: '提拉米苏蛋糕', points: 120, stock: 8, img: '🍰' },
      { name: '手冲精品豆（200g）', points: 200, stock: 5, img: '🫘' },
      { name: '马克杯', points: 150, stock: 2, img: '🍵' },
      { name: '法压壶', points: 300, stock: 3, img: '🫖' },
    ];

    gifts.forEach((g) => {
      insertGift.run(uuidv4(), g.name, g.points, g.stock, g.img);
    });
  }

  const activityCount = db.prepare('SELECT COUNT(*) as count FROM activities').get() as { count: number };
  if (activityCount.count === 0) {
    const now = new Date();
    const insertActivity = db.prepare(
      'INSERT INTO activities (id, name, startDate, endDate, multiplier, status) VALUES (?, ?, ?, ?, ?, ?)'
    );

    const weekendStart = new Date(now);
    weekendStart.setDate(now.getDate() + ((6 - now.getDay() + 7) % 7));
    const weekendEnd = new Date(weekendStart);
    weekendEnd.setDate(weekendEnd.getDate() + 1);

    const birthdayStart = new Date(now);
    birthdayStart.setDate(1);
    const birthdayEnd = new Date(now);
    birthdayEnd.setMonth(birthdayEnd.getMonth() + 1);
    birthdayEnd.setDate(0);

    const pastStart = new Date(now);
    pastStart.setDate(now.getDate() - 10);
    const pastEnd = new Date(now);
    pastEnd.setDate(now.getDate() - 5);

    const activities = [
      {
        name: '周末双倍积分',
        start: weekendStart.toISOString().slice(0, 10),
        end: weekendEnd.toISOString().slice(0, 10),
        multiplier: 2,
      },
      {
        name: '生日月三倍积分',
        start: birthdayStart.toISOString().slice(0, 10),
        end: birthdayEnd.toISOString().slice(0, 10),
        multiplier: 3,
      },
      {
        name: '开业特惠',
        start: pastStart.toISOString().slice(0, 10),
        end: pastEnd.toISOString().slice(0, 10),
        multiplier: 2,
      },
    ];

    activities.forEach((a) => {
      const status = getActivityStatus(a.start, a.end);
      insertActivity.run(uuidv4(), a.name, a.start, a.end, a.multiplier, status);
    });
  }
}

export function getActivityStatus(startDate: string, endDate: string): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  if (now < start) return '未开始';
  if (now > end) return '已结束';
  return '进行中';
}

export function updateActivityStatuses() {
  const activities = db.prepare('SELECT id, startDate, endDate FROM activities').all() as Array<{
    id: string;
    startDate: string;
    endDate: string;
  }>;

  const updateStmt = db.prepare('UPDATE activities SET status = ? WHERE id = ?');
  activities.forEach((a) => {
    const status = getActivityStatus(a.startDate, a.endDate);
    updateStmt.run(status, a.id);
  });
}
