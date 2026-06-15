import express from 'express'
import cors from 'cors'
import Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'

const app = express()
app.use(cors())
app.use(express.json())

const db = new Database('./coffee-roast.db')

db.exec(`
  CREATE TABLE IF NOT EXISTS batches (
    id TEXT PRIMARY KEY,
    batch_number TEXT NOT NULL,
    origin TEXT NOT NULL,
    process_method TEXT NOT NULL,
    roast_date TEXT NOT NULL,
    temperature_points TEXT NOT NULL,
    flavor_scores TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL,
    author TEXT NOT NULL,
    content TEXT NOT NULL,
    overall_rating INTEGER NOT NULL,
    brew_method TEXT NOT NULL,
    likes INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (batch_id) REFERENCES batches(id)
  );

  CREATE TABLE IF NOT EXISTS replies (
    id TEXT PRIMARY KEY,
    note_id TEXT NOT NULL,
    author TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (note_id) REFERENCES notes(id)
  );
`)

const seedBatches = [
  {
    id: 'batch-1',
    batch_number: 'BR-001',
    origin: '埃塞俄比亚 耶加雪菲',
    process_method: '水洗',
    roast_date: '2024-01-15',
    temperature_points: JSON.stringify([
      { time: 0, temp: 150 }, { time: 2, temp: 175 }, { time: 4, temp: 190 },
      { time: 6, temp: 205 }, { time: 8, temp: 215 }, { time: 10, temp: 220 }, { time: 12, temp: 225 }
    ]),
    flavor_scores: JSON.stringify({
      acidity: 8, sweetness: 7, bitterness: 3, body: 6, aftertaste: 7,
      aroma: 9, balance: 8, cleanliness: 8, finish: 7
    })
  },
  {
    id: 'batch-2',
    batch_number: 'BR-002',
    origin: '哥伦比亚 慧兰',
    process_method: '蜜处理',
    roast_date: '2024-01-14',
    temperature_points: JSON.stringify([
      { time: 0, temp: 155 }, { time: 2, temp: 180 }, { time: 4, temp: 195 },
      { time: 6, temp: 208 }, { time: 8, temp: 218 }, { time: 10, temp: 222 }, { time: 11, temp: 228 }
    ]),
    flavor_scores: JSON.stringify({
      acidity: 6, sweetness: 8, bitterness: 4, body: 7, aftertaste: 8,
      aroma: 8, balance: 9, cleanliness: 7, finish: 8
    })
  },
  {
    id: 'batch-3',
    batch_number: 'BR-003',
    origin: '巴西 喜拉多',
    process_method: '日晒',
    roast_date: '2024-01-13',
    temperature_points: JSON.stringify([
      { time: 0, temp: 152 }, { time: 3, temp: 178 }, { time: 5, temp: 192 },
      { time: 7, temp: 206 }, { time: 9, temp: 216 }, { time: 11, temp: 223 }, { time: 13, temp: 228 }
    ]),
    flavor_scores: JSON.stringify({
      acidity: 5, sweetness: 7, bitterness: 5, body: 8, aftertaste: 6,
      aroma: 7, balance: 7, cleanliness: 6, finish: 6
    })
  },
  {
    id: 'batch-4',
    batch_number: 'BR-004',
    origin: '肯尼亚 AA',
    process_method: '水洗',
    roast_date: '2024-01-12',
    temperature_points: JSON.stringify([
      { time: 0, temp: 148 }, { time: 2, temp: 172 }, { time: 4, temp: 188 },
      { time: 6, temp: 202 }, { time: 8, temp: 212 }, { time: 9, temp: 218 }, { time: 10, temp: 222 }
    ]),
    flavor_scores: JSON.stringify({
      acidity: 9, sweetness: 6, bitterness: 3, body: 5, aftertaste: 8,
      aroma: 8, balance: 7, cleanliness: 9, finish: 7
    })
  },
  {
    id: 'batch-5',
    batch_number: 'BR-005',
    origin: '危地马拉 安提瓜',
    process_method: '水洗',
    roast_date: '2024-01-11',
    temperature_points: JSON.stringify([
      { time: 0, temp: 150 }, { time: 2, temp: 176 }, { time: 5, temp: 194 },
      { time: 7, temp: 208 }, { time: 9, temp: 218 }, { time: 11, temp: 225 }, { time: 12, temp: 230 }
    ]),
    flavor_scores: JSON.stringify({
      acidity: 7, sweetness: 8, bitterness: 4, body: 7, aftertaste: 7,
      aroma: 8, balance: 8, cleanliness: 8, finish: 7
    })
  },
  {
    id: 'batch-6',
    batch_number: 'BR-006',
    origin: '哥斯达黎加 塔拉苏',
    process_method: '蜜处理',
    roast_date: '2024-01-10',
    temperature_points: JSON.stringify([
      { time: 0, temp: 154 }, { time: 3, temp: 182 }, { time: 5, temp: 198 },
      { time: 7, temp: 210 }, { time: 9, temp: 220 }, { time: 10, temp: 225 }, { time: 11, temp: 228 }
    ]),
    flavor_scores: JSON.stringify({
      acidity: 7, sweetness: 9, bitterness: 3, body: 6, aftertaste: 8,
      aroma: 9, balance: 9, cleanliness: 8, finish: 8
    })
  },
  {
    id: 'batch-7',
    batch_number: 'BR-007',
    origin: '印尼 曼特宁',
    process_method: '湿刨',
    roast_date: '2024-01-09',
    temperature_points: JSON.stringify([
      { time: 0, temp: 150 }, { time: 3, temp: 175 }, { time: 6, temp: 195 },
      { time: 8, temp: 210 }, { time: 10, temp: 220 }, { time: 12, temp: 228 }, { time: 14, temp: 232 }
    ]),
    flavor_scores: JSON.stringify({
      acidity: 4, sweetness: 6, bitterness: 6, body: 9, aftertaste: 7,
      aroma: 7, balance: 7, cleanliness: 5, finish: 6
    })
  },
  {
    id: 'batch-8',
    batch_number: 'BR-008',
    origin: '巴拿马 瑰夏',
    process_method: '水洗',
    roast_date: '2024-01-08',
    temperature_points: JSON.stringify([
      { time: 0, temp: 145 }, { time: 2, temp: 168 }, { time: 4, temp: 185 },
      { time: 6, temp: 200 }, { time: 7, temp: 208 }, { time: 8, temp: 214 }, { time: 9, temp: 218 }
    ]),
    flavor_scores: JSON.stringify({
      acidity: 8, sweetness: 9, bitterness: 2, body: 6, aftertaste: 9,
      aroma: 10, balance: 9, cleanliness: 10, finish: 9
    })
  }
]

