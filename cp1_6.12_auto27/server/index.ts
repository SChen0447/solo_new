import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const SNAPSHOT_FILE = path.join(DATA_DIR, 'snapshot.json');

const app = express();
app.use(express.json());

interface Activity {
  id: string;
  name: string;
  description: string;
  role: 'visitor' | 'registered' | 'admin';
  emoji: string;
  color: string;
  position: { x: number; y: number };
  order: number;
  createdAt: number;
}

interface Iteration {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  activityIds: string[];
  order: number;
}

interface AppState {
  version: number;
  timestamp: number;
  activities: Activity[];
  iterations: Iteration[];
}

const DEFAULT_ACTIVITIES: Activity[] = [
  { id: uuidv4(), name: '注册登录', description: '用户通过手机号或邮箱注册并登录系统', role: 'visitor', emoji: '🔐', color: '#6366f1', position: { x: 0, y: 0 }, order: 0, createdAt: Date.now() },
  { id: uuidv4(), name: '浏览商品', description: '用户浏览商品列表和商品详情页面', role: 'visitor', emoji: '🛍️', color: '#ec4899', position: { x: 0, y: 0 }, order: 1, createdAt: Date.now() },
  { id: uuidv4(), name: '下单支付', description: '用户选择商品下单并完成在线支付', role: 'registered', emoji: '💳', color: '#f59e0b', position: { x: 0, y: 0 }, order: 2, createdAt: Date.now() },
  { id: uuidv4(), name: '搜索筛选', description: '用户通过关键词搜索和条件筛选商品', role: 'visitor', emoji: '🔍', color: '#10b981', position: { x: 0, y: 0 }, order: 3, createdAt: Date.now() },
  { id: uuidv4(), name: '个人中心', description: '用户管理个人信息、地址和订单', role: 'registered', emoji: '👤', color: '#8b5cf6', position: { x: 0, y: 0 }, order: 4, createdAt: Date.now() },
  { id: uuidv4(), name: '后台管理', description: '管理员管理商品、用户和系统配置', role: 'admin', emoji: '⚙️', color: '#ef4444', position: { x: 0, y: 0 }, order: 5, createdAt: Date.now() },
  { id: uuidv4(), name: '评价反馈', description: '用户对购买的商品进行评价和反馈', role: 'registered', emoji: '⭐', color: '#14b8a6', position: { x: 0, y: 0 }, order: 6, createdAt: Date.now() },
  { id: uuidv4(), name: '收藏夹', description: '用户收藏喜欢的商品和店铺', role: 'registered', emoji: '❤️', color: '#f43f5e', position: { x: 0, y: 0 }, order: 7, createdAt: Date.now() },
];

const DEFAULT_ITERATIONS: Iteration[] = [
  { id: uuidv4(), name: '周期1', startDate: '', endDate: '', activityIds: [], order: 0 },
  { id: uuidv4(), name: '周期2', startDate: '', endDate: '', activityIds: [], order: 1 },
  { id: uuidv4(), name: '周期3', startDate: '', endDate: '', activityIds: [], order: 2 },
];

function loadSnapshot(): AppState {
  try {
    if (fs.existsSync(SNAPSHOT_FILE)) {
      const raw = fs.readFileSync(SNAPSHOT_FILE, 'utf-8');
      const data = JSON.parse(raw) as AppState;
      if (data.version && data.activities && data.iterations) {
        return data;
      }
    }
  } catch (e) {
    console.error('Failed to load snapshot, using defaults:', e);
  }
  return {
    version: 1,
    timestamp: Date.now(),
    activities: DEFAULT_ACTIVITIES,
    iterations: DEFAULT_ITERATIONS,
  };
}

let store: AppState = loadSnapshot();

function saveSnapshot(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    store.timestamp = Date.now();
    fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save snapshot:', e);
  }
}

app.get('/api/state', (_req, res) => {
  res.json(store);
});

app.post('/api/activities', (req, res) => {
  const body = req.body;
  const activity: Activity = {
    id: uuidv4(),
    name: body.name || '未命名活动',
    description: body.description || '',
    role: body.role || 'visitor',
    emoji: body.emoji || '📋',
    color: body.color || '#6366f1',
    position: body.position || { x: 0, y: 0 },
    order: store.activities.length,
    createdAt: Date.now(),
  };
  store.activities.push(activity);
  saveSnapshot();
  res.json(activity);
});

app.put('/api/activities/:id', (req, res) => {
  const { id } = req.params;
  const idx = store.activities.findIndex(a => a.id === id);
  if (idx === -1) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }
  store.activities[idx] = { ...store.activities[idx], ...req.body, id };
  saveSnapshot();
  res.json(store.activities[idx]);
});

app.delete('/api/activities/:id', (req, res) => {
  const { id } = req.params;
  store.activities = store.activities.filter(a => a.id !== id);
  store.iterations.forEach(iter => {
    iter.activityIds = iter.activityIds.filter(aid => aid !== id);
  });
  saveSnapshot();
  res.json({ success: true });
});

app.put('/api/activities/reorder', (req, res) => {
  const { ids, role } = req.body as { ids: string[]; role?: string };
  ids.forEach((id: string, index: number) => {
    const activity = store.activities.find(a => a.id === id);
    if (activity) {
      activity.order = index;
      if (role) activity.role = role as Activity['role'];
    }
  });
  saveSnapshot();
  res.json({ success: true });
});

app.post('/api/iterations', (req, res) => {
  const body = req.body;
  const iteration: Iteration = {
    id: uuidv4(),
    name: body.name || `周期${store.iterations.length + 1}`,
    startDate: body.startDate || '',
    endDate: body.endDate || '',
    activityIds: body.activityIds || [],
    order: store.iterations.length,
  };
  store.iterations.push(iteration);
  saveSnapshot();
  res.json(iteration);
});

app.put('/api/iterations/:id', (req, res) => {
  const { id } = req.params;
  const idx = store.iterations.findIndex(i => i.id === id);
  if (idx === -1) {
    res.status(404).json({ error: 'Iteration not found' });
    return;
  }
  store.iterations[idx] = { ...store.iterations[idx], ...req.body, id };
  saveSnapshot();
  res.json(store.iterations[idx]);
});

app.delete('/api/iterations/:id', (req, res) => {
  const { id } = req.params;
  store.iterations = store.iterations.filter(i => i.id !== id);
  saveSnapshot();
  res.json({ success: true });
});

app.put('/api/iterations/reorder', (req, res) => {
  const { iterationId, activityIds } = req.body as { iterationId: string; activityIds: string[] };
  const iteration = store.iterations.find(i => i.id === iterationId);
  if (iteration) {
    iteration.activityIds = activityIds;
  }
  saveSnapshot();
  res.json({ success: true });
});

app.post('/api/state/restore', (req, res) => {
  const newState = req.body as AppState;
  if (newState.activities && newState.iterations) {
    store = { ...newState, version: 1, timestamp: Date.now() };
    saveSnapshot();
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'Invalid state data' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
