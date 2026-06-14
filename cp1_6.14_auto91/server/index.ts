import express from 'express';
import cors from 'cors';
import { readFile, writeFile } from 'node:fs/promises';
import { v4 as uuidv4 } from 'uuid';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_PATH = path.join(__dirname, 'data.json');

interface User {
  id: string;
  username: string;
  password: string;
  pointsBalance: number;
  totalPointsEarned: number;
  avatar: string;
}

interface Need {
  id: string;
  publisherId: string;
  title: string;
  description: string;
  expectedDate: string;
  expectedTimeSlot: string;
  rewardPoints: number;
  type: '取快递' | '遛狗' | '代买' | '临时照看' | '其他';
  status: '待接单' | '进行中' | '已完成' | '已过期';
  urgent: boolean;
  createdAt: string;
  acceptedBy: string | null;
  proofPhoto: string | null;
  completedAt: string | null;
}

interface Rating {
  id: string;
  needId: string;
  fromUserId: string;
  toUserId: string;
  score: number;
  comment: string;
  createdAt: string;
}

interface Service {
  id: string;
  publisherId: string;
  title: string;
  description: string;
  requiredPoints: number;
  createdAt: string;
}

interface Data {
  users: User[];
  needs: Need[];
  ratings: Rating[];
  services: Service[];
}

