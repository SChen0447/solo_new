import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import { roomManager, SkillNode } from './roomManager';

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = 4000;

// REST API - 获取所有技能树
app.get('/api/skilltrees', (req, res) => {
  const rooms = roomManager.getAllRooms();
  res.json(rooms.map(r => ({
    id: r.id,
    name: r.skillTree.name,
    nodeCount: r.skillTree.nodes.length,
  })));
});

// REST API - 创建技能树
app.post('/api/skilltrees', (req, res) => {
  const { name } = req.body;
  const room = roomManager.createRoom();
  room.skillTree.name = name || '新技能树';
  res.json(room.skillTree);
});

// REST API - 获取单个技能树
app.get('/api/skilltrees/:id', (req, res) => {
  const room = roomManager.getRoom(req.params.id);
  if (room) {
    res.json(room.skillTree);
  } else {
    res.status(404).json({ error: 'Skill tree not found' });
  }
});

// REST API - 更新技能树
app.put('/api/skilltrees/:id', (req, res) => {
  const room = roomManager.getRoom(req.params.id);
  if (room) {
    room.skillTree = { ...room.skillTree, ...req.body };
    res.json(room.skillTree);
  } else {
    res.status(404).json({ error: 'Skill tree not found' });
  }
});

// REST API - 删除技能树
app.delete('/api/skilltrees/:id', (req, res) => {
  const room = roomManager.getRoom(req.params.id);
  if (room) {
    // 简化：实际应该删除房间
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Skill tree not found' });
  }
});

// Socket.IO 实时同步
io.on('connection', (socket) => {
  let currentRoomId: string | null = null;

  socket.on('join-room', (roomId: string) => {
    if (currentRoomId) {
      socket.leave(currentRoomId);
      roomManager.removeClient(currentRoomId, socket.id);
    }

    currentRoomId = roomId;
    socket.join(roomId);
    const room = roomManager.addClient(roomId, socket.id);
    
    socket.emit('skill-tree-data', room.skillTree);
    
    socket.to(roomId).emit('user-joined', {
      clientId: socket.id,
      userCount: room.clients.size,
    });
  });

  socket.on('add-node', (node: SkillNode) => {
    if (!currentRoomId) return;
    roomManager.addNode(currentRoomId, node);
    socket.to(currentRoomId).emit('node-added', node);
  });

  socket.on('update-node', (nodeId: string, updates: Partial<SkillNode>) => {
    if (!currentRoomId) return;
    roomManager.updateNode(currentRoomId, nodeId, updates);
    socket.to(currentRoomId).emit('node-updated', nodeId, updates);
  });

  socket.on('delete-node', (nodeId: string) => {
    if (!currentRoomId) return;
    roomManager.deleteNode(currentRoomId, nodeId);
    socket.to(currentRoomId).emit('node-deleted', nodeId);
  });

  socket.on('move-node', (nodeId: string, x: number, y: number) => {
    if (!currentRoomId) return;
    roomManager.updateNode(currentRoomId, nodeId, { x, y });
    socket.to(currentRoomId).emit('node-moved', nodeId, x, y);
  });

  socket.on('set-total-points', (points: number) => {
    if (!currentRoomId) return;
    roomManager.setTotalPoints(currentRoomId, points);
    socket.to(currentRoomId).emit('total-points-updated', points);
  });

  socket.on('reset-points', () => {
    if (!currentRoomId) return;
    roomManager.resetPoints(currentRoomId);
    const room = roomManager.getRoom(currentRoomId);
    if (room) {
      socket.to(currentRoomId).emit('points-reset', room.skillTree);
    }
  });

  socket.on('disconnect', () => {
    if (currentRoomId) {
      roomManager.removeClient(currentRoomId, socket.id);
      socket.to(currentRoomId).emit('user-left', {
        clientId: socket.id,
      });
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