const seedNotes = [
  { id: 'note-1', batch_id: 'batch-1', author: '咖啡猎人', content: '柑橘和茉莉花香气明显，入口有柠檬皮和蜂蜜的甜感，尾韵干净清爽，非常适合手冲。', overall_rating: 9, brew_method: '手冲', likes: 12 },
  { id: 'note-2', batch_id: 'batch-1', author: '烘焙新手', content: '第一次尝试耶加雪菲，比想象中更酸一些，但回甘很好，下次试试降低水温。', overall_rating: 8, brew_method: '手冲', likes: 5 },
  { id: 'note-3', batch_id: 'batch-2', author: '拿铁爱好者', content: '焦糖和坚果风味突出，做拿铁非常好喝，牛奶的甜感和咖啡的焦糖味完美融合。', overall_rating: 9, brew_method: '意式', likes: 18 },
  { id: 'note-4', batch_id: 'batch-3', author: '深夜咖啡党', content: '醇厚的巧克力和坚果味，苦味适中，冷萃后口感顺滑，是夏日必备。', overall_rating: 8, brew_method: '冷萃', likes: 9 },
  { id: 'note-5', batch_id: 'batch-4', author: '果酸控', content: '黑醋栗和番茄的明亮酸质，太惊艳了！干香有蓝莓果酱的味道。', overall_rating: 9, brew_method: '手冲', likes: 22 },
  { id: 'note-6', batch_id: 'batch-6', author: '品鉴师小王', content: '蜂蜜般的甜感，层次丰富，有橙花、红糖和淡淡的红酒风味，平衡度极佳。', overall_rating: 10, brew_method: '手冲', likes: 31 },
  { id: 'note-7', batch_id: 'batch-8', author: '瑰夏迷', content: '不愧是瑰夏，花香爆炸！茉莉、玫瑰、佛手柑，尾韵有红茶的感觉，值得细细品味。', overall_rating: 10, brew_method: '手冲', likes: 45 }
]

const seedReplies = [
  { id: 'reply-1', note_id: 'note-1', author: '烘焙师老李', content: '试试88度水温，风味会更平衡。' },
  { id: 'reply-2', note_id: 'note-1', author: '咖啡小白', content: '请问研磨度用多少合适？' },
  { id: 'reply-3', note_id: 'note-3', author: '豆子搬运工', content: '哥伦比亚做意式确实绝配！' }
]

const existingBatches = db.prepare('SELECT COUNT(*) as count FROM batches').get() as { count: number }
if (existingBatches.count === 0) {
  const insertBatch = db.prepare('INSERT INTO batches (id, batch_number, origin, process_method, roast_date, temperature_points, flavor_scores) VALUES (?, ?, ?, ?, ?, ?, ?)')
  seedBatches.forEach(b => insertBatch.run(b.id, b.batch_number, b.origin, b.process_method, b.roast_date, b.temperature_points, b.flavor_scores))
  const insertNote = db.prepare('INSERT INTO notes (id, batch_id, author, content, overall_rating, brew_method, likes) VALUES (?, ?, ?, ?, ?, ?, ?)')
  seedNotes.forEach(n => insertNote.run(n.id, n.batch_id, n.author, n.content, n.overall_rating, n.brew_method, n.likes))
  const insertReply = db.prepare('INSERT INTO replies (id, note_id, author, content) VALUES (?, ?, ?, ?)')
  seedReplies.forEach(r => insertReply.run(r.id, r.note_id, r.author, r.content))
}

