import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import db, { initDatabase } from './database.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

initDatabase();

app.get('/api/works', (req, res) => {
  const { search, page = '1', limit = '50' } = req.query;
  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const offset = (pageNum - 1) * limitNum;

  if (search) {
    const searchTerm = `%${search}%`;
    const works = db.prepare(`
      SELECT * FROM works
      WHERE title LIKE ? OR artist LIKE ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(searchTerm, searchTerm, limitNum, offset);

    const total = db.prepare(`
      SELECT COUNT(*) as count FROM works
      WHERE title LIKE ? OR artist LIKE ?
    `).get(searchTerm, searchTerm) as { count: number };

    res.json({ data: works, total: total.count });
  } else {
    const works = db.prepare(`
      SELECT * FROM works
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(limitNum, offset);

    const total = db.prepare('SELECT COUNT(*) as count FROM works').get() as { count: number };

    res.json({ data: works, total: total.count });
  }
});

app.get('/api/works/:id', (req, res) => {
  const { id } = req.params;
  const work = db.prepare('SELECT * FROM works WHERE id = ?').get(id);

  if (!work) {
    res.status(404).json({ error: '作品不存在' });
    return;
  }

  res.json(work);
});

app.post('/api/works', (req, res) => {
  const { title, artist, cover_url, media_url, lyrics } = req.body;
  const id = uuidv4();

  if (!title || !artist) {
    res.status(400).json({ error: '作品名称和艺术家是必填项' });
    return;
  }

  db.prepare(`
    INSERT INTO works (id, title, artist, cover_url, media_url, lyrics)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, title, artist, cover_url || '', media_url || '', lyrics || '');

  const newWork = db.prepare('SELECT * FROM works WHERE id = ?').get(id);
  res.status(201).json(newWork);
});

app.put('/api/works/:id', (req, res) => {
  const { id } = req.params;
  const { title, artist, cover_url, media_url, lyrics } = req.body;

  const existing = db.prepare('SELECT * FROM works WHERE id = ?').get(id);
  if (!existing) {
    res.status(404).json({ error: '作品不存在' });
    return;
  }

  db.prepare(`
    UPDATE works
    SET title = ?, artist = ?, cover_url = ?, media_url = ?, lyrics = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(title, artist, cover_url, media_url, lyrics, id);

  const updatedWork = db.prepare('SELECT * FROM works WHERE id = ?').get(id);
  res.json(updatedWork);
});

app.delete('/api/works/:id', (req, res) => {
  const { id } = req.params;

  const result = db.prepare('DELETE FROM works WHERE id = ?').run(id);
  if (result.changes === 0) {
    res.status(404).json({ error: '作品不存在' });
    return;
  }

  res.json({ message: '删除成功' });
});

app.get('/api/schedules', (req, res) => {
  const { date, start_date, end_date } = req.query;

  let query = 'SELECT * FROM schedules';
  const params: string[] = [];

  if (date) {
    query += ' WHERE date = ?';
    params.push(date as string);
  } else if (start_date && end_date) {
    query += ' WHERE date >= ? AND date <= ?';
    params.push(start_date as string, end_date as string);
  }

  query += ' ORDER BY date ASC, time ASC';

  const schedules = db.prepare(query).all(...params);
  res.json({ data: schedules });
});

app.get('/api/schedules/:id', (req, res) => {
  const { id } = req.params;
  const schedule = db.prepare('SELECT * FROM schedules WHERE id = ?').get(id);

  if (!schedule) {
    res.status(404).json({ error: '日程不存在' });
    return;
  }

  res.json(schedule);
});

app.post('/api/schedules', (req, res) => {
  const { title, date, time, location, notes } = req.body;
  const id = uuidv4();

  if (!title || !date || !time) {
    res.status(400).json({ error: '演出名称、日期和时间是必填项' });
    return;
  }

  db.prepare(`
    INSERT INTO schedules (id, title, date, time, location, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, title, date, time, location || '', notes || '');

  const newSchedule = db.prepare('SELECT * FROM schedules WHERE id = ?').get(id);
  res.status(201).json(newSchedule);
});

app.put('/api/schedules/:id', (req, res) => {
  const { id } = req.params;
  const { title, date, time, location, notes } = req.body;

  const existing = db.prepare('SELECT * FROM schedules WHERE id = ?').get(id);
  if (!existing) {
    res.status(404).json({ error: '日程不存在' });
    return;
  }

  db.prepare(`
    UPDATE schedules
    SET title = ?, date = ?, time = ?, location = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(title, date, time, location, notes, id);

  const updatedSchedule = db.prepare('SELECT * FROM schedules WHERE id = ?').get(id);
  res.json(updatedSchedule);
});

app.delete('/api/schedules/:id', (req, res) => {
  const { id } = req.params;

  const result = db.prepare('DELETE FROM schedules WHERE id = ?').run(id);
  if (result.changes === 0) {
    res.status(404).json({ error: '日程不存在' });
    return;
  }

  res.json({ message: '删除成功' });
});

app.get('/api/works/:workId/comments', (req, res) => {
  const { workId } = req.params;
  const { page = '1', limit = '10' } = req.query;
  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const offset = (pageNum - 1) * limitNum;

  const comments = db.prepare(`
    SELECT * FROM comments
    WHERE work_id = ? AND parent_id IS NULL
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(workId, limitNum, offset);

  const total = db.prepare(`
    SELECT COUNT(*) as count FROM comments
    WHERE work_id = ? AND parent_id IS NULL
  `).get(workId) as { count: number };

  const commentIds = comments.map((c: any) => c.id);
  let replies: any[] = [];
  if (commentIds.length > 0) {
    const placeholders = commentIds.map(() => '?').join(',');
    replies = db.prepare(`
      SELECT * FROM comments
      WHERE parent_id IN (${placeholders})
      ORDER BY created_at ASC
    `).all(...commentIds);
  }

  const commentsWithReplies = comments.map((comment: any) => ({
    ...comment,
    replies: replies.filter((r: any) => r.parent_id === comment.id)
  }));

  res.json({
    data: commentsWithReplies,
    total: total.count,
    page: pageNum,
    limit: limitNum
  });
});

app.post('/api/works/:workId/comments', (req, res) => {
  const { workId } = req.params;
  const { parent_id, nickname, content } = req.body;
  const id = uuidv4();

  if (!content || content.trim().length === 0) {
    res.status(400).json({ error: '评论内容不能为空' });
    return;
  }

  if (content.length > 200) {
    res.status(400).json({ error: '评论内容不能超过200字' });
    return;
  }

  const work = db.prepare('SELECT * FROM works WHERE id = ?').get(workId);
  if (!work) {
    res.status(404).json({ error: '作品不存在' });
    return;
  }

  if (parent_id) {
    const parent = db.prepare('SELECT * FROM comments WHERE id = ?').get(parent_id);
    if (!parent) {
      res.status(404).json({ error: '父评论不存在' });
      return;
    }
  }

  db.prepare(`
    INSERT INTO comments (id, work_id, parent_id, nickname, content)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, workId, parent_id || null, nickname || '匿名听众', content.trim());

  const newComment = db.prepare('SELECT * FROM comments WHERE id = ?').get(id);
  res.status(201).json(newComment);
});

app.delete('/api/comments/:id', (req, res) => {
  const { id } = req.params;

  const result = db.prepare('DELETE FROM comments WHERE id = ?').run(id);
  if (result.changes === 0) {
    res.status(404).json({ error: '评论不存在' });
    return;
  }

  res.json({ message: '删除成功' });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
