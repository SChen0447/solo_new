import express from 'express';
import cors from 'cors';
import { dataStore, CreateRoomRequest, JoinRoomRequest, SpeakRequest, VoteRequest } from './dataStore';

const app = express();
const PORT = 3006;

app.use(cors());
app.use(express.json());

app.post('/api/rooms', (req, res) => {
  const request: CreateRoomRequest = req.body;

  if (!request.topic || request.topic.length > 100) {
    return res.status(400).json({ error: '辩题不能为空且不能超过100字' });
  }
  if (!request.proName || !request.conName) {
    return res.status(400).json({ error: '正反方名称不能为空' });
  }
  if (![30, 60, 90].includes(request.timeLimit)) {
    return res.status(400).json({ error: '发言时间限制必须是30秒、60秒或90秒' });
  }
  if (!request.ownerNickname) {
    return res.status(400).json({ error: '房主昵称不能为空' });
  }

  const result = dataStore.createRoom(request);
  res.json(result);
});

app.get('/api/rooms', (_req, res) => {
  const rooms = dataStore.getRooms();
  res.json(rooms);
});

app.post('/api/rooms/:roomCode/join', (req, res) => {
  const { roomCode } = req.params;
  const request: JoinRoomRequest = req.body;

  if (!request.nickname) {
    return res.status(400).json({ error: '昵称不能为空' });
  }

  const result = dataStore.joinRoom(roomCode.toUpperCase(), request.nickname);
  if (!result) {
    return res.status(400).json({ error: '加入房间失败，房间不存在或已满员' });
  }

  res.json(result);
});

app.post('/api/rooms/:roomCode/start', (req, res) => {
  const { roomCode } = req.params;
  const { ownerId } = req.body;

  const success = dataStore.startDebate(roomCode.toUpperCase(), ownerId);
  if (!success) {
    return res.status(400).json({ error: '开始辩论失败' });
  }

  res.json({ success: true });
});

app.post('/api/rooms/:roomCode/speak', (req, res) => {
  const { roomCode } = req.params;
  const request: SpeakRequest = req.body;

  if (!request.memberId || !request.content) {
    return res.status(400).json({ error: '发言信息不完整' });
  }

  const speech = dataStore.addSpeech(roomCode.toUpperCase(), request.memberId, request.content);
  if (!speech) {
    return res.status(400).json({ error: '发言失败' });
  }

  res.json(speech);
});

app.post('/api/rooms/:roomCode/vote', (req, res) => {
  const { roomCode } = req.params;
  const request: VoteRequest = req.body;

  if (!request.voterId || !request.sideVote || !request.bestSpeakerId) {
    return res.status(400).json({ error: '投票信息不完整' });
  }

  const success = dataStore.submitVote(roomCode.toUpperCase(), request);
  if (!success) {
    return res.status(400).json({ error: '投票失败' });
  }

  res.json({ success: true });
});

app.get('/api/rooms/:roomCode', (req, res) => {
  const { roomCode } = req.params;
  const room = dataStore.getRoomFullData(roomCode.toUpperCase());

  if (!room) {
    return res.status(404).json({ error: '房间不存在' });
  }

  const currentSpeaker = dataStore.getCurrentSpeaker(roomCode.toUpperCase());

  res.json({
    ...room,
    currentSpeaker,
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
