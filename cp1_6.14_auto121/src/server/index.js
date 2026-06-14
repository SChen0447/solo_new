import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const TANKS_FILE = path.join(DATA_DIR, 'tanks.json');
const READINGS_FILE = path.join(DATA_DIR, 'readings.json');
const FEEDINGS_FILE = path.join(DATA_DIR, 'feedings.json');
const WATER_CHANGES_FILE = path.join(DATA_DIR, 'waterChanges.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJSON(filePath) {
  ensureDataDir();
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '[]', 'utf-8');
    return [];
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function writeJSON(filePath, data) {
  ensureDataDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function seedData() {
  ensureDataDir();
  const tanks = readJSON(TANKS_FILE);
  if (tanks.length > 0) return;

  const tankId1 = uuidv4();
  const tankId2 = uuidv4();

  const seedTanks = [
    {
      id: tankId1,
      name: '热带鱼缸',
      capacity: 120,
      type: 'freshwater',
      tempMin: 24,
      tempMax: 28,
      fishGroups: [
        { id: uuidv4(), species: '孔雀鱼', count: 8, notes: '颜色鲜艳' },
        { id: uuidv4(), species: '霓虹灯鱼', count: 12, notes: '群游效果好' },
        { id: uuidv4(), species: '清洁虾', count: 2, notes: '除藻' },
      ],
    },
    {
      id: tankId2,
      name: '海水珊瑚缸',
      capacity: 200,
      type: 'saltwater',
      tempMin: 25,
      tempMax: 27,
      fishGroups: [
        { id: uuidv4(), species: '小丑鱼', count: 4, notes: '与海葵共生' },
        { id: uuidv4(), species: '蓝吊', count: 2, notes: '帮助控制藻类' },
      ],
    },
  ];

  const today = new Date().toISOString().split('T')[0];
  const daysAgo = (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().split('T')[0];
  };

  const seedReadings = [
    { id: uuidv4(), tankId: tankId1, date: daysAgo(6), temperature: 25.5, ph: 7.0, ammonia: 0.1, nitrite: 0.05, nitrate: 15, hardness: 8 },
    { id: uuidv4(), tankId: tankId1, date: daysAgo(5), temperature: 26.0, ph: 7.1, ammonia: 0.15, nitrite: 0.08, nitrate: 18, hardness: 8 },
    { id: uuidv4(), tankId: tankId1, date: daysAgo(4), temperature: 26.5, ph: 6.9, ammonia: 0.2, nitrite: 0.1, nitrate: 22, hardness: 7 },
    { id: uuidv4(), tankId: tankId1, date: daysAgo(3), temperature: 27.0, ph: 6.8, ammonia: 0.3, nitrite: 0.15, nitrate: 28, hardness: 7 },
    { id: uuidv4(), tankId: tankId1, date: daysAgo(2), temperature: 26.8, ph: 7.0, ammonia: 0.2, nitrite: 0.1, nitrate: 20, hardness: 8 },
    { id: uuidv4(), tankId: tankId1, date: daysAgo(1), temperature: 26.2, ph: 7.1, ammonia: 0.15, nitrite: 0.08, nitrate: 16, hardness: 8 },
    { id: uuidv4(), tankId: tankId1, date: today, temperature: 25.8, ph: 7.2, ammonia: 0.1, nitrite: 0.05, nitrate: 12, hardness: 9 },
    { id: uuidv4(), tankId: tankId2, date: daysAgo(6), temperature: 26.0, ph: 8.1, ammonia: 0.05, nitrite: 0.02, nitrate: 5, hardness: 10 },
    { id: uuidv4(), tankId: tankId2, date: daysAgo(4), temperature: 26.2, ph: 8.2, ammonia: 0.08, nitrite: 0.03, nitrate: 8, hardness: 11 },
    { id: uuidv4(), tankId: tankId2, date: daysAgo(2), temperature: 26.5, ph: 8.1, ammonia: 0.06, nitrite: 0.02, nitrate: 6, hardness: 10 },
    { id: uuidv4(), tankId: tankId2, date: today, temperature: 26.3, ph: 8.2, ammonia: 0.04, nitrite: 0.01, nitrate: 4, hardness: 11 },
  ];

  const seedFeedings = [
    { id: uuidv4(), tankId: tankId1, date: daysAgo(6), feedType: 'flake', amount: 2 },
    { id: uuidv4(), tankId: tankId1, date: daysAgo(4), feedType: 'pellet', amount: 3 },
    { id: uuidv4(), tankId: tankId1, date: daysAgo(2), feedType: 'flake', amount: 2 },
    { id: uuidv4(), tankId: tankId1, date: today, feedType: 'freeze-dried', amount: 1.5 },
    { id: uuidv4(), tankId: tankId2, date: daysAgo(5), feedType: 'pellet', amount: 4 },
    { id: uuidv4(), tankId: tankId2, date: daysAgo(3), feedType: 'flake', amount: 3 },
    { id: uuidv4(), tankId: tankId2, date: daysAgo(1), feedType: 'pellet', amount: 4 },
  ];

  const seedWaterChanges = [
    { id: uuidv4(), tankId: tankId1, date: daysAgo(7), volume: 30, addedStabilizer: true },
    { id: uuidv4(), tankId: tankId1, date: daysAgo(3), volume: 25, addedStabilizer: false },
    { id: uuidv4(), tankId: tankId2, date: daysAgo(10), volume: 40, addedStabilizer: true },
    { id: uuidv4(), tankId: tankId2, date: daysAgo(4), volume: 35, addedStabilizer: true },
  ];

  writeJSON(TANKS_FILE, seedTanks);
  writeJSON(READINGS_FILE, seedReadings);
  writeJSON(FEEDINGS_FILE, seedFeedings);
  writeJSON(WATER_CHANGES_FILE, seedWaterChanges);
}

seedData();

app.get('/api/tanks', (req, res) => {
  res.json(readJSON(TANKS_FILE));
});

app.post('/api/tanks', (req, res) => {
  const tanks = readJSON(TANKS_FILE);
  const newTank = { id: uuidv4(), ...req.body, fishGroups: req.body.fishGroups || [] };
  tanks.push(newTank);
  writeJSON(TANKS_FILE, tanks);
  res.status(201).json(newTank);
});

app.put('/api/tanks/:id', (req, res) => {
  const tanks = readJSON(TANKS_FILE);
  const idx = tanks.findIndex((t) => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Tank not found' });
  tanks[idx] = { ...tanks[idx], ...req.body, id: tanks[idx].id };
  writeJSON(TANKS_FILE, tanks);
  res.json(tanks[idx]);
});

app.delete('/api/tanks/:id', (req, res) => {
  let tanks = readJSON(TANKS_FILE);
  tanks = tanks.filter((t) => t.id !== req.params.id);
  writeJSON(TANKS_FILE, tanks);
  let readings = readJSON(READINGS_FILE);
  readings = readings.filter((r) => r.tankId !== req.params.id);
  writeJSON(READINGS_FILE, readings);
  let feedings = readJSON(FEEDINGS_FILE);
  feedings = feedings.filter((f) => f.tankId !== req.params.id);
  writeJSON(FEEDINGS_FILE, feedings);
  let waterChanges = readJSON(WATER_CHANGES_FILE);
  waterChanges = waterChanges.filter((w) => w.tankId !== req.params.id);
  writeJSON(WATER_CHANGES_FILE, waterChanges);
  res.status(204).end();
});

app.get('/api/tanks/:id/readings', (req, res) => {
  const readings = readJSON(READINGS_FILE).filter((r) => r.tankId === req.params.id);
  res.json(readings);
});

app.post('/api/tanks/:id/readings', (req, res) => {
  const readings = readJSON(READINGS_FILE);
  const newReading = { id: uuidv4(), tankId: req.params.id, ...req.body };
  readings.push(newReading);
  writeJSON(READINGS_FILE, readings);
  res.status(201).json(newReading);
});

app.delete('/api/tanks/:id/readings/:readingId', (req, res) => {
  let readings = readJSON(READINGS_FILE);
  readings = readings.filter((r) => r.id !== req.params.readingId);
  writeJSON(READINGS_FILE, readings);
  res.status(204).end();
});

app.get('/api/tanks/:id/feedings', (req, res) => {
  const feedings = readJSON(FEEDINGS_FILE).filter((f) => f.tankId === req.params.id);
  res.json(feedings);
});

app.post('/api/tanks/:id/feedings', (req, res) => {
  const feedings = readJSON(FEEDINGS_FILE);
  const newFeeding = { id: uuidv4(), tankId: req.params.id, ...req.body };
  feedings.push(newFeeding);
  writeJSON(FEEDINGS_FILE, feedings);
  res.status(201).json(newFeeding);
});

app.get('/api/tanks/:id/water-changes', (req, res) => {
  const waterChanges = readJSON(WATER_CHANGES_FILE).filter((w) => w.tankId === req.params.id);
  res.json(waterChanges);
});

app.post('/api/tanks/:id/water-changes', (req, res) => {
  const waterChanges = readJSON(WATER_CHANGES_FILE);
  const newChange = { id: uuidv4(), tankId: req.params.id, ...req.body };
  waterChanges.push(newChange);
  writeJSON(WATER_CHANGES_FILE, waterChanges);
  res.status(201).json(newChange);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
