import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import type { User, DocMeta, ChatMessage, OnlineUser } from '../types.js';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

const users: Map<string, User> = new Map();
const docs: Map<string, DocMeta> = new Map();
const docContents: Map<string, any> = new Map();
const docChats: Map<string, ChatMessage[]> = new Map();
const docOnlineUsers: Map<string, Map<string, OnlineUser>> = new Map();

const CURSOR_COLORS = [
  '#E57373', '#64B5F6', '#81C784', '#FFD54F',
  '#BA68C8', '#4DD0E1', '#FF8A65', '#A1887F',
];

function getUser(id: string): User | undefined {
  return users.get(id);
}

function ensureDocChats(docId: string): ChatMessage[] {
  if (!docChats.has(docId)) docChats.set(docId, []);
  return docChats.get(docId)!;
}

app.post('/api/register', (req, res) => {
  const { name, password } = req.body;
  if (!name || !password) {
    res.status(400).json({ error: '用户名和密码不能为空' });
    return;
  }
  for (const u of users.values()) {
    if (u.name === name) {
      res.status(409).json({ error: '用户名已存在' });
      return;
    }
  }
  const id = uuidv4();
  const user: User = { id, name, password };
  users.set(id, user);
  res.json({ id, name });
});

app.post('/api/login', (req, res) => {
  const { name, password } = req.body;
  if (!name || !password) {
    res.status(400).json({ error: '用户名和密码不能为空' });
    return;
  }
  for (const u of users.values()) {
    if (u.name === name && u.password === password) {
      res.json({ id: u.id, name: u.name });
      return;
    }
  }
  res.status(401).json({ error: '用户名或密码错误' });
});

app.get('/api/docs', (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) {
    res.status(400).json({ error: '缺少userId' });
    return;
  }
  const result: DocMeta[] = [];
  for (const doc of docs.values()) {
    if (doc.ownerId === userId || doc.collaboratorIds.includes(userId)) {
      result.push(doc);
    }
  }
  result.sort((a, b) => b.updatedAt - a.updatedAt);
  res.json(result);
});

app.post('/api/docs', (req, res) => {
  const { title, ownerId } = req.body;
  if (!title || !ownerId) {
    res.status(400).json({ error: '标题和所有者不能为空' });
    return;
  }
  const id = uuidv4();
  const doc: DocMeta = {
    id,
    title,
    ownerId,
    collaboratorIds: [],
    updatedAt: Date.now(),
  };
  docs.set(id, doc);
  docContents.set(id, [
    { type: 'paragraph', children: [{ text: '' }] },
  ]);
  res.json(doc);
});

app.get('/api/docs/:id', (req, res) => {
  const doc = docs.get(req.params.id);
  if (!doc) {
    res.status(404).json({ error: '文档不存在' });
    return;
  }
  res.json(doc);
});

app.post('/api/docs/:id/collaborators', (req, res) => {
  const doc = docs.get(req.params.id);
  if (!doc) {
    res.status(404).json({ error: '文档不存在' });
    return;
  }
  const { userId } = req.body;
  if (!userId) {
    res.status(400).json({ error: '缺少userId' });
    return;
  }
  if (!doc.collaboratorIds.includes(userId)) {
    doc.collaboratorIds.push(userId);
  }
  res.json(doc);
});

io.on('connection', (socket) => {
  let currentDocId: string | null = null;
  let currentUser: OnlineUser | null = null;

  socket.on('join-doc', ({ docId, user }: { docId: string; user: OnlineUser }) => {
    if (currentDocId) {
      socket.leave(currentDocId);
      if (docOnlineUsers.has(currentDocId)) {
        docOnlineUsers.get(currentDocId)!.delete(user.id);
        io.to(currentDocId).emit('online-users', Array.from(docOnlineUsers.get(currentDocId)!.values()));
      }
    }

    currentDocId = docId;
    currentUser = user;
    socket.join(docId);

    if (!docOnlineUsers.has(docId)) {
      docOnlineUsers.set(docId, new Map());
    }
    const colorIdx = docOnlineUsers.get(docId)!.size % CURSOR_COLORS.length;
    currentUser.color = user.color || CURSOR_COLORS[colorIdx];
    docOnlineUsers.get(docId)!.set(user.id, currentUser);

    io.to(docId).emit('online-users', Array.from(docOnlineUsers.get(docId)!.values()));

    const messages = ensureDocChats(docId);
    socket.emit('chat-history', messages.slice(-50));
  });

  socket.on('doc-update', (data: { docId: string; update: ArrayBuffer }) => {
    if (currentDocId === data.docId) {
      socket.to(data.docId).emit('doc-update', data.update);
    }
  });

  socket.on('cursor-update', (data: { docId: string; userId: string; cursor: any }) => {
    if (currentDocId === data.docId) {
      socket.to(data.docId).emit('cursor-update', data);
    }
  });

  socket.on('chat-message', (data: { docId: string; message: ChatMessage }) => {
    if (currentDocId === data.docId) {
      const messages = ensureDocChats(data.docId);
      messages.push(data.message);
      if (messages.length > 50) {
        messages.splice(0, messages.length - 50);
      }
      io.to(data.docId).emit('chat-message', data.message);
    }
  });

  socket.on('disconnect', () => {
    if (currentDocId && currentUser) {
      if (docOnlineUsers.has(currentDocId)) {
        docOnlineUsers.get(currentDocId)!.delete(currentUser.id);
        io.to(currentDocId).emit('online-users', Array.from(docOnlineUsers.get(currentDocId)!.values()));
      }
    }
  });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
