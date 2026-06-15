import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'portfolio.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS works (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    image_url TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    project_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    work_id TEXT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    content TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (work_id) REFERENCES works(id)
  );
`);

const ADMIN_PASSWORD = 'admin123';
const SALT_ROUNDS = 10;
let storedHash = '';

(async () => {
  storedHash = await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS);
})();

const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: '未授权访问' });
  }
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [password, timestamp] = decoded.split(':');
    const timeDiff = Date.now() - parseInt(timestamp);
    if (timeDiff > 8 * 60 * 60 * 1000) {
      return res.status(401).json({ error: '登录已过期' });
    }
    const match = await bcrypt.compare(password, storedHash);
    if (!match) {
      return res.status(401).json({ error: '密码错误' });
    }
    next();
  } catch {
    return res.status(401).json({ error: '认证失败' });
  }
};

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: '密码不能为空' });
    }
    const match = await bcrypt.compare(password, storedHash);
    if (!match) {
      return res.status(401).json({ error: '密码错误' });
    }
    const token = Buffer.from(`${password}:${Date.now()}`).toString('base64');
    res.json({ token, success: true });
  } catch (error) {
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/api/works', (_req: Request, res: Response) => {
  try {
    const works = db.prepare('SELECT * FROM works ORDER BY created_at DESC').all();
    res.json(works);
  } catch (error) {
    res.status(500).json({ error: '获取作品列表失败' });
  }
});

app.get('/api/works/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const work = db.prepare('SELECT * FROM works WHERE id = ?').get(id);
    if (!work) {
      return res.status(404).json({ error: '作品不存在' });
    }
    res.json(work);
  } catch (error) {
    res.status(500).json({ error: '获取作品详情失败' });
  }
});

app.post('/api/works', authMiddleware, (req: Request, res: Response) => {
  try {
    const { title, image_url, description, category, project_url } = req.body;
    if (!title || !image_url || !description || !category) {
      return res.status(400).json({ error: '缺少必填字段' });
    }
    if (description.length > 300) {
      return res.status(400).json({ error: '描述不能超过300字' });
    }
    const id = uuidv4();
    db.prepare(
      'INSERT INTO works (id, title, image_url, description, category, project_url) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, title, image_url, description, category, project_url || null);
    const newWork = db.prepare('SELECT * FROM works WHERE id = ?').get(id);
    res.status(201).json(newWork);
  } catch (error) {
    res.status(500).json({ error: '创建作品失败' });
  }
});

app.put('/api/works/:id', authMiddleware, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, image_url, description, category, project_url } = req.body;
    const existing = db.prepare('SELECT * FROM works WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: '作品不存在' });
    }
    if (description && description.length > 300) {
      return res.status(400).json({ error: '描述不能超过300字' });
    }
    db.prepare(
      'UPDATE works SET title = ?, image_url = ?, description = ?, category = ?, project_url = ? WHERE id = ?'
    ).run(
      title || (existing as any).title,
      image_url || (existing as any).image_url,
      description || (existing as any).description,
      category || (existing as any).category,
      project_url !== undefined ? project_url : (existing as any).project_url,
      id
    );
    const updated = db.prepare('SELECT * FROM works WHERE id = ?').get(id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: '更新作品失败' });
  }
});

app.delete('/api/works/:id', authMiddleware, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM works WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: '作品不存在' });
    }
    db.prepare('DELETE FROM works WHERE id = ?').run(id);
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    res.status(500).json({ error: '删除作品失败' });
  }
});

app.get('/api/messages', authMiddleware, (_req: Request, res: Response) => {
  try {
    const messages = db.prepare(`
      SELECT m.*, w.title as work_title 
      FROM messages m 
      LEFT JOIN works w ON m.work_id = w.id 
      ORDER BY m.created_at DESC
    `).all();
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: '获取消息列表失败' });
  }
});

app.post('/api/messages', (req: Request, res: Response) => {
  try {
    const { work_id, name, email, content } = req.body;
    if (!name || !email || !content) {
      return res.status(400).json({ error: '缺少必填字段' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: '邮箱格式不正确' });
    }
    if (content.length > 500) {
      return res.status(400).json({ error: '消息内容不能超过500字' });
    }
    const id = uuidv4();
    db.prepare(
      'INSERT INTO messages (id, work_id, name, email, content) VALUES (?, ?, ?, ?, ?)'
    ).run(id, work_id || null, name, email, content);
    const newMessage = db.prepare(`
      SELECT m.*, w.title as work_title 
      FROM messages m 
      LEFT JOIN works w ON m.work_id = w.id 
      WHERE m.id = ?
    `).get(id);
    res.status(201).json(newMessage);
  } catch (error) {
    res.status(500).json({ error: '提交消息失败' });
  }
});

app.put('/api/messages/:id/read', authMiddleware, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: '消息不存在' });
    }
    db.prepare('UPDATE messages SET is_read = 1 WHERE id = ?').run(id);
    const updated = db.prepare(`
      SELECT m.*, w.title as work_title 
      FROM messages m 
      LEFT JOIN works w ON m.work_id = w.id 
      WHERE m.id = ?
    `).get(id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: '标记已读失败' });
  }
});

app.delete('/api/messages/:id', authMiddleware, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: '消息不存在' });
    }
    db.prepare('DELETE FROM messages WHERE id = ?').run(id);
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    res.status(500).json({ error: '删除消息失败' });
  }
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`后端服务已启动: http://localhost:${PORT}`);
});