app.get('/api/batches', (req, res) => {
  const page = parseInt(req.query.page as string) || 1
  const limit = parseInt(req.query.limit as string) || 6
  const offset = (page - 1) * limit

  const batches = db.prepare(`
    SELECT b.*, 
           (SELECT AVG(overall_rating) FROM notes WHERE batch_id = b.id) as avg_rating,
           (SELECT COUNT(*) FROM notes WHERE batch_id = b.id) as note_count
    FROM batches b
    ORDER BY b.created_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset)

  const total = db.prepare('SELECT COUNT(*) as count FROM batches').get() as { count: number }

  res.json({
    data: batches.map((b: any) => ({
      ...b,
      temperature_points: JSON.parse(b.temperature_points),
      flavor_scores: b.flavor_scores ? JSON.parse(b.flavor_scores) : null,
      avg_rating: b.avg_rating ? Math.round(b.avg_rating * 10) / 10 : 0
    })),
    total: total.count,
    page,
    limit,
    hasMore: offset + limit < total.count
  })
})

app.post('/api/batches', (req, res) => {
  const { batch_number, origin, process_method, roast_date, temperature_points, flavor_scores } = req.body

  if (!batch_number || !origin || !process_method || !roast_date || !temperature_points) {
    return res.status(400).json({ error: '缺少必填字段' })
  }

  const points = temperature_points as { time: number; temp: number }[]
  if (points.length < 5) {
    return res.status(400).json({ error: '至少需要5个温度点' })
  }

  for (let i = 0; i < points.length; i++) {
    if (i > 0 && points[i].time <= points[i - 1].time) {
      return res.status(400).json({ error: '时间必须递增' })
    }
    if (points[i].temp < 150 || points[i].temp > 250) {
      return res.status(400).json({ error: '温度必须在150-250°C之间' })
    }
  }

  const id = uuidv4()
  db.prepare(`
    INSERT INTO batches (id, batch_number, origin, process_method, roast_date, temperature_points, flavor_scores)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, batch_number, origin, process_method, roast_date, JSON.stringify(points),
    flavor_scores ? JSON.stringify(flavor_scores) : null)

  res.status(201).json({ id, ...req.body })
})

app.get('/api/batches/:id', (req, res) => {
  const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(req.params.id) as any

  if (!batch) {
    return res.status(404).json({ error: '批次不存在' })
  }

  const notes = db.prepare(`
    SELECT n.*,
           (SELECT COUNT(*) FROM replies WHERE note_id = n.id) as reply_count
    FROM notes n
    WHERE n.batch_id = ?
    ORDER BY n.created_at DESC
  `).all(req.params.id)

  const notesWithReplies = (notes as any[]).map(n => ({
    ...n,
    replies: db.prepare('SELECT * FROM replies WHERE note_id = ? ORDER BY created_at ASC').all(n.id)
  }))

  const avgRating = db.prepare('SELECT AVG(overall_rating) as avg FROM notes WHERE batch_id = ?').get(req.params.id) as { avg: number }

  res.json({
    ...batch,
    temperature_points: JSON.parse(batch.temperature_points),
    flavor_scores: batch.flavor_scores ? JSON.parse(batch.flavor_scores) : null,
    notes: notesWithReplies,
    avg_rating: avgRating.avg ? Math.round(avgRating.avg * 10) / 10 : 0
  })
})

app.post('/api/batches/:id/notes', (req, res) => {
  const { author, content, overall_rating, brew_method } = req.body

  if (!author || !content || overall_rating === undefined || !brew_method) {
    return res.status(400).json({ error: '缺少必填字段' })
  }

  if (content.length > 500) {
    return res.status(400).json({ error: '笔记内容不能超过500字' })
  }

  if (overall_rating < 0 || overall_rating > 10) {
    return res.status(400).json({ error: '评分必须在0-10之间' })
  }

  const id = uuidv4()
  db.prepare(`
    INSERT INTO notes (id, batch_id, author, content, overall_rating, brew_method)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, req.params.id, author, content, overall_rating, brew_method)

  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(id) as any
  res.status(201).json({ ...note, replies: [] })
})

app.post('/api/notes/:id/like', (req, res) => {
  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id) as any
  if (!note) {
    return res.status(404).json({ error: '笔记不存在' })
  }

  db.prepare('UPDATE notes SET likes = likes + 1 WHERE id = ?').run(req.params.id)
  const updated = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id)
  res.json(updated)
})

app.post('/api/notes/:id/replies', (req, res) => {
  const { author, content } = req.body

  if (!author || !content) {
    return res.status(400).json({ error: '缺少必填字段' })
  }

  const id = uuidv4()
  db.prepare(`
    INSERT INTO replies (id, note_id, author, content)
    VALUES (?, ?, ?, ?)
  `).run(id, req.params.id, author, content)

  const reply = db.prepare('SELECT * FROM replies WHERE id = ?').get(id)
  res.status(201).json(reply)
})

const PORT = 3001
app.listen(PORT, () => {
  console.log(`Coffee Roast API server running on http://localhost:${PORT}`)
})
