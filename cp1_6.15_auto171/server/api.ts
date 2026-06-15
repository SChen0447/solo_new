import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { db, initDatabase, updateActivityStatuses, getActivityStatus } from './database';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

initDatabase();
updateActivityStatuses();

function getLevel(points: number): string {
  if (points >= 300) return '金卡';
  if (points >= 100) return '银卡';
  return '铜卡';
}

function calculatePoints(amount: number): number {
  return Math.ceil(amount / 10);
}

function getActiveMultiplier(): number {
  updateActivityStatuses();
  const active = db
    .prepare("SELECT multiplier FROM activities WHERE status = '进行中' ORDER BY multiplier DESC LIMIT 1")
    .get() as { multiplier: number } | undefined;
  return active ? active.multiplier : 1;
}

app.get('/api/members', (req, res) => {
  const { phone, name } = req.query;
  let query = 'SELECT * FROM members WHERE 1=1';
  const params: any[] = [];

  if (phone) {
    query += ' AND phone LIKE ?';
    params.push(`%${phone}%`);
  }
  if (name) {
    query += ' AND name LIKE ?';
    params.push(`%${name}%`);
  }

  query += ' ORDER BY createdAt DESC';
  const members = db.prepare(query).all(...params);
  res.json(members);
});

app.get('/api/members/:id', (req, res) => {
  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id);
  if (!member) {
    return res.status(404).json({ error: '会员不存在' });
  }
  res.json(member);
});

app.post('/api/members', (req, res) => {
  const { phone, name } = req.body;
  if (!phone || !name) {
    return res.status(400).json({ error: '手机号和姓名不能为空' });
  }

  const existing = db.prepare('SELECT * FROM members WHERE phone = ?').get(phone);
  if (existing) {
    return res.status(409).json({ error: '该手机号已注册', member: existing });
  }

  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO members (id, phone, name, totalPoints, level, createdAt) VALUES (?, ?, ?, 0, ?, ?)'
  ).run(id, phone, name, '铜卡', now);

  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(id);
  res.status(201).json(member);
});

