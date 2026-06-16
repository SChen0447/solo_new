import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

interface MindMapNode {
  id: string;
  text: string;
  x: number;
  y: number;
  parentId: string | null;
  children: string[];
}

interface Snapshot {
  id: string;
  version: number;
  action: string;
  operator: string;
  timestamp: number;
  nodes: Record<string, MindMapNode>;
  theme: string;
}

interface Room {
  id: string;
  nodes: Record<string, MindMapNode>;
  theme: string;
  users: Map<string, { socketId: string; nickname: string }>;
  snapshots: Snapshot[];
  snapshotVersion: number;
}

const rooms: Map<string, Room> = new Map();

function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function createDefaultNodes(roomId: string): Record<string, MindMapNode> {
  const rootNodeId = uuidv4();
  return {
    [rootNodeId]: {
      id: rootNodeId,
      text: '新想法',
      x: 0,
      y: 0,
      parentId: null,
      children: [],
    },
  };
}

function createSnapshot(room: Room, action: string, operator: string): Snapshot {
  room.snapshotVersion += 1;
  const snapshot: Snapshot = {
    id: uuidv4(),
    version: room.snapshotVersion,
    action,
    operator,
    timestamp: Date.now(),
    nodes: JSON.parse(JSON.stringify(room.nodes)),
    theme: room.theme,
  };
  room.snapshots.push(snapshot);
  return snapshot;
}

function getDescendantIds(nodes: Record<string, MindMapNode>, nodeId: string): string[] {
  const result: string[] = [];
  const node = nodes[nodeId];
  if (!node) return result;
  for (const childId of node.children) {
    result.push(childId);
    result.push(...getDescendantIds(nodes, childId));
  }
  return result;
}

app.post('/api/rooms', (_req, res) => {
  let roomId = generateRoomId();
  while (rooms.has(roomId)) {
    roomId = generateRoomId();
  }
  const room: Room = {
    id: roomId,
    nodes: createDefaultNodes(roomId),
    theme: 'default',
    users: new Map(),
    snapshots: [],
    snapshotVersion: 0,
  };
  createSnapshot(room, '创建导图', '系统');
  rooms.set(roomId, room);
  res.json({ roomId, nodes: room.nodes, theme: room.theme });
});

app.get('/api/rooms/:roomId', (req, res) => {
  const room = rooms.get(req.params.roomId);
  if (!room) {
    res.status(404).json({ error: '房间不存在' });
    return;
  }
  res.json({ roomId: room.id, nodes: room.nodes, theme: room.theme });
});

app.get('/api/rooms/:roomId/snapshots', (req, res) => {
  const room = rooms.get(req.params.roomId);
  if (!room) {
    res.status(404).json({ error: '房间不存在' });
    return;
  }
  res.json(room.snapshots);
});

app.get('/api/rooms/:roomId/snapshots/:snapshotId', (req, res) => {
  const room = rooms.get(req.params.roomId);
  if (!room) {
    res.status(404).json({ error: '房间不存在' });
    return;
  }
  const snapshot = room.snapshots.find((s) => s.id === req.params.snapshotId);
  if (!snapshot) {
    res.status(404).json({ error: '快照不存在' });
    return;
  }
  res.json(snapshot);
});

