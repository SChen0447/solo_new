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
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json());

interface Recipe {
  id: string;
  name: string;
  beanOrigin: string;
  roastLevel: 'light' | 'medium' | 'dark';
  grindSize: 'coarse' | 'medium-coarse' | 'medium' | 'fine' | 'extra-fine';
  waterTemp: number;
  ratio: number;
  brewTime: number;
  flavorRating: number;
  notes: string;
  createdAt: string;
}

const readData = (): Recipe[] => {
  if (!fs.existsSync(DATA_FILE)) {
    return [];
  }
  const data = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(data);
};

const writeData = (recipes: Recipe[]) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(recipes, null, 2));
};

app.get('/api/recipes', (req, res) => {
  const recipes = readData();
  res.json(recipes);
});

app.get('/api/recipes/:id', (req, res) => {
  const recipes = readData();
  const recipe = recipes.find(r => r.id === req.params.id);
  if (!recipe) {
    res.status(404).json({ error: '配方不存在' });
    return;
  }
  res.json(recipe);
});

app.post('/api/recipes', (req, res) => {
  const recipes = readData();
  const newRecipe: Recipe = {
    id: uuidv4(),
    name: req.body.name,
    beanOrigin: req.body.beanOrigin,
    roastLevel: req.body.roastLevel,
    grindSize: req.body.grindSize,
    waterTemp: req.body.waterTemp,
    ratio: req.body.ratio,
    brewTime: req.body.brewTime,
    flavorRating: req.body.flavorRating,
    notes: req.body.notes,
    createdAt: new Date().toISOString(),
  };
  recipes.push(newRecipe);
  writeData(recipes);
  res.status(201).json(newRecipe);
});

app.put('/api/recipes/:id', (req, res) => {
  const recipes = readData();
  const index = recipes.findIndex(r => r.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: '配方不存在' });
    return;
  }
  const updatedRecipe = {
    ...recipes[index],
    ...req.body,
    id: recipes[index].id,
    createdAt: recipes[index].createdAt,
  };
  recipes[index] = updatedRecipe;
  writeData(recipes);
  res.json(updatedRecipe);
});

app.delete('/api/recipes/:id', (req, res) => {
  const recipes = readData();
  const filtered = recipes.filter(r => r.id !== req.params.id);
  if (filtered.length === recipes.length) {
    res.status(404).json({ error: '配方不存在' });
    return;
  }
  writeData(filtered);
  res.status(204).send();
});

app.get('/api/chart-data', (req, res) => {
  const recipes = readData();
  const chartData = recipes.map(r => ({
    id: r.id,
    name: r.name,
    beanOrigin: r.beanOrigin,
    waterTemp: r.waterTemp,
    ratio: r.ratio,
    brewTime: r.brewTime,
    flavorRating: r.flavorRating,
    roastLevel: r.roastLevel,
    grindSize: r.grindSize,
    createdAt: r.createdAt,
  }));
  res.json(chartData);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
