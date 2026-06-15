import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'data.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS requirements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    style_tags TEXT NOT NULL,
    lyrics_direction TEXT NOT NULL,
    reference_style TEXT NOT NULL,
    deadline TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS demos (
    id TEXT PRIMARY KEY,
    req_id TEXT NOT NULL,
    title TEXT NOT NULL,
    creator TEXT NOT NULL,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    duration INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (req_id) REFERENCES requirements(id)
  );

  CREATE TABLE IF NOT EXISTS feedback (
    id TEXT PRIMARY KEY,
    demo_id TEXT NOT NULL,
    tech_score INTEGER NOT NULL,
    creative_score INTEGER NOT NULL,
    comment TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (demo_id) REFERENCES demos(id)
  );
`);

export interface Requirement {
  id: string;
  title: string;
  style_tags: string;
  lyrics_direction: string;
  reference_style: string;
  deadline: string;
  created_at: string;
}

export interface Demo {
  id: string;
  req_id: string;
  title: string;
  creator: string;
  filename: string;
  file_path: string;
  duration: number;
  created_at: string;
}

export interface Feedback {
  id: string;
  demo_id: string;
  tech_score: number;
  creative_score: number;
  comment: string;
  status: 'shortlisted' | 'rejected' | 'pending';
  created_at: string;
}

export const getRequirements = () => {
  const stmt = db.prepare('SELECT * FROM requirements ORDER BY created_at DESC');
  return stmt.all() as Requirement[];
};

export const createRequirement = (
  id: string,
  title: string,
  style_tags: string,
  lyrics_direction: string,
  reference_style: string,
  deadline: string
) => {
  const stmt = db.prepare(`
    INSERT INTO requirements (id, title, style_tags, lyrics_direction, reference_style, deadline)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(id, title, style_tags, lyrics_direction, reference_style, deadline);
};

export const getDemosByReqId = (reqId: string) => {
  const stmt = db.prepare('SELECT * FROM demos WHERE req_id = ? ORDER BY created_at DESC');
  return stmt.all(reqId) as Demo[];
};

export const createDemo = (
  id: string,
  reqId: string,
  title: string,
  creator: string,
  filename: string,
  filePath: string,
  duration: number
) => {
  const stmt = db.prepare(`
    INSERT INTO demos (id, req_id, title, creator, filename, file_path, duration)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(id, reqId, title, creator, filename, filePath, duration);
};

export const getFeedbackByDemoId = (demoId: string) => {
  const stmt = db.prepare('SELECT * FROM feedback WHERE demo_id = ? ORDER BY created_at DESC');
  return stmt.all(demoId) as Feedback[];
};

export const createFeedback = (
  id: string,
  demoId: string,
  techScore: number,
  creativeScore: number,
  comment: string,
  status: 'shortlisted' | 'rejected' | 'pending'
) => {
  const stmt = db.prepare(`
    INSERT INTO feedback (id, demo_id, tech_score, creative_score, comment, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(id, demoId, techScore, creativeScore, comment, status);
};

export default db;
