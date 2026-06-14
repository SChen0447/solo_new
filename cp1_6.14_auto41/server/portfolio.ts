import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readData, writeData } from './db.js';

export interface Portfolio {
  id: string;
  title: string;
  category: '品牌' | 'UI' | '插画' | '3D' | '其他';
  description: string;
  imageUrl: string;
  createdAt: string;
  tags: string[];
}

const FILE = 'portfolios.json';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const items = readData<Portfolio>(FILE);
  const category = req.query.category as string | undefined;
  const search = req.query.search as string | undefined;
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 12;
  const sort = req.query.sort as string || 'desc';

  let filtered = items;
  if (category && category !== '全部') {
    filtered = filtered.filter((p) => p.category === category);
  }
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.title.toLowerCase().includes(s) ||
        p.description.toLowerCase().includes(s) ||
        p.tags.some((t) => t.toLowerCase().includes(s))
    );
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

router.get('/:id', (req: Request, res: Response) => {
  const items = readData<Portfolio>(FILE);
  const item = items.find((p) => p.id === req.params.id);
  if (!item) {
    res.status(404).json({ error: '作品未找到' });
    return;
  }
  res.json(item);
});

router.post('/', (req: Request, res: Response) => {
  const items = readData<Portfolio>(FILE);
  const { title, category, description, imageUrl, createdAt, tags } = req.body;
  if (!title || !category) {
    res.status(400).json({ error: '标题和类别为必填项' });
    return;
  }
  const newItem: Portfolio = {
    id: uuidv4(),
    title,
    category,
    description: description || '',
    imageUrl: imageUrl || '',
    createdAt: createdAt || new Date().toISOString(),
    tags: tags || [],
  };
  items.push(newItem);
  writeData(FILE, items);
  res.status(201).json(newItem);
});

router.put('/:id', (req: Request, res: Response) => {
  const items = readData<Portfolio>(FILE);
  const idx = items.findIndex((p) => p.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: '作品未找到' });
    return;
  }
  items[idx] = { ...items[idx], ...req.body, id: items[idx].id };
  writeData(FILE, items);
  res.json(items[idx]);
});

router.delete('/:id', (req: Request, res: Response) => {
  let items = readData<Portfolio>(FILE);
  const idx = items.findIndex((p) => p.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: '作品未找到' });
    return;
  }
  const deleted = items[idx];
  items = items.filter((p) => p.id !== req.params.id);
  writeData(FILE, items);
  res.json(deleted);
});

export default router;
