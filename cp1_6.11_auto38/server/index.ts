import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import { roomManager, generateRandomUser } from './roomManager.js';
import type { WsMessage, User, SubmitIdeaPayload, VotePayload } from '../shared/types.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

interface ClientData {
  roomCode: string;
  userId: string;
}

const wsClients = new Map<WebSocket, ClientData>();

function broadcastToRoom(roomCode: string, message: WsMessage, excludeWs?: WebSocket) {
  const payload = JSON.stringify(message);
  for (const [ws, data] of wsClients) {
    if (data.roomCode === roomCode && ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

app.post('/api/rooms', (_req, res) => {
  const room = roomManager.createRoom();
  res.json({ code: room.code });
});

app.get('/api/rooms/:code', (req, res) => {
  const room = roomManager.getRoom(req.params.code);
  if (!room) {
    return res.status(404).json({ error: '房间不存在' });
  }
  const sortedIdeas = roomManager.getSortedIdeas(req.params.code);
  res.json({ ...room, ideas: sortedIdeas });
});

app.post('/api/user', (_req, res) => {
  const user = generateRandomUser();
  res.json(user);
});

app.post('/api/rooms/:code/join', (req, res) => {
  const { code } = req.params;
  const user: User = req.body.user;
  const room = roomManager.addMember(code, user);
  if (!room) {
    return res.status(404).json({ error: '房间不存在' });
  }
  const sortedIdeas = roomManager.getSortedIdeas(code);
  res.json({ ...room, ideas: sortedIdeas });
});

app.post('/api/rooms/:code/ideas', (req, res) => {
  const { code } = req.params;
  const payload: SubmitIdeaPayload = { roomCode: code, content: req.body.content, userId: req.body.userId };
  const user: User = req.body.user;
  const result = roomManager.submitIdea(payload, user);
  if ('error' in result) {
    return res.status(400).json({ error: result.error });
  }
  const sortedIdeas = roomManager.getSortedIdeas(code);
  broadcastToRoom(code, { type: 'idea_added', data: result.idea });
  res.json({ idea: result.idea, ideas: sortedIdeas });
});

app.post('/api/rooms/:code/ideas/:ideaId/vote', (req, res) => {
  const { code, ideaId } = req.params;
  const payload: VotePayload = {
    roomCode: code,
    ideaId,
    userId: req.body.userId,
    voteType: req.body.voteType
  };
  const result = roomManager.vote(payload);
  if ('error' in result) {
    return res.status(400).json({ error: result.error });
  }
  const sortedIdeas = roomManager.getSortedIdeas(code);
  broadcastToRoom(code, { type: 'vote_updated', data: result.idea });
  res.json({ idea: result.idea, ideas: sortedIdeas });
});

app.get('/api/rooms/:code/export', (req, res) => {
  const { code } = req.params;
  const room = roomManager.getRoom(code);
  if (!room) {
    return res.status(404).json({ error: '房间不存在' });
  }
  const sortedIdeas = roomManager.getSortedIdeas(code).map(idea => ({
    id: idea.id,
    content: idea.content,
    author: idea.authorNickname,
    upvotes: idea.upvotes,
    downvotes: idea.downvotes,
    netVotes: idea.upvotes - idea.downvotes,
    submittedAt: new Date(idea.createdAt).toISOString()
  }));
  const report = {
    roomCode: code,
    exportedAt: new Date().toISOString(),
    totalIdeas: sortedIdeas.length,
    members: Object.values(room.members).map(m => ({ nickname: m.nickname, avatar: m.avatar })),
    ideas: sortedIdeas
  };
  res.json(report);
});

wss.on('connection', (ws, req) => {
  const url = new URL(req.url || '/', 'http://localhost');
  const roomCode = url.searchParams.get('room');
  const userId = url.searchParams.get('userId');

  if (!roomCode || !userId) {
    ws.close(4000, '缺少房间码或用户ID');
    return;
  }

  const room = roomManager.getRoom(roomCode);
  if (!room) {
    ws.close(4001, '房间不存在');
    return;
  }

  wsClients.set(ws, { roomCode, userId });

  const user = room.members[userId] || generateRandomUser();
  broadcastToRoom(roomCode, { type: 'member_joined', data: user }, ws);

  ws.on('close', () => {
    wsClients.delete(ws);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Brainstorm server running on http://localhost:${PORT}`);
});
