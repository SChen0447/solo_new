import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;
const DATA_DIR = path.join(process.cwd(), 'data');

app.use(cors());
app.use(express.json());

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJSON<T>(filename: string): T[] {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

function writeJSON<T>(filename: string, data: T[]): void {
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// ===== Beans API =====
app.get('/api/beans', (_req, res) => {
  const beans = readJSON<any>('beans.json');
  res.json(beans);
});

app.post('/api/beans', (req, res) => {
  const beans = readJSON<any>('beans.json');
  const bean = { id: uuidv4(), createdAt: new Date().toISOString(), ...req.body };
  beans.push(bean);
  writeJSON('beans.json', beans);
  res.status(201).json(bean);
});

app.put('/api/beans/:id', (req, res) => {
  const beans = readJSON<any>('beans.json');
  const idx = beans.findIndex((b: any) => b.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Bean not found' });
  beans[idx] = { ...beans[idx], ...req.body };
  writeJSON('beans.json', beans);
  res.json(beans[idx]);
});

app.delete('/api/beans/:id', (req, res) => {
  let beans = readJSON<any>('beans.json');
  beans = beans.filter((b: any) => b.id !== req.params.id);
  writeJSON('beans.json', beans);
  res.status(204).end();
});

// ===== Batches API =====
app.get('/api/batches', (_req, res) => {
  const batches = readJSON<any>('batches.json');
  res.json(batches);
});

app.post('/api/batches', (req, res) => {
  const batches = readJSON<any>('batches.json');
  const batch = { id: uuidv4(), createdAt: new Date().toISOString(), ...req.body };
  batches.push(batch);
  writeJSON('batches.json', batches);
  res.status(201).json(batch);
});

app.put('/api/batches/:id', (req, res) => {
  const batches = readJSON<any>('batches.json');
  const idx = batches.findIndex((b: any) => b.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Batch not found' });
  batches[idx] = { ...batches[idx], ...req.body };
  writeJSON('batches.json', batches);
  res.json(batches[idx]);
});

app.delete('/api/batches/:id', (req, res) => {
  let batches = readJSON<any>('batches.json');
  batches = batches.filter((b: any) => b.id !== req.params.id);
  writeJSON('batches.json', batches);
  res.status(204).end();
});

// ===== Recipes API =====
app.get('/api/recipes', (_req, res) => {
  const recipes = readJSON<any>('recipes.json');
  res.json(recipes);
});

app.post('/api/recipes', (req, res) => {
  const recipes = readJSON<any>('recipes.json');
  const recipe = { id: uuidv4(), createdAt: new Date().toISOString(), ...req.body };
  recipes.push(recipe);
  writeJSON('recipes.json', recipes);
  res.status(201).json(recipe);
});

app.put('/api/recipes/:id', (req, res) => {
  const recipes = readJSON<any>('recipes.json');
  const idx = recipes.findIndex((r: any) => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Recipe not found' });
  recipes[idx] = { ...recipes[idx], ...req.body };
  writeJSON('recipes.json', recipes);
  res.json(recipes[idx]);
});

app.delete('/api/recipes/:id', (req, res) => {
  let recipes = readJSON<any>('recipes.json');
  recipes = recipes.filter((r: any) => r.id !== req.params.id);
  writeJSON('recipes.json', recipes);
  res.status(204).end();
});

// ===== Tastings API =====
app.get('/api/tastings', (_req, res) => {
  const tastings = readJSON<any>('tastings.json');
  res.json(tastings);
});

app.post('/api/tastings', (req, res) => {
  const tastings = readJSON<any>('tastings.json');
  const tasting = { id: uuidv4(), createdAt: new Date().toISOString(), ...req.body };
  tastings.push(tasting);
  writeJSON('tastings.json', tastings);
  res.status(201).json(tasting);
});

app.put('/api/tastings/:id', (req, res) => {
  const tastings = readJSON<any>('tastings.json');
  const idx = tastings.findIndex((t: any) => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Tasting not found' });
  tastings[idx] = { ...tastings[idx], ...req.body };
  writeJSON('tastings.json', tastings);
  res.json(tastings[idx]);
});

app.delete('/api/tastings/:id', (req, res) => {
  let tastings = readJSON<any>('tastings.json');
  tastings = tastings.filter((t: any) => t.id !== req.params.id);
  writeJSON('tastings.json', tastings);
  res.status(204).end();
});

// ===== Stats API =====
app.get('/api/stats', (_req, res) => {
  const beans = readJSON<any>('beans.json');
  const batches = readJSON<any>('batches.json');
  const tastings = readJSON<any>('tastings.json');

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

  const thisMonthBatches = batches.filter((b: any) => b.date && b.date.startsWith(thisMonth));
  const lastMonthBatches = batches.filter((b: any) => b.date && b.date.startsWith(lastMonthStr));

  const highestRatedBatch = tastings.length > 0
    ? batches.reduce((best: any, batch: any) => {
        const batchTastings = tastings.filter((t: any) => t.batchId === batch.id);
        if (batchTastings.length === 0) return best;
        const avg = batchTastings.reduce((s: number, t: any) => s + (t.acidity + t.bitterness + t.sweetness + t.body + t.aftertaste) / 5, 0) / batchTastings.length;
        if (!best || avg > best.avg) return { ...batch, avg };
        return best;
      }, null)
    : null;

  const recentTastings = tastings.slice(-20);
  const recentAvg = recentTastings.length > 0
    ? recentTastings.reduce((s: number, t: any) => s + (t.acidity + t.bitterness + t.sweetness + t.body + t.aftertaste) / 5, 0) / recentTastings.length
    : 0;

  const batchGrowthRate = lastMonthBatches.length > 0
    ? ((thisMonthBatches.length - lastMonthBatches.length) / lastMonthBatches.length) * 100
    : thisMonthBatches.length > 0 ? 100 : 0;

  res.json({
    totalBeans: beans.length,
    thisMonthBatches: thisMonthBatches.length,
    highestRatedBatch,
    recentAvgScore: Math.round(recentAvg * 10) / 10,
    batchGrowthRate: Math.round(batchGrowthRate),
  });
});

app.listen(PORT, () => {
  console.log(`☕ Coffee Lab server running on http://localhost:${PORT}`);
});