app.post('/api/members/consume', (req, res) => {
  const { memberId, amount } = req.body;
  if (!memberId || !amount || amount <= 0) {
    return res.status(400).json({ error: '参数错误' });
  }

  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(memberId) as any;
  if (!member) {
    return res.status(404).json({ error: '会员不存在' });
  }

  const basePoints = calculatePoints(amount);
  const multiplier = getActiveMultiplier();
  const finalPoints = basePoints * multiplier;
  const oldLevel = member.level;
  const newTotal = member.totalPoints + finalPoints;
  const newLevel = getLevel(newTotal);
  const levelChanged = oldLevel !== newLevel;

  const tx = db.transaction(() => {
    db.prepare('UPDATE members SET totalPoints = ?, level = ? WHERE id = ?').run(
      newTotal,
      newLevel,
      memberId
    );

    const recordId = uuidv4();
    const now = new Date().toISOString();
    let note = `消费¥${amount}`;
    if (multiplier > 1) {
      note += `（活动${multiplier}倍）`;
    }

    db.prepare(
      'INSERT INTO pointsRecords (id, memberId, changeType, changeAmount, balanceAfter, note, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(recordId, memberId, '消费', finalPoints, newTotal, note, now);
  });

  try {
    tx();
  } catch (e) {
    return res.status(500).json({ error: '记录失败' });
  }

  const updated = db.prepare('SELECT * FROM members WHERE id = ?').get(memberId);
  res.json({
    member: updated,
    pointsAdded: finalPoints,
    basePoints,
    multiplier,
    levelChanged,
    oldLevel,
    newLevel,
  });
});

app.get('/api/gifts', (req, res) => {
  const gifts = db.prepare('SELECT * FROM gifts ORDER BY requiredPoints ASC').all();
  res.json(gifts);
});

app.post('/api/gifts', (req, res) => {
  const { name, requiredPoints, stock, imageUrl } = req.body;
  if (!name || requiredPoints == null || stock == null) {
    return res.status(400).json({ error: '参数不完整' });
  }

  const id = uuidv4();
  db.prepare(
    'INSERT INTO gifts (id, name, requiredPoints, stock, imageUrl) VALUES (?, ?, ?, ?, ?)'
  ).run(id, name, requiredPoints, stock, imageUrl || '🎁');

  const gift = db.prepare('SELECT * FROM gifts WHERE id = ?').get(id);
  res.status(201).json(gift);
});

app.post('/api/gifts/redeem', (req, res) => {
  const { memberId, giftId } = req.body;
  if (!memberId || !giftId) {
    return res.status(400).json({ error: '参数错误' });
  }

  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(memberId) as any;
  const gift = db.prepare('SELECT * FROM gifts WHERE id = ?').get(giftId) as any;

  if (!member) return res.status(404).json({ error: '会员不存在' });
  if (!gift) return res.status(404).json({ error: '礼品不存在' });
  if (gift.stock <= 0) return res.status(400).json({ error: '库存不足' });
  if (member.totalPoints < gift.requiredPoints) {
    return res.status(400).json({ error: '积分不足' });
  }

  const newPoints = member.totalPoints - gift.requiredPoints;
  const newLevel = getLevel(newPoints);
  const oldLevel = member.level;
  const levelChanged = oldLevel !== newLevel;

  const tx = db.transaction(() => {
    db.prepare('UPDATE members SET totalPoints = ?, level = ? WHERE id = ?').run(
      newPoints,
      newLevel,
      memberId
    );

    db.prepare('UPDATE gifts SET stock = stock - 1 WHERE id = ?').run(giftId);

    const exchangeId = uuidv4();
    const now = new Date().toISOString();
    db.prepare(
      'INSERT INTO exchangeRecords (id, memberId, giftId, pointsCost, createdAt) VALUES (?, ?, ?, ?, ?)'
    ).run(exchangeId, memberId, giftId, gift.requiredPoints, now);

    const recordId = uuidv4();
    db.prepare(
      'INSERT INTO pointsRecords (id, memberId, changeType, changeAmount, balanceAfter, note, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(
      recordId,
      memberId,
      '兑换',
      -gift.requiredPoints,
      newPoints,
      `兑换：${gift.name}`,
      now
    );
  });

  try {
    tx();
  } catch (e) {
    return res.status(500).json({ error: '兑换失败' });
  }

  const updatedMember = db.prepare('SELECT * FROM members WHERE id = ?').get(memberId);
  const updatedGift = db.prepare('SELECT * FROM gifts WHERE id = ?').get(giftId);
  res.json({
    member: updatedMember,
    gift: updatedGift,
    pointsCost: gift.requiredPoints,
    levelChanged,
    oldLevel,
    newLevel,
  });
});

app.get('/api/activities', (req, res) => {
  updateActivityStatuses();
  const activities = db.prepare('SELECT * FROM activities ORDER BY startDate DESC').all();
  res.json(activities);
});

app.post('/api/activities', (req, res) => {
  const { name, startDate, endDate, multiplier } = req.body;
  if (!name || !startDate || !endDate || !multiplier) {
    return res.status(400).json({ error: '参数不完整' });
  }

  const id = uuidv4();
  const status = getActivityStatus(startDate, endDate);
  db.prepare(
    'INSERT INTO activities (id, name, startDate, endDate, multiplier, status) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, name, startDate, endDate, multiplier, status);

  const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(id);
  res.status(201).json(activity);
});

app.delete('/api/activities/:id', (req, res) => {
  const result = db.prepare('DELETE FROM activities WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: '活动不存在' });
  }
  res.json({ success: true });
});

app.get('/api/points-records/:memberId', (req, res) => {
  const { memberId } = req.params;
  const { month, page = '1', pageSize = '10' } = req.query;

  let query = 'SELECT * FROM pointsRecords WHERE memberId = ?';
  const countQuery = 'SELECT COUNT(*) as total FROM pointsRecords WHERE memberId = ?';
  const params: any[] = [memberId];
  const countParams: any[] = [memberId];

  if (month) {
    query += ' AND strftime("%Y-%m", createdAt) = ?';
    countQuery += ' AND strftime("%Y-%m", createdAt) = ?';
    params.push(month);
    countParams.push(month);
  }

  query += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
  const p = parseInt(page as string, 10);
  const ps = parseInt(pageSize as string, 10);
  params.push(ps, (p - 1) * ps);

  const records = db.prepare(query).all(...params);
  const { total } = db.prepare(countQuery).get(...countParams) as { total: number };

  res.json({
    records,
    pagination: {
      page: p,
      pageSize: ps,
      total,
      totalPages: Math.ceil(total / ps),
    },
  });
});

app.get('/api/exchange-records/:memberId', (req, res) => {
  const records = db
    .prepare(
      `SELECT er.*, g.name as giftName, g.imageUrl as giftImage 
       FROM exchangeRecords er 
       JOIN gifts g ON er.giftId = g.id 
       WHERE er.memberId = ? 
       ORDER BY er.createdAt DESC`
    )
    .all(req.params.id);
  res.json(records);
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`☕ 咖啡馆积分系统后端 API 已启动: http://localhost:${PORT}`);
});