io.on('connection', (socket) => {
  let currentRoomId: string | null = null;
  let currentNickname: string = '';

  socket.on('join-room', (data: { roomId: string; nickname: string }) => {
    const room = rooms.get(data.roomId);
    if (!room) {
      socket.emit('error-message', '房间不存在');
      return;
    }
    if (room.users.size >= 6) {
      socket.emit('error-message', '房间已满（最多6人）');
      return;
    }
    currentRoomId = data.roomId;
    currentNickname = data.nickname;
    socket.join(data.roomId);
    room.users.set(socket.id, { socketId: socket.id, nickname: data.nickname });
    socket.emit('room-joined', {
      roomId: room.id,
      nodes: room.nodes,
      theme: room.theme,
      users: Array.from(room.users.values()).map((u) => u.nickname),
    });
    socket.to(data.roomId).emit('user-joined', { nickname: data.nickname });
  });

  socket.on('add-node', (data: { parentId: string; nodeId: string; text: string; x: number; y: number }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;
    const parent = room.nodes[data.parentId];
    if (!parent) return;
    const newNode: MindMapNode = {
      id: data.nodeId,
      text: data.text,
      x: data.x,
      y: data.y,
      parentId: data.parentId,
      children: [],
    };
    room.nodes[data.nodeId] = newNode;
    parent.children.push(data.nodeId);
    const snapshot = createSnapshot(room, '添加节点', currentNickname);
    io.to(currentRoomId).emit('node-added', { node: newNode, parentId: data.parentId });
    io.to(currentRoomId).emit('snapshot-created', snapshot);
  });

  socket.on('move-node', (data: { nodeId: string; x: number; y: number; children: { id: string; x: number; y: number }[] }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;
    const node = room.nodes[data.nodeId];
    if (!node) return;
    node.x = data.x;
    node.y = data.y;
    for (const child of data.children) {
      const cn = room.nodes[child.id];
      if (cn) {
        cn.x = child.x;
        cn.y = child.y;
      }
    }
    socket.to(currentRoomId).emit('node-moved', data);
  });

  socket.on('move-node-end', (data: { nodeId: string; x: number; y: number; children: { id: string; x: number; y: number }[] }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;
    const node = room.nodes[data.nodeId];
    if (!node) return;
    node.x = data.x;
    node.y = data.y;
    for (const child of data.children) {
      const cn = room.nodes[child.id];
      if (cn) {
        cn.x = child.x;
        cn.y = child.y;
      }
    }
    const snapshot = createSnapshot(room, '移动节点', currentNickname);
    io.to(currentRoomId).emit('snapshot-created', snapshot);
  });

  socket.on('update-node-text', (data: { nodeId: string; text: string }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;
    const node = room.nodes[data.nodeId];
    if (!node) return;
    node.text = data.text;
    const snapshot = createSnapshot(room, '修改内容', currentNickname);
    io.to(currentRoomId).emit('node-text-updated', { nodeId: data.nodeId, text: data.text });
    io.to(currentRoomId).emit('snapshot-created', snapshot);
  });

  socket.on('delete-node', (data: { nodeId: string }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;
    const node = room.nodes[data.nodeId];
    if (!node) return;
    const descendantIds = getDescendantIds(room.nodes, data.nodeId);
    const allDeleteIds = [data.nodeId, ...descendantIds];
    if (node.parentId) {
      const parent = room.nodes[node.parentId];
      if (parent) {
        parent.children = parent.children.filter((id) => id !== data.nodeId);
      }
    }
    for (const id of allDeleteIds) {
      delete room.nodes[id];
    }
    const snapshot = createSnapshot(room, '删除节点', currentNickname);
    io.to(currentRoomId).emit('node-deleted', { nodeIds: allDeleteIds });
    io.to(currentRoomId).emit('snapshot-created', snapshot);
  });

  socket.on('change-theme', (data: { theme: string }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;
    room.theme = data.theme;
    const snapshot = createSnapshot(room, '切换主题', currentNickname);
    io.to(currentRoomId).emit('theme-changed', { theme: data.theme });
    io.to(currentRoomId).emit('snapshot-created', snapshot);
  });

  socket.on('restore-snapshot', (data: { snapshotId: string }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;
    const snapshot = room.snapshots.find((s) => s.id === data.snapshotId);
    if (!snapshot) return;
    room.nodes = JSON.parse(JSON.stringify(snapshot.nodes));
    room.theme = snapshot.theme;
    const newSnapshot = createSnapshot(room, `恢复到版本${snapshot.version}`, currentNickname);
    io.to(currentRoomId).emit('snapshot-restored', {
      nodes: room.nodes,
      theme: room.theme,
    });
    io.to(currentRoomId).emit('snapshot-created', newSnapshot);
  });

  socket.on('disconnect', () => {
    if (currentRoomId) {
      const room = rooms.get(currentRoomId);
      if (room) {
        room.users.delete(socket.id);
        socket.to(currentRoomId).emit('user-left', { nickname: currentNickname });
        if (room.users.size === 0) {
          setTimeout(() => {
            const r = rooms.get(currentRoomId!);
            if (r && r.users.size === 0) {
              rooms.delete(currentRoomId!);
            }
          }, 60000);
        }
      }
    }
  });
});

const PORT = 4000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
