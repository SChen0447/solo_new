import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { roomManager, DrawEvent, CursorPosition } from './roomManager';

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  maxHttpBufferSize: 2 * 1024
});

interface JoinRoomData {
  roomId: string;
  userName: string;
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('join-room', (data: JoinRoomData, callback: (response: any) => void) => {
    const { roomId, userName } = data;

    if (!userName || userName.length < 2 || userName.length > 8) {
      callback({ success: false, error: '用户名必须为2-8个字符' });
      return;
    }

    if (!/^\d{4}$/.test(roomId)) {
      callback({ success: false, error: '房间号必须为4位数字' });
      return;
    }

    const result = roomManager.addUser(roomId, socket.id, userName);
    if (!result) {
      callback({ success: false, error: '房间已满，最多8人' });
      return;
    }

    const { user, history } = result;

    socket.join(roomId);
    socket.data = { roomId, user };

    callback({
      success: true,
      user,
      history,
      users: roomManager.getUsers(roomId)
    });

    socket.to(roomId).emit('user-joined', {
      user,
      users: roomManager.getUsers(roomId)
    });

    console.log(`User ${userName} joined room ${roomId}`);
  });

  socket.on('draw', (event: Omit<DrawEvent, 'timestamp'>) => {
    const { roomId } = socket.data;
    if (!roomId) return;

    const drawEvent: DrawEvent = {
      ...event,
      timestamp: Date.now()
    };

    roomManager.addDrawEvent(roomId, drawEvent);
    socket.to(roomId).emit('draw', drawEvent);
  });

  socket.on('cursor-move', (cursor: Omit<CursorPosition, 'timestamp'>) => {
    const { roomId } = socket.data;
    if (!roomId) return;

    const cursorData: CursorPosition = {
      ...cursor,
      timestamp: Date.now()
    };

    roomManager.updateCursor(roomId, cursorData);
    socket.to(roomId).emit('cursor-move', cursorData);
  });

  socket.on('leave-room', () => {
    const { roomId, user } = socket.data;
    if (!roomId || !user) return;

    socket.leave(roomId);
    const remainingUsers = roomManager.removeUser(roomId, socket.id);

    socket.to(roomId).emit('user-left', {
      userId: socket.id,
      users: remainingUsers
    });

    socket.data = {};
    console.log(`User ${user.name} left room ${roomId}`);
  });

  socket.on('disconnect', () => {
    const { roomId, user } = socket.data;
    if (roomId && user) {
      const remainingUsers = roomManager.removeUser(roomId, socket.id);
      socket.to(roomId).emit('user-left', {
        userId: socket.id,
        users: remainingUsers
      });
      console.log(`User ${user.name} disconnected from room ${roomId}`);
    }
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
