import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3001;
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const DB_PATH = path.join(__dirname, '..', 'database.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

const cache = new Map<string, { data: unknown; ttl: number }>();
const CACHE_TTL = 60_000;

function withCache<T>(key: string, fn: () => T): T {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.ttl > now) return hit.data as T;
  const result = fn();
  cache.set(key, { data: result, ttl: now + CACHE_TTL });
  return result;
}
function invalidate(pattern: string) {
  for (const k of [...cache.keys()]) if (k.includes(pattern)) cache.delete(k);
}

db.exec(`
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, nickname TEXT NOT NULL, city TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS shelves (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL, theme TEXT NOT NULL, city TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_shelves_city ON shelves(city);
CREATE TABLE IF NOT EXISTS books (id TEXT PRIMARY KEY, shelf_id TEXT NOT NULL, title TEXT NOT NULL, author TEXT NOT NULL, isbn TEXT, recommend TEXT, cover TEXT NOT NULL, spine_color TEXT NOT NULL, height INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'available', created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_books_shelf ON books(shelf_id);
CREATE TABLE IF NOT EXISTS reservations (id TEXT PRIMARY KEY, book_id TEXT NOT NULL, requester_id TEXT NOT NULL, owner_id TEXT NOT NULL, message TEXT NOT NULL, location TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_reservations_owner ON reservations(owner_id);
CREATE INDEX IF NOT EXISTS idx_reservations_requester ON reservations(requester_id);
CREATE TABLE IF NOT EXISTS chat_messages (id TEXT PRIMARY KEY, reservation_id TEXT NOT NULL, sender_id TEXT NOT NULL, content TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_messages_reservation ON chat_messages(reservation_id);
`);

const BOOK_COVERS: Record<string, string> = {};
const SPINE_COLORS = ['#8d6e63', '#5c6bc0', '#66bb6a', '#ef5350', '#ffa726', '#42a5f5', '#ab47bc', '#26c6da'];

