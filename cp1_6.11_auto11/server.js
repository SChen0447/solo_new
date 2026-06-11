import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors());

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const users = new Map();
const commandHistory = [];
const MAX_HISTORY = 10000;

function generateColor(userId) {
  const COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    '#F8B500', '#FF8C00', '#2ECC71', '#3498DB', '#E74C3C',
    '#1ABC9C', '#F39C12', '#E67E22', '#27AE60', '#2980B9'
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

function broadcastUsers() {
  const userList = Array.from(users.values());
  io.emit('users:update', userList);
}

io.on('connection', (socket) => {
  const { userId, userName } = socket.handshake.auth;

  if (!userId) {
    socket.disconnect();
    return;
  }

  const user = {
    id: userId,
    name: userName || '匿名用户',
    color: generateColor(userId)
  };

  users.set(userId, user);
  console.log(`用户连接: ${user.name} (${userId})`);

  socket.emit('history:load', commandHistory);

  broadcastUsers();

  socket.on('history:request', () => {
    socket.emit('history:load', commandHistory);
  });

  socket.on('draw:command', (command) => {
    if (command.type === 'canvas:clear') {
      commandHistory.length = 0;
    } else {
      commandHistory.push(command);
      if (commandHistory.length > MAX_HISTORY) {
        commandHistory.shift();
      }
    }

    socket.broadcast.emit('draw:command', command);
  });

  socket.on('disconnect', () => {
    users.delete(userId);
    console.log(`用户断开: ${user.name} (${userId})`);
    broadcastUsers();
  });
});

server.listen(PORT, () => {
  console.log(`协作白板服务端运行在 http://localhost:${PORT}`);
  console.log(`等待客户端连接...`);
});