async function readData(): Promise<Data> {
  try {
    const raw = await readFile(DATA_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { users: [], needs: [], ratings: [], services: [] };
  }
}

async function writeData(data: Data): Promise<void> {
  await writeFile(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

const app = express();
app.use(cors());
app.use(express.json());

const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) {
    res.status(401).json({ error: '未登录' });
    return;
  }
  (req as any).userId = userId;
  next();
};

app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: '用户名和密码不能为空' });
    return;
  }
  const data = await readData();
  if (data.users.find((u) => u.username === username)) {
    res.status(409).json({ error: '用户名已存在' });
    return;
  }
  const user: User = {
    id: uuidv4(),
    username,
    password,
    pointsBalance: 10,
    totalPointsEarned: 0,
    avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(username)}`,
  };
  data.users.push(user);
  await writeData(data);
  const { password: _, ...safe } = user;
  res.json(safe);
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const data = await readData();
  const user = data.users.find((u) => u.username === username && u.password === password);
  if (!user) {
    res.status(401).json({ error: '用户名或密码错误' });
    return;
  }
  const { password: _, ...safe } = user;
  res.json(safe);
});

app.get('/api/users', async (_req, res) => {
  const data = await readData();
  const safe = data.users.map(({ password: _, ...u }) => u);
  res.json(safe);
});

app.get('/api/users/:id', async (req, res) => {
  const data = await readData();
  const user = data.users.find((u) => u.id === req.params.id);
  if (!user) {
    res.status(404).json({ error: '用户不存在' });
    return;
  }
  const { password: _, ...safe } = user;
  res.json(safe);
});

app.get('/api/users/leaderboard/top20', async (_req, res) => {
  const data = await readData();
  const sorted = [...data.users]
    .sort((a, b) => b.totalPointsEarned - a.totalPointsEarned)
    .slice(0, 20)
    .map(({ password: _, ...u }) => u);
  res.json(sorted);
});

app.get('/api/needs', async (_req, res) => {
  const data = await readData();
  const now = Date.now();
  let changed = false;
  for (const need of data.needs) {
    if (need.status === '待接单') {
      const created = new Date(need.createdAt).getTime();
      if (now - created > 24 * 60 * 60 * 1000) {
        need.status = '已过期';
        changed = true;
      }
    }
  }
  if (changed) await writeData(data);
  res.json(data.needs);
});

app.post('/api/needs', authMiddleware, async (req, res) => {
  const { title, description, expectedDate, expectedTimeSlot, rewardPoints, type, urgent } = req.body;
  if (!title || title.length > 20) {
    res.status(400).json({ error: '标题不能为空且不超过20字' });
    return;
  }
  if (description && description.length > 200) {
    res.status(400).json({ error: '描述不超过200字' });
    return;
  }
  if (!rewardPoints || rewardPoints < 1 || rewardPoints > 10 || !Number.isInteger(rewardPoints)) {
    res.status(400).json({ error: '报酬积分须为1-10的整数' });
    return;
  }
  const validTypes = ['取快递', '遛狗', '代买', '临时照看', '其他'];
  if (!type || !validTypes.includes(type)) {
    res.status(400).json({ error: '无效的需求类型' });
    return;
  }
  const data = await readData();
  const publisher = data.users.find((u) => u.id === (req as any).userId);
  if (!publisher) {
    res.status(404).json({ error: '用户不存在' });
    return;
  }
  const totalCost = rewardPoints + (urgent ? 2 : 0);
  if (publisher.pointsBalance < totalCost) {
    res.status(400).json({ error: `积分不足，需要${totalCost}分（含紧急标记额外2分）` });
    return;
  }
  const need: Need = {
    id: uuidv4(),
    publisherId: (req as any).userId,
    title,
    description: description || '',
    expectedDate: expectedDate || '',
    expectedTimeSlot: expectedTimeSlot || '',
    rewardPoints: totalCost,
    type,
    status: '待接单',
    urgent: !!urgent,
    createdAt: new Date().toISOString(),
    acceptedBy: null,
    proofPhoto: null,
    completedAt: null,
  };
  publisher.pointsBalance -= totalCost;
  data.needs.push(need);
  await writeData(data);
  res.json(need);
});

app.get('/api/needs/:id', async (req, res) => {
  const data = await readData();
  const need = data.needs.find((n) => n.id === req.params.id);
  if (!need) {
    res.status(404).json({ error: '需求不存在' });
    return;
  }
  res.json(need);
});

app.put('/api/needs/:id/accept', authMiddleware, async (req, res) => {
  const data = await readData();
  const need = data.needs.find((n) => n.id === req.params.id);
  if (!need) {
    res.status(404).json({ error: '需求不存在' });
    return;
  }
  if (need.status !== '待接单') {
    res.status(400).json({ error: '需求已不在待接单状态' });
    return;
  }
  if (need.publisherId === (req as any).userId) {
    res.status(400).json({ error: '不能接自己发布的需求' });
    return;
  }
  need.status = '进行中';
  need.acceptedBy = (req as any).userId;
  await writeData(data);
  res.json(need);
});

app.put('/api/needs/:id/complete', authMiddleware, async (req, res) => {
  const { proofPhoto } = req.body;
  const data = await readData();
  const need = data.needs.find((n) => n.id === req.params.id);
  if (!need) {
    res.status(404).json({ error: '需求不存在' });
    return;
  }
  if (need.status !== '进行中') {
    res.status(400).json({ error: '需求未在进行中' });
    return;
  }
  if (need.acceptedBy !== (req as any).userId) {
    res.status(403).json({ error: '只有接单者可以提交完成凭证' });
    return;
  }
  need.proofPhoto = proofPhoto || 'https://trae-api-cn.mchort.guru/api/ide/v1/text_to_image?prompt=proof+photo+placeholder&image_size=square';
  await writeData(data);
  res.json(need);
});

app.put('/api/needs/:id/confirm', authMiddleware, async (req, res) => {
  const data = await readData();
  const need = data.needs.find((n) => n.id === req.params.id);
  if (!need) {
    res.status(404).json({ error: '需求不存在' });
    return;
  }
  if (need.status !== '进行中') {
    res.status(400).json({ error: '需求未在进行中' });
    return;
  }
  if (need.publisherId !== (req as any).userId) {
    res.status(403).json({ error: '只有发布者可以确认完成' });
    return;
  }
  if (!need.proofPhoto) {
    res.status(400).json({ error: '接单者尚未提交完成凭证' });
    return;
  }
  need.status = '已完成';
  need.completedAt = new Date().toISOString();
  const accepter = data.users.find((u) => u.id === need.acceptedBy);
  if (accepter) {
    accepter.pointsBalance += need.rewardPoints;
    accepter.totalPointsEarned += need.rewardPoints;
  }
  await writeData(data);
  res.json(need);
});

app.put('/api/needs/:id/urgent', authMiddleware, async (req, res) => {
  const data = await readData();
  const need = data.needs.find((n) => n.id === req.params.id);
  if (!need) {
    res.status(404).json({ error: '需求不存在' });
    return;
  }
  if (need.publisherId !== (req as any).userId) {
    res.status(403).json({ error: '只有发布者可以标记紧急' });
    return;
  }
  if (need.status !== '待接单') {
    res.status(400).json({ error: '只有待接单的需求可以标记紧急' });
    return;
  }
  if (!need.urgent) {
    const publisher = data.users.find((u) => u.id === need.publisherId);
    if (publisher && publisher.pointsBalance < 2) {
      res.status(400).json({ error: '积分不足，标记紧急需要额外2分' });
      return;
    }
    if (publisher) {
      publisher.pointsBalance -= 2;
      need.rewardPoints += 2;
    }
  }
  need.urgent = !need.urgent;
  await writeData(data);
  res.json(need);
});

app.post('/api/ratings', authMiddleware, async (req, res) => {
  const { needId, toUserId, score, comment } = req.body;
  if (!score || score < 1 || score > 5) {
    res.status(400).json({ error: '评分为1-5星' });
    return;
  }
  if (comment && comment.length > 30) {
    res.status(400).json({ error: '评价不超过30字' });
    return;
  }
  const data = await readData();
  const need = data.needs.find((n) => n.id === needId);
  if (!need || need.status !== '已完成') {
    res.status(400).json({ error: '只能评价已完成的需求' });
    return;
  }
  const existing = data.ratings.find(
    (r) => r.needId === needId && r.fromUserId === (req as any).userId
  );
  if (existing) {
    res.status(400).json({ error: '你已经评价过了' });
    return;
  }
  const rating: Rating = {
    id: uuidv4(),
    needId,
    fromUserId: (req as any).userId,
    toUserId,
    score,
    comment: comment || '',
    createdAt: new Date().toISOString(),
  };
  data.ratings.push(rating);
  await writeData(data);
  res.json(rating);
});

app.get('/api/ratings/:needId', async (req, res) => {
  const data = await readData();
  const ratings = data.ratings.filter((r) => r.needId === req.params.needId);
  const enriched = ratings.map((r) => {
    const fromUser = data.users.find((u) => u.id === r.fromUserId);
    return { ...r, fromUsername: fromUser?.username || '未知用户' };
  });
  res.json(enriched);
});

app.get('/api/ratings/user/:userId', async (req, res) => {
  const data = await readData();
  const ratings = data.ratings.filter((r) => r.toUserId === req.params.userId);
  const enriched = ratings.map((r) => {
    const fromUser = data.users.find((u) => u.id === r.fromUserId);
    return { ...r, fromUsername: fromUser?.username || '未知用户' };
  });
  res.json(enriched);
});

app.get('/api/services', async (_req, res) => {
  const data = await readData();
  const enriched = data.services.map((s) => {
    const publisher = data.users.find((u) => u.id === s.publisherId);
    return { ...s, publisherName: publisher?.username || '未知用户' };
  });
  res.json(enriched);
});

app.post('/api/services', authMiddleware, async (req, res) => {
  const { title, description, requiredPoints } = req.body;
  if (!title) {
    res.status(400).json({ error: '标题不能为空' });
    return;
  }
  if (!requiredPoints || requiredPoints < 1) {
    res.status(400).json({ error: '所需积分至少为1' });
    return;
  }
  const data = await readData();
  const service: Service = {
    id: uuidv4(),
    publisherId: (req as any).userId,
    title,
    description: description || '',
    requiredPoints,
    createdAt: new Date().toISOString(),
  };
  data.services.push(service);
  await writeData(data);
  res.json(service);
});

app.post('/api/services/:id/redeem', authMiddleware, async (req, res) => {
  const data = await readData();
  const service = data.services.find((s) => s.id === req.params.id);
  if (!service) {
    res.status(404).json({ error: '服务不存在' });
    return;
  }
  if (service.publisherId === (req as any).userId) {
    res.status(400).json({ error: '不能兑换自己的服务' });
    return;
  }
  const user = data.users.find((u) => u.id === (req as any).userId);
  if (!user || user.pointsBalance < service.requiredPoints) {
    res.status(400).json({ error: '积分不足' });
    return;
  }
  const publisher = data.users.find((u) => u.id === service.publisherId);
  user.pointsBalance -= service.requiredPoints;
  if (publisher) {
    publisher.pointsBalance += service.requiredPoints;
    publisher.totalPointsEarned += service.requiredPoints;
  }
  data.services = data.services.filter((s) => s.id !== service.id);
  await writeData(data);
  res.json({ success: true, message: '兑换成功' });
});

app.listen(3001, () => {
  console.log('🚀 Server running on http://localhost:3001');
});
