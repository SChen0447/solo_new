import express from 'express';
import cors from 'cors';
import { readDatabase, writeDatabase, generateId, ensureBudgetForTour } from './utils/fileStorage';
import type { Tour, Show, ShowStatus, Expense, Category, Member, MemberRole, ShowStats } from '../shared/types';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/tours', (_req, res) => {
  const db = readDatabase();
  res.json(db.tours);
});

app.post('/api/tours', (req, res) => {
  const { name, startDate, endDate, venueCount } = req.body;
  if (!name || !startDate || !endDate) {
    return res.status(400).json({ error: '必填字段缺失' });
  }
  const db = readDatabase();
  const newTour: Tour = {
    id: generateId('tour'),
    name,
    startDate,
    endDate,
    venueCount: venueCount || 0,
    createdAt: new Date().toISOString(),
  };
  db.tours.push(newTour);
  ensureBudgetForTour(db, newTour.id);
  writeDatabase(db);
  res.status(201).json(newTour);
});

app.put('/api/tours/:id', (req, res) => {
  const { id } = req.params;
  const db = readDatabase();
  const index = db.tours.findIndex((t) => t.id === id);
  if (index === -1) {
    return res.status(404).json({ error: '巡演不存在' });
  }
  db.tours[index] = { ...db.tours[index], ...req.body, id };
  writeDatabase(db);
  res.json(db.tours[index]);
});

app.delete('/api/tours/:id', (req, res) => {
  const { id } = req.params;
  const db = readDatabase();
  db.tours = db.tours.filter((t) => t.id !== id);
  db.shows = db.shows.filter((s) => s.tourId !== id);
  db.members = db.members.filter((m) => m.tourId !== id);
  delete db.budget[id];
  writeDatabase(db);
  res.json({ success: true });
});

app.get('/api/tours/:tourId/shows', (req, res) => {
  const { tourId } = req.params;
  const db = readDatabase();
  const shows = db.shows.filter((s) => s.tourId === tourId);
  res.json(shows);
});

app.post('/api/tours/:tourId/shows', (req, res) => {
  const { tourId } = req.params;
  const { venue, date, time, ticketPrice, contactName, contactPhone, status } = req.body;
  if (!venue || !date) {
    return res.status(400).json({ error: '场地和日期必填' });
  }
  const db = readDatabase();
  const newShow: Show = {
    id: generateId('show'),
    tourId,
    venue,
    date,
    time: time || '20:00',
    ticketPrice: ticketPrice || 0,
    contactName: contactName || '',
    contactPhone: contactPhone || '',
    status: (status as ShowStatus) || 'pending',
  };
  db.shows.push(newShow);
  writeDatabase(db);
  res.status(201).json(newShow);
});

app.put('/api/shows/:id', (req, res) => {
  const { id } = req.params;
  const db = readDatabase();
  const index = db.shows.findIndex((s) => s.id === id);
  if (index === -1) {
    return res.status(404).json({ error: '演出不存在' });
  }
  db.shows[index] = { ...db.shows[index], ...req.body, id };
  writeDatabase(db);
  res.json(db.shows[index]);
});

app.delete('/api/shows/:id', (req, res) => {
  const { id } = req.params;
  const db = readDatabase();
  db.shows = db.shows.filter((s) => s.id !== id);
  writeDatabase(db);
  res.json({ success: true });
});

app.put('/api/shows/:id/stats', (req, res) => {
  const { id } = req.params;
  const { audience, merchandise, equipmentIssues } = req.body;
  const db = readDatabase();
  const index = db.shows.findIndex((s) => s.id === id);
  if (index === -1) {
    return res.status(404).json({ error: '演出不存在' });
  }
  const stats: ShowStats = {
    audience: audience || 0,
    merchandise: merchandise || [],
    equipmentIssues: equipmentIssues || 0,
  };
  db.shows[index].stats = stats;
  writeDatabase(db);
  res.json(stats);
});

app.get('/api/tours/:tourId/budget', (req, res) => {
  const { tourId } = req.params;
  const db = readDatabase();
  const budget = ensureBudgetForTour(db, tourId);
  writeDatabase(db);
  res.json(budget);
});

app.put('/api/tours/:tourId/budget', (req, res) => {
  const { tourId } = req.params;
  const { totalBudget, categoryBudgets } = req.body;
  const db = readDatabase();
  const budget = ensureBudgetForTour(db, tourId);
  if (totalBudget !== undefined) budget.totalBudget = totalBudget;
  if (categoryBudgets) budget.categoryBudgets = { ...budget.categoryBudgets, ...categoryBudgets };
  writeDatabase(db);
  res.json(budget);
});

app.post('/api/tours/:tourId/expenses', (req, res) => {
  const { tourId } = req.params;
  const { category, amount, description, date } = req.body;
  if (!category || !amount) {
    return res.status(400).json({ error: '分类和金额必填' });
  }
  const db = readDatabase();
  const budget = ensureBudgetForTour(db, tourId);
  const newExpense: Expense = {
    id: generateId('exp'),
    category: category as Category,
    amount: Number(amount),
    description: description || '',
    date: date || new Date().toISOString().slice(0, 10),
  };
  budget.expenses.push(newExpense);
  writeDatabase(db);
  res.status(201).json(newExpense);
});

app.put('/api/expenses/:id', (req, res) => {
  const { id } = req.params;
  const db = readDatabase();
  let found = false;
  for (const tourId of Object.keys(db.budget)) {
    const budget = db.budget[tourId];
    const idx = budget.expenses.findIndex((e) => e.id === id);
    if (idx !== -1) {
      budget.expenses[idx] = { ...budget.expenses[idx], ...req.body, id };
      found = true;
      writeDatabase(db);
      res.json(budget.expenses[idx]);
      break;
    }
  }
  if (!found) {
    res.status(404).json({ error: '支出记录不存在' });
  }
});

app.delete('/api/expenses/:id', (req, res) => {
  const { id } = req.params;
  const db = readDatabase();
  let found = false;
  for (const tourId of Object.keys(db.budget)) {
    const budget = db.budget[tourId];
    const len = budget.expenses.length;
    budget.expenses = budget.expenses.filter((e) => e.id !== id);
    if (budget.expenses.length < len) {
      found = true;
      break;
    }
  }
  if (!found) {
    return res.status(404).json({ error: '支出记录不存在' });
  }
  writeDatabase(db);
  res.json({ success: true });
});

app.get('/api/tours/:tourId/members', (req, res) => {
  const { tourId } = req.params;
  const db = readDatabase();
  const members = db.members.filter((m) => m.tourId === tourId);
  res.json(members);
});

app.post('/api/tours/:tourId/members/invite', (req, res) => {
  const { tourId } = req.params;
  const { email, role, name } = req.body;
  if (!email || !role) {
    return res.status(400).json({ error: '邮箱和角色必填' });
  }
  const db = readDatabase();
  const avatarChars = ['🎵', '🎹', '🎷', '🎺', '🎸', '🥁', '🎤', '🎧'];
  const newMember: Member = {
    id: generateId('member'),
    tourId,
    email,
    name: name || email.split('@')[0],
    role: role as MemberRole,
    online: false,
    avatar: avatarChars[Math.floor(Math.random() * avatarChars.length)],
  };
  db.members.push(newMember);
  writeDatabase(db);
  res.json({ inviteToken: `invite-${newMember.id}-${Date.now()}`, member: newMember });
});

app.listen(PORT, () => {
  console.log(`TourManager API server running on http://localhost:${PORT}`);
});
