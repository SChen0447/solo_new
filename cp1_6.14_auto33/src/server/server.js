import express from 'express';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_DIR = join(__dirname, '..', '..', 'data');
const DATA_FILE = join(DATA_DIR, 'storyboards.json');

app.use(express.json());

function readData() {
  if (!existsSync(DATA_FILE)) {
    return [];
  }
  const raw = readFileSync(DATA_FILE, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeData(data) {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

app.get('/api/storyboards', (_req, res) => {
  const data = readData();
  res.json(data);
});

app.get('/api/storyboards/:id', (req, res) => {
  const data = readData();
  const sb = data.find((s) => s.id === req.params.id);
  if (!sb) return res.status(404).json({ error: 'Not found' });
  res.json(sb);
});

app.post('/api/storyboards', (req, res) => {
  const data = readData();
  const sb = {
    id: uuidv4(),
    name: req.body.name || '未命名故事板',
    scenes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  data.push(sb);
  writeData(data);
  res.status(201).json(sb);
});

app.put('/api/storyboards/:id', (req, res) => {
  const data = readData();
  const idx = data.findIndex((s) => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  data[idx] = { ...req.body, id: req.params.id, updatedAt: new Date().toISOString() };
  writeData(data);
  res.json(data[idx]);
});

app.delete('/api/storyboards/:id', (req, res) => {
  let data = readData();
  data = data.filter((s) => s.id !== req.params.id);
  writeData(data);
  res.status(204).end();
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
