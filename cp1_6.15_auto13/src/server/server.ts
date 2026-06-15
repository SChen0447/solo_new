import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'votes.json');

interface VoteOption {
  id: string;
  text: string;
  count: number;
}

interface Vote {
  id: string;
  title: string;
  options: VoteOption[];
  createdAt: number;
  votedIps: string[];
}

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ votes: [] }, null, 2));
}

function readData(): { votes: Vote[] } {
  const content = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(content);
}

function writeData(data: { votes: Vote[] }): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'] as string;
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return (req.ip || req.socket.remoteAddress || '').replace('::ffff:', '');
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'DELETE'],
  },
});

app.use(cors());
app.use(express.json());

app.get('/api/votes', (_req: Request, res: Response) => {
  const data = readData();
  res.json(data.votes);
});

app.get('/api/votes/:id', (req: Request, res: Response) => {
  const data = readData();
  const vote = data.votes.find((v) => v.id === req.params.id);
  if (!vote) {
    return res.status(404).json({ error: '投票不存在' });
  }
  res.json(vote);
});

app.post('/api/votes', (req: Request, res: Response) => {
  const { title, options } = req.body;

  if (!title || title.length < 5 || title.length > 30) {
    return res.status(400).json({ error: '投票标题长度需在5-30个字之间' });
  }
  if (!Array.isArray(options) || options.length < 2) {
    return res.status(400).json({ error: '至少需要2个选项' });
  }
  for (const opt of options) {
    if (!opt || opt.length < 1 || opt.length > 10) {
      return res.status(400).json({ error: '每个选项长度需在1-10个字之间' });
    }
  }

  const newVote: Vote = {
    id: uuidv4(),
    title,
    options: options.map((text: string) => ({
      id: uuidv4(),
      text,
      count: 0,
    })),
    createdAt: Date.now(),
    votedIps: [],
  };

  const data = readData();
  data.votes.unshift(newVote);
  writeData(data);

  io.emit('voteCreated', newVote);
  res.status(201).json(newVote);
});

app.post('/api/votes/:id/vote', (req: Request, res: Response) => {
  const { optionId } = req.body;
  const data = readData();
  const voteIndex = data.votes.findIndex((v) => v.id === req.params.id);

  if (voteIndex === -1) {
    return res.status(404).json({ error: '投票不存在' });
  }

  const clientIp = getClientIp(req);
  const vote = data.votes[voteIndex];

  if (vote.votedIps.includes(clientIp)) {
    return res.status(403).json({ error: '您已经投过票了' });
  }

  const option = vote.options.find((o) => o.id === optionId);
  if (!option) {
    return res.status(400).json({ error: '选项不存在' });
  }

  option.count += 1;
  vote.votedIps.push(clientIp);
  data.votes[voteIndex] = vote;
  writeData(data);

  io.emit('voteUpdated', { voteId: vote.id, options: vote.options });
  res.json(vote);
});

app.delete('/api/votes/:id', (req: Request, res: Response) => {
  const data = readData();
  const filtered = data.votes.filter((v) => v.id !== req.params.id);
  if (filtered.length === data.votes.length) {
    return res.status(404).json({ error: '投票不存在' });
  }
  data.votes = filtered;
  writeData(data);
  io.emit('voteDeleted', req.params.id);
  res.json({ success: true });
});

app.post('/api/votes/:id/reset', (req: Request, res: Response) => {
  const data = readData();
  const voteIndex = data.votes.findIndex((v) => v.id === req.params.id);
  if (voteIndex === -1) {
    return res.status(404).json({ error: '投票不存在' });
  }
  data.votes[voteIndex].options.forEach((o) => (o.count = 0));
  data.votes[voteIndex].votedIps = [];
  writeData(data);
  io.emit('voteUpdated', {
    voteId: data.votes[voteIndex].id,
    options: data.votes[voteIndex].options,
  });
  res.json(data.votes[voteIndex]);
});

app.post('/api/admin/login', (req: Request, res: Response) => {
  const { password } = req.body;
  if (password === 'admin123') {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: '密码错误' });
  }
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
