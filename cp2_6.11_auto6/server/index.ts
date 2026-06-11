import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import {
  ensureRoom,
  getRoom,
  addDrawAction,
  getSnapshot,
  addStickyNote,
  updateStickyNote,
  deleteStickyNote,
  getUsers,
  addUser,
  removeUser,
  updateUserCursor,
  getTimeline,
} from './src/dataStore';
import { UserInfo, DrawAction, StickyNoteData } from './src/types';

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
  },
});

const userColors: string[] = [
  '#EF4444',
  '#F59E0B',
  '#10B981',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
  '#F97316',
  '#06B6D4',
  '#84CC16',
];

function getRandomColor(): string {
  return userColors[Math.floor(Math.random() * userColors.length)];
}

interface PendingCursor {
  x: number;
  y: number;
  timer: NodeJS.Timeout;
}

const pendingCursors = new Map<string, PendingCursor>();
const CURSOR_MERGE_WINDOW = 50;

function broadcastCursor(roomId: string, userId: string, user: UserInfo, x: number, y: number) {
  io.to(roomId).emit('cursor-move', {
    userId,
    x,
    y,
    color: user.color,
    name: user.name,
  });
}

function enqueueCursorBroadcast(
  roomId: string,
  userId: string,
  user: UserInfo,
  x: number,
  y: number
) {
  const key = `${roomId}:${userId}`;
  const pending = pendingCursors.get(key);
  if (pending) {
    pending.x = x;
    pending.y = y;
    return;
  }
  pendingCursors.set(key, {
    x,
    y,
    timer: setTimeout(() => {
      const p = pendingCursors.get(key);
      if (p) {
        broadcastCursor(roomId, userId, user, p.x, p.y);
        pendingCursors.delete(key);
      }
    }, CURSOR_MERGE_WINDOW),
  });
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

io.on('connection', (socket: Socket) => {
  let currentRoom: string | null = null;
  let currentUser: UserInfo | null = null;

  socket.on('create-room', () => {
    const roomId = uuidv4().slice(0, 8);
    ensureRoom(roomId);
    socket.emit('room-created', { roomId });
  });

  socket.on('join-room', ({ roomId, userName }: { roomId: string; userName: string }) => {
    const room = getRoom(roomId);
    if (!room) {
      socket.emit('room-joined', {
        roomId,
        users: [],
        history: [],
        stickyNotes: [],
        error: 'Room not found',
      });
      return;
    }

    currentRoom = roomId;
    const userId = socket.id;
    const color = getRandomColor();
    const user: UserInfo = { id: userId, name: userName, color, cursorX: 0, cursorY: 0 };
    currentUser = user;

    addUser(roomId, user);
    socket.join(roomId);

    const users = getUsers(roomId);
    const history = getSnapshot(roomId);
    socket.emit('room-joined', {
      roomId,
      users,
      history: history.drawActions,
      stickyNotes: history.stickyNotes,
    });

    socket.to(roomId).emit('user-joined', user);
  });

  socket.on('draw-action', (action: DrawAction) => {
    if (!currentRoom) return;
    addDrawAction(currentRoom, action);
    socket.to(currentRoom).emit('draw-action', action);
  });

  socket.on('sticky-note-add', (note: StickyNoteData) => {
    if (!currentRoom) return;
    addStickyNote(currentRoom, note);
    socket.to(currentRoom).emit('sticky-note-add', note);
  });

  socket.on('sticky-note-update', (note: StickyNoteData) => {
    if (!currentRoom) return;
    updateStickyNote(currentRoom, note);
    socket.to(currentRoom).emit('sticky-note-update', note);
  });

  socket.on('sticky-note-delete', ({ noteId }: { noteId: string }) => {
    if (!currentRoom) return;
    deleteStickyNote(currentRoom, noteId);
    socket.to(currentRoom).emit('sticky-note-delete', { noteId });
  });

  socket.on('cursor-move', ({ x, y }: { x: number; y: number }) => {
    if (!currentRoom || !currentUser) return;
    updateUserCursor(currentRoom, currentUser.id, x, y);
    enqueueCursorBroadcast(currentRoom, currentUser.id, currentUser, x, y);
  });

  socket.on('request-snapshot', ({ timestamp }: { timestamp?: number }) => {
    if (!currentRoom) return;
    const snapshot = getSnapshot(currentRoom, timestamp);
    socket.emit('snapshot-data', snapshot);
  });

  socket.on('request-timeline', () => {
    if (!currentRoom) return;
    const timeline = getTimeline(currentRoom);
    socket.emit('timeline-data', { timeline });
  });

  socket.on('disconnect', () => {
    const key = currentRoom ? `${currentRoom}:${socket.id}` : null;
    if (key) {
      const pending = pendingCursors.get(key);
      if (pending) {
        clearTimeout(pending.timer);
        pendingCursors.delete(key);
      }
    }
    if (currentRoom && currentUser) {
      removeUser(currentRoom, currentUser.id);
      socket.to(currentRoom).emit('user-left', { userId: currentUser.id });
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
