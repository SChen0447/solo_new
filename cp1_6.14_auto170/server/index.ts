import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

interface Member {
  id: string;
  nickname: string;
  avatar: string;
  online: boolean;
}

interface Lyric {
  id: string;
  roomId: string;
  memberId: string;
  memberNickname: string;
  content: string;
  keyword: string;
  timestamp: number;
}

interface Room {
  id: string;
  members: Member[];
  currentTurnIndex: number;
  status: 'waiting' | 'countdown' | 'playing' | 'finished';
  lyrics: Lyric[];
  createdAt: number;
}

const DATA_DIR = path.join(__dirname, '..', 'data');
const ROOMS_FILE = path.join(DATA_DIR, 'rooms.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadRooms(): Record<string, Room> {
  ensureDataDir();
  if (!fs.existsSync(ROOMS_FILE)) return {};
  try {
    const data = fs.readFileSync(ROOMS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

function saveRooms(rooms: Record<string, Room>) {
  ensureDataDir();
  fs.writeFileSync(ROOMS_FILE, JSON.stringify(rooms, null, 2), 'utf-8');
}

const AVATAR_COLORS = [
  '#e94560', '#0f3460', '#533483', '#e94560',
  '#1a73e8', '#34a853', '#fbbc05', '#ea4335',
  '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4',
];

function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.post('/api/rooms', (req, res) => {
  const rooms = loadRooms();
  const { nickname } = req.body;
  if (!nickname || typeof nickname !== 'string' || nickname.trim().length === 0) {
    res.status(400).json({ error: 'Nickname is required' });
    return;
  }
  let roomId = generateRoomId();
  while (rooms[roomId]) {
    roomId = generateRoomId();
  }
  const memberId = uuidv4();
  const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
  const member: Member = {
    id: memberId,
    nickname: nickname.trim(),
    avatar: avatarColor,
    online: true,
  };
  const room: Room = {
    id: roomId,
    members: [member],
    currentTurnIndex: 0,
    status: 'waiting',
    lyrics: [],
    createdAt: Date.now(),
  };
  rooms[roomId] = room;
  saveRooms(rooms);
  res.json({ room, memberId });
});

app.post('/api/rooms/join', (req, res) => {
  const rooms = loadRooms();
  const { roomId, nickname } = req.body;
  if (!roomId || !nickname || typeof nickname !== 'string' || nickname.trim().length === 0) {
    res.status(400).json({ error: 'Room ID and nickname are required' });
    return;
  }
  const room = rooms[roomId.toUpperCase()];
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }
  if (room.status !== 'waiting') {
    res.status(400).json({ error: 'Game already in progress' });
    return;
  }
  const memberId = uuidv4();
  const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
  const member: Member = {
    id: memberId,
    nickname: nickname.trim(),
    avatar: avatarColor,
    online: true,
  };
  room.members.push(member);
  saveRooms(rooms);
  res.json({ room, memberId });
});

app.get('/api/rooms/:id', (req, res) => {
  const rooms = loadRooms();
  const room = rooms[req.params.id.toUpperCase()];
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }
  res.json({ room });
});

app.post('/api/rooms/:id/start', (req, res) => {
  const rooms = loadRooms();
  const room = rooms[req.params.id.toUpperCase()];
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }
  if (room.members.length < 2) {
    res.status(400).json({ error: 'At least 2 players required' });
    return;
  }
  room.status = 'playing';
  room.currentTurnIndex = 0;
  saveRooms(rooms);
  res.json({ room });
});

app.post('/api/rooms/:id/lyrics', (req, res) => {
  const rooms = loadRooms();
  const room = rooms[req.params.id.toUpperCase()];
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }
  const { memberId, content, keyword } = req.body;
  if (!memberId || !content || typeof content !== 'string' || content.trim().length === 0) {
    res.status(400).json({ error: 'Member ID and lyric content are required' });
    return;
  }
  if (content.trim().length > 200) {
    res.status(400).json({ error: 'Lyric content too long (max 200 characters)' });
    return;
  }
  const currentMember = room.members[room.currentTurnIndex];
  if (!currentMember || currentMember.id !== memberId) {
    res.status(400).json({ error: 'Not your turn' });
    return;
  }
  const lyric: Lyric = {
    id: uuidv4(),
    roomId: room.id,
    memberId,
    memberNickname: currentMember.nickname,
    content: content.trim(),
    keyword: keyword || '',
    timestamp: Date.now(),
  };
  room.lyrics.push(lyric);
  room.currentTurnIndex = (room.currentTurnIndex + 1) % room.members.length;
  if (room.currentTurnIndex === 0) {
    room.status = 'finished';
  }
  saveRooms(rooms);
  res.json({ room, lyric });
});

app.get('/api/rooms/:id/lyrics', (req, res) => {
  const rooms = loadRooms();
  const room = rooms[req.params.id.toUpperCase()];
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }
  res.json({ lyrics: room.lyrics });
});

app.post('/api/rooms/:id/leave', (req, res) => {
  const rooms = loadRooms();
  const room = rooms[req.params.id.toUpperCase()];
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }
  const { memberId } = req.body;
  if (!memberId) {
    res.status(400).json({ error: 'Member ID is required' });
    return;
  }
  const member = room.members.find((m) => m.id === memberId);
  if (member) {
    member.online = false;
    saveRooms(rooms);
  }
  res.json({ success: true });
});

app.get('/api/rooms/:id/export', (req, res) => {
  const rooms = loadRooms();
  const room = rooms[req.params.id.toUpperCase()];
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }
  const format = (req.query.format as string) || 'text';
  if (format === 'html') {
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><title>歌词接龙 - ${room.id}</title>
<style>body{font-family:sans-serif;max-width:640px;margin:2em auto;padding:0 1em;background:#1a1a2e;color:#e0e0e0}
.line{padding:1em 0;border-bottom:1px solid #2a2a4e}.author{color:#e94560;font-size:0.9em}.time{color:#888;font-size:0.8em;margin-left:1em}
h1{color:#e94560}</style></head>
<body><h1>🎵 歌词接龙 #${room.id}</h1>
${room.lyrics.map((l) => `<div class="line"><div class="author">${l.memberNickname}<span class="time">${new Date(l.timestamp).toLocaleString()}</span></div><div>${l.content}</div></div>`).join('\n')}
</body></html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="lyric-chain-${room.id}.html"`);
    res.send(html);
  } else {
    const text = room.lyrics
      .map((l) => `[${new Date(l.timestamp).toLocaleString()}] ${l.memberNickname}: ${l.content}`)
      .join('\n');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="lyric-chain-${room.id}.txt"`);
    res.send(`歌词接龙 #${room.id}\n${'='.repeat(40)}\n\n${text}`);
  }
});

app.post('/api/rooms/:id/reset', (req, res) => {
  const rooms = loadRooms();
  const room = rooms[req.params.id.toUpperCase()];
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }
  room.status = 'waiting';
  room.currentTurnIndex = 0;
  room.lyrics = [];
  saveRooms(rooms);
  res.json({ room });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
