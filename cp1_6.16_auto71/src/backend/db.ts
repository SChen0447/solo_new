import Database from 'better-sqlite3';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export type Category = 'feature' | 'bug' | 'ux' | 'other';
export type Status = 'pending' | 'processing' | 'completed';

export interface Feedback {
  id: string;
  title: string;
  description: string;
  category: Category;
  status: Status;
  votes: number;
  created_at: string;
}

const dbPath = path.join(__dirname, '..', '..', 'feedback.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS feedbacks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    votes INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    feedback_id TEXT NOT NULL,
    voter_id TEXT NOT NULL,
    vote_date TEXT NOT NULL,
    UNIQUE(feedback_id, voter_id, vote_date),
    FOREIGN KEY (feedback_id) REFERENCES feedbacks(id)
  );
`);

export interface FeedbackQuery {
  category?: Category | 'all';
  status?: Status | 'all';
  page?: number;
  pageSize?: number;
}

export function getFeedbacks(query: FeedbackQuery = {}) {
  const { category = 'all', status = 'all', page = 1, pageSize = 10 } = query;
  
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (category !== 'all') {
    conditions.push('category = ?');
    params.push(category);
  }
  if (status !== 'all') {
    conditions.push('status = ?');
    params.push(status);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * pageSize;

  const countStmt = db.prepare(`SELECT COUNT(*) as total FROM feedbacks ${whereClause}`);
  const countResult = countStmt.get(...params) as { total: number };

  const listStmt = db.prepare(`
    SELECT * FROM feedbacks ${whereClause}
    ORDER BY votes DESC, created_at DESC
    LIMIT ? OFFSET ?
  `);
  const feedbacks = listStmt.all(...params, pageSize, offset) as Feedback[];

  return {
    feedbacks,
    total: countResult.total,
    page,
    pageSize,
    totalPages: Math.ceil(countResult.total / pageSize)
  };
}

export function createFeedback(data: Omit<Feedback, 'id' | 'status' | 'votes' | 'created_at'>) {
  const id = uuidv4();
  const createdAt = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO feedbacks (id, title, description, category, status, votes, created_at)
    VALUES (?, ?, ?, ?, 'pending', 0, ?)
  `);
  stmt.run(id, data.title, data.description, data.category, createdAt);

  return getFeedbackById(id);
}

export function getFeedbackById(id: string) {
  const stmt = db.prepare('SELECT * FROM feedbacks WHERE id = ?');
  return stmt.get(id) as Feedback | undefined;
}

export function voteFeedback(feedbackId: string, voterId: string): { success: boolean; votes?: number; message?: string } {
  const today = new Date().toISOString().split('T')[0];
  
  const checkVoteStmt = db.prepare(`
    SELECT COUNT(*) as count FROM votes
    WHERE feedback_id = ? AND voter_id = ? AND vote_date = ?
  `);
  const voteResult = checkVoteStmt.get(feedbackId, voterId, today) as { count: number };

  if (voteResult.count > 0) {
    return { success: false, message: '今日已对该反馈投票' };
  }

  const tx = db.transaction(() => {
    const voteStmt = db.prepare(`
      INSERT INTO votes (feedback_id, voter_id, vote_date)
      VALUES (?, ?, ?)
    `);
    voteStmt.run(feedbackId, voterId, today);

    const updateStmt = db.prepare(`
      UPDATE feedbacks SET votes = votes + 1 WHERE id = ?
    `);
    updateStmt.run(feedbackId);

    const feedback = getFeedbackById(feedbackId);
    return feedback?.votes;
  });

  const votes = tx();
  return { success: true, votes };
}

export function updateFeedbackStatus(id: string, status: Status) {
  const stmt = db.prepare('UPDATE feedbacks SET status = ? WHERE id = ?');
  stmt.run(status, id);
  return getFeedbackById(id);
}

export function getCategoryStats() {
  const stmt = db.prepare(`
    SELECT category, COUNT(*) as count FROM feedbacks
    GROUP BY category
  `);
  const rows = stmt.all() as { category: string; count: number }[];
  const result: Record<string, number> = { feature: 0, bug: 0, ux: 0, other: 0 };
  rows.forEach(row => {
    result[row.category] = row.count;
  });
  return result;
}

export function getDailyTrendStats(days: number = 7) {
  const stmt = db.prepare(`
    SELECT date(created_at) as date, COUNT(*) as count
    FROM feedbacks
    WHERE date(created_at) >= date('now', ?)
    GROUP BY date(created_at)
    ORDER BY date(created_at) ASC
  `);
  const rows = stmt.all(`-${days - 1} days`) as { date: string; count: number }[];
  
  const result: { date: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const found = rows.find(r => r.date === dateStr);
    result.push({ date: dateStr, count: found ? found.count : 0 });
  }
  return result;
}
