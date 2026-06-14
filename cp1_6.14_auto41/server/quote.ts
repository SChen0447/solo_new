import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readData, writeData } from './db.js';

export type Category = '品牌' | 'UI' | '插画' | '3D' | '其他';
export type Urgency = '普通' | '加急' | '特急';
export type OrderStatus = '待确认' | '进行中' | '需修改' | '已完成' | '已关闭';

export interface QuoteRequest {
  category: Category;
  description: string;
  estimatedHours: number;
  needsRevision: boolean;
  urgency: Urgency;
}

export interface QuoteResult {
  baseRate: number;
  categoryCoeff: number;
  basePrice: number;
  revisionSurcharge: number;
  urgencySurcharge: number;
  total: number;
  estimatedDays: number;
}

export interface Order {
  id: string;
  category: Category;
  description: string;
  estimatedHours: number;
  needsRevision: boolean;
  urgency: Urgency;
  quote: QuoteResult;
  status: OrderStatus;
  notes: OrderNote[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderNote {
  id: string;
  content: string;
  createdAt: string;
  author: 'client' | 'designer';
}

const BASE_RATE = 200;

const CATEGORY_COEFFICIENTS: Record<Category, number> = {
  '品牌': 1.5,
  'UI': 1.3,
  '插画': 1.2,
  '3D': 1.8,
  '其他': 1.0,
};

const URGENCY_MULTIPLIERS: Record<Urgency, number> = {
  '普通': 0,
  '加急': 0.5,
  '特急': 1.0,
};

const REVISION_SURCHARGE = 0.3;

function calculateQuote(req: QuoteRequest): QuoteResult {
  const categoryCoeff = CATEGORY_COEFFICIENTS[req.category] || 1.0;
  const basePrice = BASE_RATE * categoryCoeff * req.estimatedHours;
  const revisionSurcharge = req.needsRevision ? basePrice * REVISION_SURCHARGE : 0;
  const subtotal = basePrice + revisionSurcharge;
  const urgencySurcharge = subtotal * URGENCY_MULTIPLIERS[req.urgency];
  const total = Math.round(subtotal + urgencySurcharge);
  const estimatedDays = Math.max(1, Math.ceil(req.estimatedHours / 8) + (req.urgency === '加急' ? 0 : req.urgency === '特急' ? 0 : 2));

  return {
    baseRate: BASE_RATE,
    categoryCoeff,
    basePrice: Math.round(basePrice),
    revisionSurcharge: Math.round(revisionSurcharge),
    urgencySurcharge: Math.round(urgencySurcharge),
    total,
    estimatedDays,
  };
}

const router = Router();

router.post('/calculate', (req: Request, res: Response) => {
  const { category, description, estimatedHours, needsRevision, urgency } = req.body;
  if (!category || !estimatedHours || !urgency) {
    res.status(400).json({ error: '类别、预计耗时和紧急程度为必填项' });
    return;
  }
  const quote = calculateQuote({ category, description, estimatedHours, needsRevision, urgency } as QuoteRequest);
  res.json(quote);
});

router.post('/confirm', (req: Request, res: Response) => {
  const { category, description, estimatedHours, needsRevision, urgency } = req.body;
  if (!category || !estimatedHours || !urgency) {
    res.status(400).json({ error: '类别、预计耗时和紧急程度为必填项' });
    return;
  }
  const quote = calculateQuote({ category, description, estimatedHours, needsRevision, urgency } as QuoteRequest);
  const orders = readData<Order>('orders.json');
  const newOrder: Order = {
    id: uuidv4(),
    category,
    description: description || '',
    estimatedHours,
    needsRevision: needsRevision || false,
    urgency,
    quote,
    status: '待确认',
    notes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  orders.push(newOrder);
  writeData('orders.json', orders);
  res.status(201).json(newOrder);
});

router.get('/orders', (req: Request, res: Response) => {
  const orders = readData<Order>('orders.json');
  const status = req.query.status as string | undefined;
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;
  const sort = (req.query.sort as string) || 'desc';

  let filtered = orders;
  if (status && status !== '全部') {
    filtered = filtered.filter((o) => o.status === status);
  }

  filtered.sort((a, b) => {
    const da = new Date(a.createdAt).getTime();
    const db = new Date(b.createdAt).getTime();
    return sort === 'asc' ? da - db : db - da;
  });

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const paged = filtered.slice(start, start + pageSize);

  res.json({ data: paged, total, page, pageSize });
});

router.patch('/orders/:id/status', (req: Request, res: Response) => {
  const orders = readData<Order>('orders.json');
  const idx = orders.findIndex((o) => o.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: '订单未找到' });
    return;
  }
  const { status } = req.body;
  const validStatuses: OrderStatus[] = ['待确认', '进行中', '需修改', '已完成', '已关闭'];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: '无效的订单状态' });
    return;
  }
  orders[idx].status = status;
  orders[idx].updatedAt = new Date().toISOString();
  writeData('orders.json', orders);
  res.json(orders[idx]);
});

router.post('/orders/:id/notes', (req: Request, res: Response) => {
  const orders = readData<Order>('orders.json');
  const idx = orders.findIndex((o) => o.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: '订单未找到' });
    return;
  }
  const { content, author } = req.body;
  if (!content || content.length > 200) {
    res.status(400).json({ error: '备注内容为必填且不超过200字' });
    return;
  }
  const note: OrderNote = {
    id: uuidv4(),
    content,
    createdAt: new Date().toISOString(),
    author: author || 'client',
  };
  orders[idx].notes.push(note);
  orders[idx].updatedAt = new Date().toISOString();
  writeData('orders.json', orders);
  res.status(201).json(note);
});

export default router;
