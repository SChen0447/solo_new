import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors());
const server = createServer(app);

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

const CURSOR_COLORS = ['#FF6B6B', '#4A9EFF', '#51CF66', '#FF922B', '#CC5DE8'];
const MAX_USERS_PER_ROOM = 5;

interface LyricLine {
  id: string;
  text: string;
  beat: { bpm: number; duration: number } | null;
}

interface RoomState {
  lyrics: LyricLine[];
  users: Map<string, { color: string; cursor: { line: number; col: number } }>;
}

const rooms = new Map<string, RoomState>();

function getOrCreateRoom(roomId: string): RoomState {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, { lyrics: [], users: new Map() });
  }
  return rooms.get(roomId)!;
}

function assignColor(room: RoomState): string {
  const usedColors = new Set(Array.from(room.users.values()).map((u) => u.color));
  const available = CURSOR_COLORS.find((c) => !usedColors.has(c));
  return available || CURSOR_COLORS[room.users.size % CURSOR_COLORS.length];
}

io.on('connection', (socket) => {
  const userId = uuidv4();
  console.log(`User connected: ${userId}`);

  socket.on('join-room', (roomId: string) => {
    if (!/^\d{6}$/.test(roomId)) {
      socket.emit('error-msg', '房间号必须为6位数字');
      return;
    }

    const room = getOrCreateRoom(roomId);
    if (room.users.size >= MAX_USERS_PER_ROOM) {
      socket.emit('error-msg', '房间已满（最多5人）');
      return;
    }

    const color = assignColor(room);
    room.users.set(userId, { color, cursor: { line: 0, col: 0 } });

    socket.join(roomId);
    socket.data = { userId, roomId };

    socket.emit('room-joined', {
      userId,
      color,
      lyrics: room.lyrics,
      users: Array.from(room.users.entries()).map(([id, u]) => ({
        userId: id,
        color: u.color,
        cursor: u.cursor,
      })),
    });

    socket.to(roomId).emit('user-joined', {
      userId,
      color,
      cursor: { line: 0, col: 0 },
    });
  });

  socket.on('lyric-edit', (data: { lyrics: LyricLine[] }) => {
    const { roomId } = socket.data || {};
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;
    room.lyrics = data.lyrics;
    socket.to(roomId).emit('lyric-update', { lyrics: data.lyrics });
  });

  socket.on('cursor-move', (data: { line: number; col: number }) => {
    const { roomId } = socket.data || {};
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;
    const user = room.users.get(userId);
    if (!user) return;
    user.cursor = { line: data.line, col: data.col };
    socket.to(roomId).emit('cursor-update', { userId, cursor: user.cursor });
  });

  socket.on('beat-update', (data: { lineId: string; beat: { bpm: number; duration: number } | null }) => {
    const { roomId } = socket.data || {};
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;
    const line = room.lyrics.find((l) => l.id === data.lineId);
    if (line) {
      line.beat = data.beat;
      socket.to(roomId).emit('beat-change', data);
    }
  });

  socket.on('batch-beat-update', (data: { lineIds: string[]; beat: { bpm: number; duration: number } }) => {
    const { roomId } = socket.data || {};
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;
    for (const lineId of data.lineIds) {
      const line = room.lyrics.find((l) => l.id === lineId);
      if (line) line.beat = { ...data.beat };
    }
    socket.to(roomId).emit('batch-beat-change', data);
  });

  socket.on('disconnect', () => {
    const { roomId } = socket.data || {};
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;
    room.users.delete(userId);
    socket.to(roomId).emit('user-left', { userId });
    if (room.users.size === 0) {
      rooms.delete(roomId);
    }
    console.log(`User disconnected: ${userId}`);
  });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', rooms: rooms.size });
});

const PORT = 8000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
