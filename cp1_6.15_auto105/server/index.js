const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const rooms = new Map();

function generateRoomCode() {
  let code;
  do {
    code = Math.floor(100000 + Math.random() * 900000).toString();
  } while (rooms.has(code));
  return code;
}

io.on('connection', (socket) => {
  console.log('客户端连接:', socket.id);

  socket.on('create-room', () => {
    const roomCode = generateRoomCode();
    rooms.set(roomCode, {
      host: socket.id,
      guest: null
    });
    socket.join(roomCode);
    socket.data.roomCode = roomCode;
    socket.data.role = 'host';
    console.log('房间创建:', roomCode, '房主:', socket.id);
    socket.emit('room-created', { roomCode });
  });

  socket.on('join-room', ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (!room) {
      socket.emit('room-not-found', { roomCode });
      return;
    }
    if (room.guest) {
      socket.emit('room-full', { roomCode });
      return;
    }
    room.guest = socket.id;
    socket.join(roomCode);
    socket.data.roomCode = roomCode;
    socket.data.role = 'guest';
    console.log('加入房间:', roomCode, '访客:', socket.id);
    socket.emit('room-joined', { roomCode });
    io.to(room.host).emit('peer-connected', { role: 'guest' });
    socket.emit('peer-connected', { role: 'host' });
  });

  socket.on('offer', ({ to, offer }) => {
    console.log('转发Offer:', socket.id, '->', to);
    socket.to(to).emit('offer', { from: socket.id, offer });
  });

  socket.on('answer', ({ to, answer }) => {
    console.log('转发Answer:', socket.id, '->', to);
    socket.to(to).emit('answer', { from: socket.id, answer });
  });

  socket.on('ice-candidate', ({ to, candidate }) => {
    console.log('转发ICE:', socket.id, '->', to);
    socket.to(to).emit('ice-candidate', { from: socket.id, candidate });
  });

  socket.on('disconnect', () => {
    const roomCode = socket.data.roomCode;
    const role = socket.data.role;
    if (roomCode && rooms.has(roomCode)) {
      const room = rooms.get(roomCode);
      if (role === 'host') {
        if (room.guest) {
          io.to(room.guest).emit('peer-disconnected');
        }
        rooms.delete(roomCode);
        console.log('房间删除:', roomCode);
      } else if (role === 'guest') {
        room.guest = null;
        io.to(room.host).emit('peer-disconnected');
        console.log('访客离开:', roomCode);
      }
    }
    console.log('客户端断开:', socket.id);
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`信令服务器运行在 http://localhost:${PORT}`);
});
