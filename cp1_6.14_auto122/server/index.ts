import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Performance, Feedback } from '../src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const PERFORMANCES_FILE = path.join(DATA_DIR, 'performances.json');
const FEEDBACKS_FILE = path.join(DATA_DIR, 'feedbacks.json');

const app = express();
app.use(cors());
app.use(express.json());

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readData<T>(filePath: string, defaultValue: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
      return defaultValue;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return defaultValue;
  }
}

function writeData<T>(filePath: string, data: T): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

const today = new Date();
const fmt = (d: Date) => d.toISOString().split('T')[0];
const addDays = (d: Date, n: number) => {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + n);
  return nd;
};

const samplePerformances: Performance[] = [
  {
    id: 'p-1',
    name: '《雷雨》彩排',
    date: fmt(today),
    startTime: '14:00',
    endTime: '17:00',
    location: '主剧场A厅',
    type: 'rehearsal',
    status: 'scheduled',
    actorIds: ['actor-1', 'actor-2', 'actor-3'],
    color: '#3498DB',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'p-2',
    name: '《茶馆》正式演出',
    date: fmt(addDays(today, 2)),
    startTime: '19:30',
    endTime: '22:00',
    location: '主剧场A厅',
    type: 'show',
    status: 'scheduled',
    actorIds: ['actor-1', 'actor-4', 'actor-5', 'actor-6'],
    color: '#E67E22',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'p-3',
    name: '《雷雨》联排',
    date: fmt(addDays(today, 3)),
    startTime: '10:00',
    endTime: '13:00',
    location: '排练室B',
    type: 'rehearsal',
    status: 'scheduled',
    actorIds: ['actor-1', 'actor-2', 'actor-3', 'actor-6'],
    color: '#9B59B6',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'p-4',
    name: '《雷雨》正式演出',
    date: fmt(addDays(today, 7)),
    startTime: '19:30',
    endTime: '22:00',
    location: '主剧场A厅',
    type: 'show',
    status: 'scheduled',
    actorIds: ['actor-1', 'actor-2', 'actor-3', 'actor-5'],
    color: '#E74C3C',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'p-5',
    name: '儿童剧《小红帽》彩排',
    date: fmt(addDays(today, 5)),
    startTime: '15:00',
    endTime: '17:30',
    location: '小剧场C厅',
    type: 'rehearsal',
    status: 'scheduled',
    actorIds: ['actor-3', 'actor-4'],
    color: '#2ECC71',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'p-6',
    name: '冲突演示：上午场',
    date: fmt(addDays(today, 1)),
    startTime: '09:00',
    endTime: '11:00',
    location: '排练室A',
    type: 'rehearsal',
    status: 'scheduled',
    actorIds: ['actor-2', 'actor-4'],
    color: '#1ABC9C',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'p-7',
    name: '冲突演示：重叠场',
    date: fmt(addDays(today, 1)),
    startTime: '10:00',
    endTime: '12:00',
    location: '排练室B',
    type: 'rehearsal',
    status: 'scheduled',
    actorIds: ['actor-2', 'actor-5'],
    color: '#F39C12',
    createdAt: new Date().toISOString(),
  },
];

const sampleFeedbacks: Feedback[] = [
  {
    id: 'f-1',
    performanceId: 'p-1',
    actorId: 'actor-1',
    rating: 4,
    comment: '整体配合不错，第二幕节奏可以再紧凑一些。',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'f-2',
    performanceId: 'p-1',
    actorId: 'actor-2',
    rating: 5,
    comment: '导演的指导非常到位，演员状态都很好！',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'f-3',
    performanceId: 'p-1',
    actorId: 'actor-3',
    rating: 3,
    comment: '灯光调试有些问题，希望下次能提前准备好。',
    createdAt: new Date().toISOString(),
  },
];

readData<Performance[]>(PERFORMANCES_FILE, samplePerformances);
readData<Feedback[]>(FEEDBACKS_FILE, sampleFeedbacks);

app.get('/api/performances', (_req: Request, res: Response) => {
  const performances = readData<Performance[]>(PERFORMANCES_FILE, []);
  res.json(performances);
});

app.get('/api/performances/:id', (req: Request, res: Response) => {
  const performances = readData<Performance[]>(PERFORMANCES_FILE, []);
  const p = performances.find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json(p);
});

app.post('/api/performances', (req: Request, res: Response) => {
  const performances = readData<Performance[]>(PERFORMANCES_FILE, []);
  const newPerf: Performance = {
    ...req.body,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
  };
  performances.push(newPerf);
  writeData(PERFORMANCES_FILE, performances);
  res.status(201).json(newPerf);
});

app.put('/api/performances/:id', (req: Request, res: Response) => {
  const performances = readData<Performance[]>(PERFORMANCES_FILE, []);
  const idx = performances.findIndex((x) => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  performances[idx] = { ...performances[idx], ...req.body };
  writeData(PERFORMANCES_FILE, performances);
  res.json(performances[idx]);
});

app.delete('/api/performances/:id', (req: Request, res: Response) => {
  const performances = readData<Performance[]>(PERFORMANCES_FILE, []);
  const filtered = performances.filter((x) => x.id !== req.params.id);
  writeData(PERFORMANCES_FILE, filtered);
  res.status(204).send();
});

app.get('/api/feedbacks', (_req: Request, res: Response) => {
  const feedbacks = readData<Feedback[]>(FEEDBACKS_FILE, []);
  res.json(feedbacks);
});

app.post('/api/feedbacks', (req: Request, res: Response) => {
  const feedbacks = readData<Feedback[]>(FEEDBACKS_FILE, []);
  const newFb: Feedback = {
    ...req.body,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
  };
  feedbacks.push(newFb);
  writeData(FEEDBACKS_FILE, feedbacks);
  res.status(201).json(newFb);
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
