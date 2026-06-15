import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.join(__dirname, 'community.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    avatar TEXT NOT NULL,
    points INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS challenges (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    thumbnail TEXT NOT NULL,
    deadline INTEGER NOT NULL,
    likes INTEGER NOT NULL DEFAULT 0,
    participants INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS challenge_participants (
    id TEXT PRIMARY KEY,
    challenge_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    submission TEXT,
    likes INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    UNIQUE(challenge_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS points_history (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    points INTEGER NOT NULL,
    description TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS rewards (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    thumbnail TEXT NOT NULL,
    cost INTEGER NOT NULL,
    description TEXT,
    type TEXT NOT NULL DEFAULT 'wallpaper',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS exchange_records (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    reward_id TEXT NOT NULL,
    cost INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
`);

const seedUsers = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
if (seedUsers.count === 0) {
  const insertUser = db.prepare(
    'INSERT INTO users (id, username, avatar, points, created_at) VALUES (?, ?, ?, ?, ?)'
  );
  const sampleUsers = [
    { id: 'user-1', username: '小画家', avatar: '🎨', points: 1580 },
    { id: 'user-2', username: '创意喵', avatar: '🐱', points: 1420 },
    { id: 'user-3', username: '星空画师', avatar: '🌟', points: 1260 },
    { id: 'user-4', username: '彩虹笔', avatar: '🌈', points: 980 },
    { id: 'user-5', username: '墨染', avatar: '🖌️', points: 870 },
    { id: 'user-6', username: '云间鹤', avatar: '🦢', points: 750 },
    { id: 'user-7', username: '像素君', avatar: '👾', points: 620 },
    { id: 'user-8', username: '水彩少女', avatar: '💧', points: 510 },
    { id: 'user-9', username: '涂鸦王', avatar: '✏️', points: 430 },
    { id: 'user-10', username: '速写达人', avatar: '📝', points: 380 },
    { id: 'user-current', username: '我', avatar: '😊', points: 200 },
  ];
  const now = Date.now();
  for (const u of sampleUsers) {
    insertUser.run(u.id, u.username, u.avatar, u.points, now);
  }
}

const seedChallenges = db.prepare('SELECT COUNT(*) as count FROM challenges').get() as { count: number };
if (seedChallenges.count === 0) {
  const insertChallenge = db.prepare(
    'INSERT INTO challenges (id, title, description, thumbnail, deadline, likes, participants, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const now = Date.now();
  const week = 7 * 24 * 60 * 60 * 1000;
  const sampleChallenges = [
    {
      id: 'chal-1',
      title: '画一幅日落时的海滩',
      description: '用温暖的色调描绘傍晚海边的风景，捕捉夕阳的余晖与海浪的节奏。',
      thumbnail: '🌅',
      deadline: now + week,
      likes: 42,
      participants: 18,
    },
    {
      id: 'chal-2',
      title: '幻想中的森林精灵',
      description: '发挥想象力，创作一个居住在神秘森林中的小精灵角色。',
      thumbnail: '🧚',
      deadline: now + week * 2,
      likes: 35,
      participants: 12,
    },
    {
      id: 'chal-3',
      title: '赛博朋克都市夜景',
      description: '绘制霓虹灯光下的未来城市，高楼、飞行器与雨雾交织。',
      thumbnail: '🏙️',
      deadline: now + week * 3,
      likes: 28,
      participants: 9,
    },
  ];
  for (const c of sampleChallenges) {
    insertChallenge.run(c.id, c.title, c.description, c.thumbnail, c.deadline, c.likes, c.participants, now);
  }
}

const seedRewards = db.prepare('SELECT COUNT(*) as count FROM rewards').get() as { count: number };
if (seedRewards.count === 0) {
  const insertReward = db.prepare(
    'INSERT INTO rewards (id, name, thumbnail, cost, description, type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const now = Date.now();
  const sampleRewards = [
    { id: 'rw-1', name: '限定樱花壁纸', thumbnail: '🌸', cost: 200, description: '高清樱花主题桌面壁纸', type: 'wallpaper' },
    { id: 'rw-2', name: '星空头像框', thumbnail: '✨', cost: 300, description: '闪耀星空主题专属头像框', type: 'frame' },
    { id: 'rw-3', name: '梦幻独角兽壁纸', thumbnail: '🦄', cost: 250, description: '梦幻风格独角兽插画壁纸', type: 'wallpaper' },
    { id: 'rw-4', name: '金色光环头像框', thumbnail: '👑', cost: 500, description: '尊贵金色光环专属头像框', type: 'frame' },
    { id: 'rw-5', name: '海底世界壁纸', thumbnail: '🐠', cost: 180, description: '深海鱼群与珊瑚礁壁纸', type: 'wallpaper' },
    { id: 'rw-6', name: '火焰徽章头像框', thumbnail: '🔥', cost: 350, description: '炫酷火焰主题头像框', type: 'frame' },
  ];
  for (const r of sampleRewards) {
    insertReward.run(r.id, r.name, r.thumbnail, r.cost, r.description, r.type, now);
  }
}

export interface User {
  id: string;
  username: string;
  avatar: string;
  points: number;
  created_at: number;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  deadline: number;
  likes: number;
  participants: number;
  created_at: number;
}

export interface ChallengeParticipant {
  id: string;
  challenge_id: string;
  user_id: string;
  submission: string | null;
  likes: number;
  created_at: number;
}

export interface PointsHistory {
  id: string;
  user_id: string;
  action: string;
  points: number;
  description: string | null;
  created_at: number;
}

export interface Reward {
  id: string;
  name: string;
  thumbnail: string;
  cost: number;
  description: string | null;
  type: string;
  created_at: number;
}

export interface ExchangeRecord {
  id: string;
  user_id: string;
  reward_id: string;
  cost: number;
  created_at: number;
}

export const userQueries = {
  getAll: db.prepare('SELECT * FROM users ORDER BY points DESC LIMIT 10'),
  getById: db.prepare('SELECT * FROM users WHERE id = ?'),
  updatePoints: db.prepare('UPDATE users SET points = points + ? WHERE id = ?'),
  setPoints: db.prepare('UPDATE users SET points = ? WHERE id = ?'),
};

export const challengeQueries = {
  getAll: db.prepare('SELECT * FROM challenges ORDER BY created_at DESC'),
  getById: db.prepare('SELECT * FROM challenges WHERE id = ?'),
  addLike: db.prepare('UPDATE challenges SET likes = likes + 1 WHERE id = ?'),
  addParticipant: db.prepare('UPDATE challenges SET participants = participants + 1 WHERE id = ?'),
  getParticipant: db.prepare(
    'SELECT * FROM challenge_participants WHERE challenge_id = ? AND user_id = ?'
  ),
  insertParticipant: db.prepare(
    'INSERT INTO challenge_participants (id, challenge_id, user_id, submission, likes, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ),
};

export const pointsQueries = {
  getLeaderboard: db.prepare('SELECT id, username, avatar, points FROM users ORDER BY points DESC LIMIT 10'),
  getByUserId: db.prepare('SELECT SUM(points) as total FROM points_history WHERE user_id = ?'),
  getHistory: db.prepare(
    'SELECT * FROM points_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ),
  insert: db.prepare(
    'INSERT INTO points_history (id, user_id, action, points, description, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ),
};

export const rewardQueries = {
  getAll: db.prepare('SELECT * FROM rewards ORDER BY created_at DESC'),
  getById: db.prepare('SELECT * FROM rewards WHERE id = ?'),
};

export const exchangeQueries = {
  getByUserId: db.prepare(
    'SELECT er.*, r.name, r.thumbnail FROM exchange_records er JOIN rewards r ON er.reward_id = r.id WHERE er.user_id = ? ORDER BY er.created_at DESC'
  ),
  insert: db.prepare(
    'INSERT INTO exchange_records (id, user_id, reward_id, cost, created_at) VALUES (?, ?, ?, ?, ?)'
  ),
};

export default db;
