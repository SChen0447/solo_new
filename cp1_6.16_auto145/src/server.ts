import express, { Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';
import type { RSVP, Stats } from './types';

const app = express();
const PORT = 4000;
const TOTAL_INVITED = 100;

app.use(cors());
app.use(bodyParser.json());

const rsvpStore = new Map<string, RSVP>();

const initialData: RSVP[] = [
  {
    id: uuidv4(),
    name: '王小明',
    attending: true,
    guestsCount: 2,
    mealPreference: 'beef',
    message: '祝新人百年好合，永结同心！期待这场美好的婚礼！',
    createdAt: new Date('2024-01-15').toISOString()
  },
  {
    id: uuidv4(),
    name: '李小红',
    attending: true,
    guestsCount: 1,
    mealPreference: 'seafood',
    message: '祝福你们新婚快乐，早生贵子！',
    createdAt: new Date('2024-01-16').toISOString()
  },
  {
    id: uuidv4(),
    name: '张大卫',
    attending: false,
    guestsCount: 0,
    mealPreference: 'vegetarian',
    message: '很遗憾无法参加，祝你们幸福美满！',
    createdAt: new Date('2024-01-17').toISOString()
  },
  {
    id: uuidv4(),
    name: '陈美丽',
    attending: true,
    guestsCount: 3,
    mealPreference: 'vegetarian',
    message: '恭喜恭喜！期待见证你们的幸福时刻！',
    createdAt: new Date('2024-01-18').toISOString()
  },
  {
    id: uuidv4(),
    name: '刘强',
    attending: true,
    guestsCount: 1,
    mealPreference: 'beef',
    message: '兄弟结婚必须到！祝你们白头偕老！',
    createdAt: new Date('2024-01-19').toISOString()
  }
];

initialData.forEach(item => rsvpStore.set(item.id, item));

app.get('/api/rsvp', (_req: Request, res: Response) => {
  const rsvps = Array.from(rsvpStore.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.json({ success: true, data: rsvps });
});

app.post('/api/rsvp', (req: Request, res: Response) => {
  try {
    const { name, attending, guestsCount, mealPreference, message } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, error: '请输入您的姓名' });
    }

    if (message && message.length > 150) {
      return res.status(400).json({ success: false, error: '祝福语不能超过150字' });
    }

    const newRSVP: RSVP = {
      id: uuidv4(),
      name: name.trim(),
      attending: attending === true,
      guestsCount: attending ? Math.max(0, Math.min(10, parseInt(guestsCount) || 0)) : 0,
      mealPreference: ['vegetarian', 'seafood', 'beef'].includes(mealPreference)
        ? mealPreference
        : 'beef',
      message: message ? message.trim() : '',
      createdAt: new Date().toISOString()
    };

    rsvpStore.set(newRSVP.id, newRSVP);
    res.json({ success: true, data: newRSVP });
  } catch (error) {
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

app.get('/api/stats', (_req: Request, res: Response) => {
  const rsvps = Array.from(rsvpStore.values());
  const responded = rsvps.length;
  const attending = rsvps.filter(r => r.attending).length;

  const stats: Stats = {
    totalInvited: TOTAL_INVITED,
    responded,
    attending,
    notResponded: TOTAL_INVITED - responded
  };

  res.json({ success: true, data: stats });
});

app.get('/api/export', (_req: Request, res: Response) => {
  const rsvps = Array.from(rsvpStore.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const mealMap: Record<string, string> = {
    vegetarian: '全素',
    seafood: '海鲜',
    beef: '牛肉'
  };

  const headers = ['姓名', '出席状态', '携带人数', '餐食偏好', '祝福语', '提交时间'];
  const rows = rsvps.map(r => [
    r.name,
    r.attending ? '是' : '否',
    r.guestsCount.toString(),
    mealMap[r.mealPreference] || r.mealPreference,
    `"${r.message.replace(/"/g, '""')}"`,
    new Date(r.createdAt).toLocaleString('zh-CN')
  ]);

  const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="宾客名单_${new Date().toLocaleDateString('zh-CN')}.csv"`);
  res.send('\uFEFF' + csvContent);
});

app.post('/api/login', (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (username === 'admin' && password === 'wedding2024') {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, error: '用户名或密码错误' });
  }
});

app.listen(PORT, () => {
  console.log(`Wedding API server running on port ${PORT}`);
});