function makeBook(title: string, author: string, recommend: string, idx: number) {
  const colors = ['#8d6e63', '#5c6bc0', '#66bb6a', '#ef5350', '#ffa726', '#42a5f5', '#ab47bc', '#26c6da'];
  const emojis = ['📕', '📗', '📘', '📙', '📓', '📔', '📒', '📚'];
  const spine = colors[idx % colors.length];
  const emoji = emojis[idx % emojis.length];
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='280' viewBox='0 0 200 280'>
    <defs><linearGradient id='g' x1='0' x2='1'>
      <stop offset='0%' stop-color='${spine}' stop-opacity='0.9'/>
      <stop offset='100%' stop-color='${spine}' stop-opacity='0.6'/>
    </linearGradient></defs>
    <rect width='200' height='280' fill='url(#g)'/>
    <rect x='4' y='4' width='192' height='272' fill='none' stroke='rgba(255,255,255,0.3)' stroke-width='2'/>
    <text x='100' y='130' font-size='60' text-anchor='middle'>${emoji}</text>
    <text x='100' y='190' font-size='18' text-anchor='middle' fill='#fff' font-family='Georgia' font-weight='bold'>${title.slice(0, 10)}</text>
    <text x='100' y='220' font-size='13' text-anchor='middle' fill='rgba(255,255,255,0.85)' font-family='Georgia'>${author.slice(0, 10)}</text>
  </svg>`;
  return { cover: 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64'), spineColor: spine, height: 100 + Math.floor(Math.random() * 41) };
}

function seedIfEmpty() {
  const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get() as { c: number };
  if (userCount.c > 0) return;

  const now = Date.now();
  const users = [
    { id: 'u_lin', nickname: '林晚', city: '北京' },
    { id: 'u_jiang', nickname: '江南墨客', city: '北京' },
    { id: 'u_su', nickname: '苏小米', city: '北京' },
  ];
  const insUser = db.prepare('INSERT INTO users (id, nickname, city, created_at) VALUES (?, ?, ?, ?)');
  users.forEach(u => insUser.run(u.id, u.nickname, u.city, now));

  const themes = [
    { name: '木纹', color: '#d4a373' },
    { name: '工业灰', color: '#9e9e9e' },
    { name: '薄荷绿', color: '#a5d6a7' },
    { name: '深海蓝', color: '#42a5f5' },
    { name: '暖橙', color: '#ffcc80' },
    { name: '暗夜紫', color: '#7e57c2' },
  ];
  const shelfDefs = [
    { uid: 'u_lin', name: '通勤小包', theme: themes[0].color },
    { uid: 'u_lin', name: '周末慢读', theme: themes[3].color },
    { uid: 'u_jiang', name: '诗集角落', theme: themes[5].color },
    { uid: 'u_jiang', name: '人文书房', theme: themes[1].color },
    { uid: 'u_su', name: '治愈书单', theme: themes[2].color },
    { uid: 'u_su', name: '科幻空间站', theme: themes[4].color },
  ];
  const insShelf = db.prepare('INSERT INTO shelves (id, user_id, name, theme, city, created_at) VALUES (?, ?, ?, ?, ?, ?)');
  const shelfIds: string[] = [];
  shelfDefs.forEach((d, i) => {
    const id = `s_${i}`;
    insShelf.run(id, d.uid, d.name, d.theme, '北京', now);
    shelfIds.push(id);
  });

  const bookDefs = [
    ['百年孤独', '马尔克斯', '魔幻现实主义的巅峰之作，一个家族七代人的传奇。', 0],
    ['小王子', '圣埃克苏佩里', '送给每个长大的孩子，关于爱与责任的童话。', 0],
    ['挪威的森林', '村上春树', '青春是一场温柔的雨，打湿了谁的心？', 0],
    ['活着', '余华', '讲述人如何去承受巨大的苦难，讲述眼泪的不存在。', 0],

    ['三体', '刘慈欣', '在浩瀚的宇宙面前，人类文明只是一粒尘埃。', 1],
    ['月亮与六便士', '毛姆', '满地都是六便士，他却抬头看见了月亮。', 1],
    ['局外人', '加缪', '今天，妈妈死了。也许是昨天，我不知道。', 1],

    ['飞鸟集', '泰戈尔', '生如夏花之绚烂，死如秋叶之静美。', 2],
    ['海子诗选', '海子', '面朝大海，春暖花开。', 2],
    ['先知', '纪伯伦', '我们已经走得太远，以至于忘记了为什么出发。', 2],

    ['万历十五年', '黄仁宇', '大历史观下，一个平淡年份里的暗流涌动。', 3],
    ['乡土中国', '费孝通', '理解中国社会基层结构的必读之作。', 3],
    ['叫魂', '孔飞力', '1768年中国妖术大恐慌下的民众与权力。', 3],
    ['人类简史', '赫拉利', '从认知革命到科学革命，人类如何走到今天。', 3],

    ['解忧杂货店', '东野圭吾', '如果人生有回信，它会写些什么？', 4],
    ['偷影子的人', '马克·李维', '一个能偷影子的男孩，和他温柔的秘密。', 4],
    ['岛上书店', '加·泽文', '没有谁是一座孤岛，每本书都是一个世界。', 4],

    ['沙丘', '弗兰克·赫伯特', '沙漠、香料、帝国，一场关于权力的史诗。', 5],
    ['安德的游戏', '奥森·卡德', '一个孩子的战争游戏，却是人类的命运抉择。', 5],
    ['基地', '阿西莫夫', '心理史学家预言了银河帝国的衰亡。', 5],
    ['神经漫游者', '威廉·吉布森', '赛博朋克的开山之作，定义了那个冰冷的未来。', 5],
  ];
  const insBook = db.prepare(`INSERT INTO books (id, shelf_id, title, author, isbn, recommend, cover, spine_color, height, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'available', ?)`);

  bookDefs.forEach((b, i) => {
    const sid = shelfIds[Math.min(5, Math.floor(i / 4))];
    const { cover, spineColor, height } = makeBook(b[0] as string, b[1] as string, b[2] as string, i);
    insBook.run(`b_${i}`, sid, b[0], b[1], `978${1000000000 + i}`, b[2], cover, spineColor, height, now);
  });
}
seedIfEmpty();

function toCamel<T extends Record<string, unknown>>(row: T): T {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(row)) {
    const nk = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    out[nk] = row[k];
  }
  return out as T;
}

const userConnections = new Map<string, Set<WebSocket>>();
function sendToUser(userId: string, payload: Record<string, unknown>) {
  const sockets = userConnections.get(userId);
  if (!sockets) return;
  const msg = JSON.stringify(payload);
  sockets.forEach(ws => { if (ws.readyState === WebSocket.OPEN) ws.send(msg); });
}

// ============ 用户 API ============
app.post('/api/user/login', (req, res) => {
  const { nickname, city } = req.body as { nickname?: string; city?: string };
  if (!nickname || !city) return res.status(400).json({ error: '缺少参数' });
  const id = 'u_' + uuidv4().slice(0, 8);
  const now = Date.now();
  db.prepare('INSERT INTO users (id, nickname, city, created_at) VALUES (?, ?, ?, ?)').run(id, nickname, city, now);
  invalidate('shelves');
  res.json({ id, nickname, city, createdAt: now });
});

app.get('/api/user/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: '不存在' });
  res.json(toCamel(row));
});

// ============ 书架 API ============
app.get('/api/shelves', (req, res) => {
  const city = (req.query.city as string) || '北京';
  const cacheKey = `shelves:${city}`;
  const result = withCache(cacheKey, () => {
    const shelves = db.prepare('SELECT * FROM shelves WHERE city = ? ORDER BY created_at DESC').all(city);
    const booksByShelf = db.prepare(`SELECT * FROM books WHERE shelf_id = ? ORDER BY created_at LIMIT 4`);
    return shelves.map(s => {
      const camel = toCamel(s as Record<string, unknown>);
      const books = booksByShelf.all((s as { id: string }).id).map(b => toCamel(b as Record<string, unknown>));
      const owner = db.prepare('SELECT nickname FROM users WHERE id = ?').get((s as { user_id: string }).user_id) as { nickname: string } | undefined;
      return { ...camel, ownerNickname: owner?.nickname || '匿名', previewBooks: books };
    });
  });
  res.json(result);
});

app.get('/api/shelf/:id', (req, res) => {
  const shelf = db.prepare('SELECT * FROM shelves WHERE id = ?').get(req.params.id);
  if (!shelf) return res.status(404).json({ error: '书架不存在' });
  const books = db.prepare('SELECT * FROM books WHERE shelf_id = ? ORDER BY created_at DESC').all(req.params.id);
  const owner = db.prepare('SELECT id, nickname FROM users WHERE id = ?').get((shelf as { user_id: string }).user_id);
  res.json({ shelf: toCamel(shelf as Record<string, unknown>), books: books.map(b => toCamel(b as Record<string, unknown>)), owner });
});

app.post('/api/shelf', (req, res) => {
  const { userId, name, theme } = req.body as { userId?: string; name?: string; theme?: string };
  if (!userId || !name || !theme) return res.status(400).json({ error: '缺少参数' });
  const user = db.prepare('SELECT city FROM users WHERE id = ?').get(userId) as { city: string } | undefined;
  if (!user) return res.status(404).json({ error: '用户不存在' });
  const id = 's_' + uuidv4().slice(0, 8);
  const now = Date.now();
  db.prepare('INSERT INTO shelves (id, user_id, name, theme, city, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, userId, name, theme, user.city, now);
  invalidate('shelves');
  res.json({ id, userId, name, theme, city: user.city, createdAt: now });
});

app.put('/api/shelf/:id', (req, res) => {
  const { name, theme } = req.body as { name?: string; theme?: string };
  const fields: string[] = [];
  const values: unknown[] = [];
  if (name !== undefined) { fields.push('name = ?'); values.push(name); }
  if (theme !== undefined) { fields.push('theme = ?'); values.push(theme); }
  if (!fields.length) return res.status(400).json({ error: '无更新内容' });
  values.push(req.params.id);
  db.prepare(`UPDATE shelves SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  invalidate('shelves');
  const row = db.prepare('SELECT * FROM shelves WHERE id = ?').get(req.params.id);
  res.json(toCamel(row as Record<string, unknown>));
});

