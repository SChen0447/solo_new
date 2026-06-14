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
const DATA_DIR = path.join(__dirname, 'data');

app.use(cors());
app.use(express.json());

const ensureDataDir = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
};

const readJSONFile = (filename) => {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    if (filename === 'recipes.json') return [];
    if (filename === 'inventory.json') return defaultInventory();
    return [];
  }
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return filename === 'recipes.json' ? [] : defaultInventory();
  }
};

const writeJSONFile = (filename, data) => {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
};

const defaultInventory = () => [
  { id: uuidv4(), name: '橄榄油', category: '基础油', amount: 1000, unit: 'g', threshold: 200 },
  { id: uuidv4(), name: '椰子油', category: '基础油', amount: 800, unit: 'g', threshold: 200 },
  { id: uuidv4(), name: '棕榈油', category: '基础油', amount: 600, unit: 'g', threshold: 200 },
  { id: uuidv4(), name: '山茶油', category: '基础油', amount: 500, unit: 'g', threshold: 200 },
  { id: uuidv4(), name: '甜杏仁油', category: '基础油', amount: 400, unit: 'g', threshold: 200 },
  { id: uuidv4(), name: '蒸馏水', category: '水相', amount: 2000, unit: 'ml', threshold: 500 },
  { id: uuidv4(), name: '牛奶', category: '水相', amount: 500, unit: 'ml', threshold: 200 },
  { id: uuidv4(), name: '豆浆', category: '水相', amount: 500, unit: 'ml', threshold: 200 },
  { id: uuidv4(), name: '氢氧化钠', category: '碱', amount: 300, unit: 'g', threshold: 100 },
  { id: uuidv4(), name: '薰衣草香精', category: '香精', amount: 50, unit: 'ml', threshold: 20 },
  { id: uuidv4(), name: '茶树香精', category: '香精', amount: 50, unit: 'ml', threshold: 20 },
  { id: uuidv4(), name: '玫瑰香精', category: '香精', amount: 30, unit: 'ml', threshold: 20 },
  { id: uuidv4(), name: '甜橙香精', category: '香精', amount: 30, unit: 'ml', threshold: 20 }
];

app.get('/api/recipes', (req, res) => {
  const recipes = readJSONFile('recipes.json');
  res.json(recipes);
});

app.get('/api/recipes/:id', (req, res) => {
  const recipes = readJSONFile('recipes.json');
  const recipe = recipes.find(r => r.id === req.params.id);
  if (!recipe) {
    return res.status(404).json({ error: '配方不存在' });
  }
  res.json(recipe);
});

app.post('/api/recipes', (req, res) => {
  const recipes = readJSONFile('recipes.json');
  const newRecipe = {
    id: uuidv4(),
    ...req.body,
    createdAt: new Date().toISOString(),
    simulations: []
  };
  recipes.push(newRecipe);
  writeJSONFile('recipes.json', recipes);
  res.status(201).json(newRecipe);
});

app.put('/api/recipes/:id', (req, res) => {
  const recipes = readJSONFile('recipes.json');
  const index = recipes.findIndex(r => r.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: '配方不存在' });
  }
  recipes[index] = { ...recipes[index], ...req.body, updatedAt: new Date().toISOString() };
  writeJSONFile('recipes.json', recipes);
  res.json(recipes[index]);
});

app.delete('/api/recipes/:id', (req, res) => {
  let recipes = readJSONFile('recipes.json');
  const initialLength = recipes.length;
  recipes = recipes.filter(r => r.id !== req.params.id);
  if (recipes.length === initialLength) {
    return res.status(404).json({ error: '配方不存在' });
  }
  writeJSONFile('recipes.json', recipes);
  res.json({ success: true });
});

app.post('/api/recipes/:id/simulations', (req, res) => {
  const recipes = readJSONFile('recipes.json');
  const index = recipes.findIndex(r => r.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: '配方不存在' });
  }
  const simulation = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    finalWeight: req.body.finalWeight
  };
  if (!recipes[index].simulations) {
    recipes[index].simulations = [];
  }
  recipes[index].simulations.push(simulation);
  writeJSONFile('recipes.json', recipes);
  res.status(201).json(simulation);
});

app.get('/api/inventory', (req, res) => {
  const inventory = readJSONFile('inventory.json');
  res.json(inventory);
});

app.post('/api/inventory', (req, res) => {
  const inventory = readJSONFile('inventory.json');
  const newItem = {
    id: uuidv4(),
    ...req.body
  };
  inventory.push(newItem);
  writeJSONFile('inventory.json', inventory);
  res.status(201).json(newItem);
});

app.put('/api/inventory/:id', (req, res) => {
  const inventory = readJSONFile('inventory.json');
  const index = inventory.findIndex(i => i.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: '库存项不存在' });
  }
  inventory[index] = { ...inventory[index], ...req.body };
  writeJSONFile('inventory.json', inventory);
  res.json(inventory[index]);
});

app.delete('/api/inventory/:id', (req, res) => {
  let inventory = readJSONFile('inventory.json');
  const initialLength = inventory.length;
  inventory = inventory.filter(i => i.id !== req.params.id);
  if (inventory.length === initialLength) {
    return res.status(404).json({ error: '库存项不存在' });
  }
  writeJSONFile('inventory.json', inventory);
  res.json({ success: true });
});

app.put('/api/inventory/batch/deduct', (req, res) => {
  const inventory = readJSONFile('inventory.json');
  const deductions = req.body;

  deductions.forEach(deduct => {
    const itemIndex = inventory.findIndex(i =>
      i.name === deduct.name && i.category === deduct.category
    );
    if (itemIndex !== -1) {
      inventory[itemIndex].amount = Math.max(0, inventory[itemIndex].amount - deduct.amount);
    }
  });

  writeJSONFile('inventory.json', inventory);
  res.json(inventory);
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
