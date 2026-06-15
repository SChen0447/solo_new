import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const db = new Database(path.join(__dirname, '..', 'emotion.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS bubbles (
    id TEXT PRIMARY KEY,
    emotion TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS replies (
    id TEXT PRIMARY KEY,
    bubbleId TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    FOREIGN KEY (bubbleId) REFERENCES bubbles(id)
  );

  CREATE INDEX IF NOT EXISTS idx_bubbles_timestamp ON bubbles(timestamp);
  CREATE INDEX IF NOT EXISTS idx_replies_bubbleId ON replies(bubbleId);
`);

type EmotionType = 'happy' | 'sad' | 'angry' | 'anxious' | 'calm';

interface Bubble {
  id: string;
  emotion: EmotionType;
  content: string;
  timestamp: number;
}

interface Reply {
  id: string;
  bubbleId: string;
  content: string;
  timestamp: number;
}

app.get('/api/bubbles', (req, res) => {
  const since = req.query.since ? parseInt(req.query.since as string) : 0;
  const bubbles = db
    .prepare('SELECT * FROM bubbles WHERE timestamp >= ? ORDER BY timestamp DESC LIMIT 200')
    .all(since) as Bubble[];
  const replies = db
    .prepare('SELECT * FROM replies WHERE bubbleId IN (SELECT id FROM bubbles WHERE timestamp >= ?)')
    .all(since) as Reply[];
  res.json({ bubbles, replies });
});

app.post('/api/bubbles', (req, res) => {
  const { emotion, content } = req.body as { emotion: EmotionType; content: string };
  
  if (!emotion || !content) {
    return res.status(400).json({ error: '情绪和内容不能为空' });
  }
  
  if (content.length > 200) {
    return res.status(400).json({ error: '内容不能超过200字' });
  }
  
  const validEmotions: EmotionType[] = ['happy', 'sad', 'angry', 'anxious', 'calm'];
  if (!validEmotions.includes(emotion)) {
    return res.status(400).json({ error: '无效的情绪类型' });
  }
  
  const id = uuidv4();
  const timestamp = Date.now();
  
  db.prepare('INSERT INTO bubbles (id, emotion, content, timestamp) VALUES (?, ?, ?, ?)').run(
    id,
    emotion,
    content,
    timestamp
  );
  
  const count = db.prepare('SELECT COUNT(*) as count FROM bubbles').get() as { count: number };
  if (count.count > 200) {
    db.prepare('DELETE FROM bubbles WHERE id IN (SELECT id FROM bubbles ORDER BY timestamp ASC LIMIT ?)').run(
      count.count - 200
    );
  }
  
  res.json({ id, emotion, content, timestamp });
});

app.post('/api/bubbles/:id/replies', (req, res) => {
  const { id } = req.params;
  const { content } = req.body as { content: string };
  
  if (!content) {
    return res.status(400).json({ error: '回复内容不能为空' });
  }
  
  if (content.length > 100) {
    return res.status(400).json({ error: '回复不能超过100字' });
  }
  
  const bubble = db.prepare('SELECT * FROM bubbles WHERE id = ?').get(id) as Bubble | undefined;
  if (!bubble) {
    return res.status(404).json({ error: '气泡不存在' });
  }
  
  const replyId = uuidv4();
  const timestamp = Date.now();
  
  db.prepare('INSERT INTO replies (id, bubbleId, content, timestamp) VALUES (?, ?, ?, ?)').run(
    replyId,
    id,
    content,
    timestamp
  );
  
  res.json({ id: replyId, bubbleId: id, content, timestamp });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