app.get('/api/shelves/user/:userId', (req, res) => {
  const shelves = db.prepare('SELECT * FROM shelves WHERE user_id = ? ORDER BY created_at DESC').all(req.params.userId);
  const booksStmt = db.prepare(`SELECT * FROM books WHERE shelf_id = ? ORDER BY created_at`);
  const result = shelves.map(s => {
    const camel = toCamel(s as Record<string, unknown>);
    const books = booksStmt.all((s as { id: string }).id).map(b => toCamel(b as Record<string, unknown>));
    return { ...camel, books };
  });
  res.json(result);
});

// ============ 书籍 API ============
app.post('/api/book', (req, res) => {
  const { shelfId, title, author, isbn, recommend, cover } = req.body as {
    shelfId?: string; title?: string; author?: string; isbn?: string; recommend?: string; cover?: string;
  };
  if (!shelfId || !title || !author || !cover) return res.status(400).json({ error: '缺少参数' });
  const id = 'b_' + uuidv4().slice(0, 8);
  const spineColor = SPINE_COLORS[Math.floor(Math.random() * SPINE_COLORS.length)];
  const height = 100 + Math.floor(Math.random() * 41);
  const now = Date.now();
  db.prepare(`INSERT INTO books (id, shelf_id, title, author, isbn, recommend, cover, spine_color, height, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'available', ?)`)
    .run(id, shelfId, title, author, isbn || null, recommend || '', cover, spineColor, height, now);
  invalidate('shelves');
  res.json({ id, shelfId, title, author, isbn, recommend, cover, spineColor, height, status: 'available', createdAt: now });
});

