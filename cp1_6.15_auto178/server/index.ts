import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const dbPath = path.join(__dirname, 'coffee.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS surveys (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    vote_goal INTEGER NOT NULL,
    current_votes INTEGER DEFAULT 0,
    deadline TEXT NOT NULL,
    crowdfund_active INTEGER DEFAULT 0,
    crowdfund_goal REAL DEFAULT 0,
    crowdfund_current REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    survey_id TEXT NOT NULL,
    username TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (survey_id) REFERENCES surveys(id)
  );

  CREATE TABLE IF NOT EXISTS supporters (
    id TEXT PRIMARY KEY,
    survey_id TEXT NOT NULL,
    username TEXT NOT NULL,
    amount REAL NOT NULL,
    pay_method TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (survey_id) REFERENCES surveys(id)
  );
`);

const countSurveys = db.prepare('SELECT COUNT(*) as cnt FROM surveys').get() as { cnt: number };
if (countSurveys.cnt === 0) {
  const insertSurvey = db.prepare(`
    INSERT INTO surveys (id, title, description, vote_goal, current_votes, deadline, crowdfund_active, crowdfund_goal, crowdfund_current)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date();
  const deadline1 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const deadline2 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const deadline3 = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString();

  insertSurvey.run(uuidv4(), '焦糖海盐拿铁', '浓郁焦糖与微咸海盐的完美碰撞，层次丰富的新风味拿铁', 50, 32, deadline1, 0, 5000, 0);
  insertSurvey.run(uuidv4(), '桂花燕麦拿铁', '秋季限定桂花香搭配丝滑燕麦奶，温暖治愈的植物基选择', 30, 28, deadline2, 0, 3000, 0);
  insertSurvey.run(uuidv4(), '黑糖珍珠拿铁', '经典黑糖与Q弹珍珠的拿铁新演绎，满足奶茶与咖啡的双重渴望', 40, 18, deadline3, 0, 4000, 0);

  const insertComment = db.prepare(`
    INSERT INTO comments (id, survey_id, username, text) VALUES (?, ?, ?, ?)
  `);
  const surveys = db.prepare('SELECT id FROM surveys').all() as { id: string }[];
  const usernames = ['咖啡爱好者', '拿铁控', '美食家小王', '奶茶转咖啡', '早起鸟', '下午茶达人', '甜品师阿花', '豆友小李'];
  const commentTexts = [
    '这个口味太期待了！', '一定要上架！', '听起来很好喝', '什么时候可以尝到？',
    '支持支持！', '好想试试看', '这个搭配太有创意了', '已经等不及了',
    '比想象中更好喝的搭配', '每周末都会来一杯'
  ];
  for (const survey of surveys) {
    const commentCount = 3 + Math.floor(Math.random() * 5);
    for (let i = 0; i < commentCount; i++) {
      insertComment.run(
        uuidv4(),
        survey.id,
        usernames[Math.floor(Math.random() * usernames.length)],
        commentTexts[Math.floor(Math.random() * commentTexts.length)]
      );
    }
  }
}

app.get('/api/surveys', (_req, res) => {
  const surveys = db.prepare('SELECT * FROM surveys ORDER BY created_at DESC').all();
  const result = surveys.map((s: any) => {
    const comments = db.prepare('SELECT * FROM comments WHERE survey_id = ? ORDER BY created_at DESC LIMIT 50').all(s.id);
    const supporters = db.prepare('SELECT * FROM supporters WHERE survey_id = ? ORDER BY created_at DESC').all(s.id);
    return { ...s, comments, supporters };
  });
  res.json(result);
});

app.get('/api/surveys/:id', (req, res) => {
  const survey = db.prepare('SELECT * FROM surveys WHERE id = ?').get(req.params.id);
  if (!survey) {
    res.status(404).json({ error: 'Survey not found' });
    return;
  }
  const comments = db.prepare('SELECT * FROM comments WHERE survey_id = ? ORDER BY created_at DESC LIMIT 50').all(req.params.id);
  const supporters = db.prepare('SELECT * FROM supporters WHERE survey_id = ? ORDER BY created_at DESC').all(req.params.id);
  res.json({ ...survey, comments, supporters });
});

app.post('/api/vote', (req, res) => {
  const { surveyId } = req.body;
  if (!surveyId) {
    res.status(400).json({ error: 'surveyId is required' });
    return;
  }
  const survey = db.prepare('SELECT * FROM surveys WHERE id = ?').get(surveyId) as any;
  if (!survey) {
    res.status(404).json({ error: 'Survey not found' });
    return;
  }
  const newVotes = survey.current_votes + 1;
  let crowdfundActive = survey.crowdfund_active;
  if (newVotes >= survey.vote_goal && !crowdfundActive) {
    crowdfundActive = 1;
  }
  db.prepare('UPDATE surveys SET current_votes = ?, crowdfund_active = ? WHERE id = ?').run(newVotes, crowdfundActive, surveyId);
  const updated = db.prepare('SELECT * FROM surveys WHERE id = ?').get(surveyId);
  res.json(updated);
});

app.post('/api/crowdfund', (req, res) => {
  const { surveyId, username, amount, payMethod } = req.body;
  if (!surveyId || !username || !amount || !payMethod) {
    res.status(400).json({ error: 'All fields are required' });
    return;
  }
  const survey = db.prepare('SELECT * FROM surveys WHERE id = ?').get(surveyId) as any;
  if (!survey) {
    res.status(404).json({ error: 'Survey not found' });
    return;
  }
  if (!survey.crowdfund_active) {
    res.status(400).json({ error: 'Crowdfunding is not active for this survey' });
    return;
  }
  const id = uuidv4();
  db.prepare('INSERT INTO supporters (id, survey_id, username, amount, pay_method) VALUES (?, ?, ?, ?, ?)').run(id, surveyId, username, amount, payMethod);
  const newCurrent = survey.crowdfund_current + amount;
  db.prepare('UPDATE surveys SET crowdfund_current = ? WHERE id = ?').run(newCurrent, surveyId);
  const updated = db.prepare('SELECT * FROM surveys WHERE id = ?').get(surveyId);
  const supporters = db.prepare('SELECT * FROM supporters WHERE survey_id = ? ORDER BY created_at DESC').all(surveyId);
  res.json({ ...updated, supporters });
});

app.post('/api/comments', (req, res) => {
  const { surveyId, username, text } = req.body;
  if (!surveyId || !username || !text) {
    res.status(400).json({ error: 'All fields are required' });
    return;
  }
  const id = uuidv4();
  db.prepare('INSERT INTO comments (id, survey_id, username, text) VALUES (?, ?, ?, ?)').run(id, surveyId, username, text);
  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(id);
  res.json(comment);
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