app.put('/api/book/:id', (req, res) => {
  const { title, author, isbn, recommend, status } = req.body as Partial<{
    title: string; author: string; isbn: string; recommend: string; status: string;
  }>;
  const fields: string[] = [];
  const values: unknown[] = [];
  if (title !== undefined) { fields.push('title = ?'); values.push(title); }
  if (author !== undefined) { fields.push('author = ?'); values.push(author); }
  if (isbn !== undefined) { fields.push('isbn = ?'); values.push(isbn); }
  if (recommend !== undefined) { fields.push('recommend = ?'); values.push(recommend); }
  if (status !== undefined) { fields.push('status = ?'); values.push(status); }
  if (!fields.length) return res.status(400).json({ error: '无更新内容' });
  values.push(req.params.id);
  db.prepare(`UPDATE books SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  invalidate('shelves');
  const row = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
  res.json(toCamel(row as Record<string, unknown>));
});

app.delete('/api/book/:id', (req, res) => {
  db.prepare('DELETE FROM books WHERE id = ?').run(req.params.id);
  invalidate('shelves');
  res.json({ ok: true });
});

// ============ 预约 API ============
app.post('/api/reservation', (req, res) => {
  const { bookId, requesterId, message, location } = req.body as {
    bookId?: string; requesterId?: string; message?: string; location?: string;
  };
  if (!bookId || !requesterId || !message || !location) return res.status(400).json({ error: '缺少参数' });
  const book = db.prepare('SELECT shelf_id, status FROM books WHERE id = ?').get(bookId) as { shelf_id: string; status: string } | undefined;
  if (!book) return res.status(404).json({ error: '书籍不存在' });
  if (book.status !== 'available') return res.status(400).json({ error: '书籍不可预约' });
  const shelf = db.prepare('SELECT user_id FROM shelves WHERE id = ?').get(book.shelf_id) as { user_id: string };
  const id = 'r_' + uuidv4().slice(0, 8);
  const now = Date.now();
  db.prepare(`INSERT INTO reservations (id, book_id, requester_id, owner_id, message, location, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`)
    .run(id, bookId, requesterId, shelf.user_id, message, location, now);
  db.prepare("UPDATE books SET status = 'reserved' WHERE id = ?").run(bookId);
  invalidate('shelves');
  const reservation = { id, bookId, requesterId, ownerId: shelf.user_id, message, location, status: 'pending', createdAt: now };
  setTimeout(() => {
    sendToUser(shelf.user_id, { type: 'newReservation', reservation });
    const reqNick = db.prepare('SELECT nickname FROM users WHERE id = ?').get(requesterId) as { nickname: string } | undefined;
    const bookRow = db.prepare('SELECT title FROM books WHERE id = ?').get(bookId) as { title: string } | undefined;
    sendToUser(shelf.user_id, { type: 'notification', message: `📬 ${reqNick?.nickname || '有人'}预约了你的《${bookRow?.title || '书'}》` });
  }, 50);
  res.json(reservation);
});

app.get('/api/reservations', (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: '缺少userId' });
  const rows = db.prepare(`SELECT * FROM reservations WHERE requester_id = ? OR owner_id = ? ORDER BY created_at DESC`).all(userId, userId);
  const result = rows.map(r => {
    const camel = toCamel(r as Record<string, unknown>);
    const book = db.prepare('SELECT title, author, cover FROM books WHERE id = ?').get((r as { book_id: string }).book_id);
    const requester = db.prepare('SELECT nickname FROM users WHERE id = ?').get((r as { requester_id: string }).requester_id);
    const owner = db.prepare('SELECT nickname FROM users WHERE id = ?').get((r as { owner_id: string }).owner_id);
    return { ...camel, book: toCamel(book as Record<string, unknown>), requesterNickname: (requester as { nickname?: string })?.nickname, ownerNickname: (owner as { nickname?: string })?.nickname };
  });
  res.json(result);
});

app.put('/api/reservation/:id', (req, res) => {
  const { status } = req.body as { status?: string };
  if (!status || !['confirmed', 'rejected', 'completed'].includes(status)) return res.status(400).json({ error: '无效状态' });
  const reservation = db.prepare('SELECT * FROM reservations WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
  if (!reservation) return res.status(404).json({ error: '预约不存在' });
  db.prepare('UPDATE reservations SET status = ? WHERE id = ?').run(status, req.params.id);
  if (status === 'rejected') db.prepare("UPDATE books SET status = 'available' WHERE id = ?").run(reservation.book_id as string);
  if (status === 'completed') db.prepare("UPDATE books SET status = 'available' WHERE id = ?").run(reservation.book_id as string);
  invalidate('shelves');
  const updated = db.prepare('SELECT * FROM reservations WHERE id = ?').get(req.params.id);
  setTimeout(() => {
    sendToUser(reservation.requester_id as string, { type: 'reservationUpdated', reservation: toCamel(updated as Record<string, unknown>) });
    sendToUser(reservation.owner_id as string, { type: 'reservationUpdated', reservation: toCamel(updated as Record<string, unknown>) });
  }, 50);
  res.json(toCamel(updated as Record<string, unknown>));
});

// ============ 消息 API ============
app.get('/api/messages/:reservationId', (req, res) => {
  const rows = db.prepare('SELECT * FROM chat_messages WHERE reservation_id = ? ORDER BY created_at ASC').all(req.params.reservationId);
  res.json(rows.map(r => toCamel(r as Record<string, unknown>)));
});

app.post('/api/message', (req, res) => {
  const { reservationId, senderId, content } = req.body as { reservationId?: string; senderId?: string; content?: string };
  if (!reservationId || !senderId || !content) return res.status(400).json({ error: '缺少参数' });
  const reservation = db.prepare('SELECT requester_id, owner_id FROM reservations WHERE id = ?').get(reservationId) as { requester_id: string; owner_id: string } | undefined;
  if (!reservation) return res.status(404).json({ error: '预约不存在' });
  const id = 'm_' + uuidv4().slice(0, 8);
  const now = Date.now();
  db.prepare('INSERT INTO chat_messages (id, reservation_id, sender_id, content, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, reservationId, senderId, content, now);
  const message = { id, reservationId, senderId, content, createdAt: now };
  const recipient = senderId === reservation.requester_id ? reservation.owner_id : reservation.requester_id;
  setTimeout(() => {
    sendToUser(recipient, { type: 'newMessage', message });
  }, 50);
  res.json(message);
});

// ============ HTTP 服务器 + WebSocket ============
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  let currentUserId: string | null = null;
  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      if (data.type === 'join' && data.userId) {
        currentUserId = data.userId;
        if (!userConnections.has(currentUserId)) userConnections.set(currentUserId, new Set());
        userConnections.get(currentUserId)!.add(ws);
      }
      if (data.type === 'sendMessage' && currentUserId) {
        const { reservationId, content } = data;
        if (!reservationId || !content) return;
        const reservation = db.prepare('SELECT requester_id, owner_id FROM reservations WHERE id = ?').get(reservationId) as { requester_id: string; owner_id: string } | undefined;
        if (!reservation) return;
        const id = 'm_' + uuidv4().slice(0, 8);
        const now = Date.now();
        db.prepare('INSERT INTO chat_messages (id, reservation_id, sender_id, content, created_at) VALUES (?, ?, ?, ?, ?)')
          .run(id, reservationId, currentUserId, content, now);
        const message = { id, reservationId, senderId: currentUserId, content, createdAt: now };
        const recipient = currentUserId === reservation.requester_id ? reservation.owner_id : reservation.requester_id;
        sendToUser(currentUserId, { type: 'newMessage', message });
        sendToUser(recipient, { type: 'newMessage', message });
      }
    } catch (e) { /* ignore */ }
  });
  ws.on('close', () => {
    if (currentUserId && userConnections.has(currentUserId)) {
      userConnections.get(currentUserId)!.delete(ws);
      if (!userConnections.get(currentUserId)!.size) userConnections.delete(currentUserId);
    }
  });
});

server.listen(PORT, () => {
  console.log(`📚 流浪书架后端服务已启动: http://localhost:${PORT}`);
});
