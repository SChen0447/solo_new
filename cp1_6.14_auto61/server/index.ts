import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { Recipe, WeekPlan, ShoppingList } from '../src/types/index.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const dataDir = path.resolve('server/data');

function readJSON<T>(filename: string): T {
  const raw = fs.readFileSync(path.join(dataDir, filename), 'utf-8');
  return JSON.parse(raw);
}

function writeJSON<T>(filename: string, data: T): void {
  fs.writeFileSync(path.join(dataDir, filename), JSON.stringify(data, null, 2), 'utf-8');
}

interface RecipeData { recipes: Recipe[] }
interface PlanData { plans: WeekPlan[] }
interface ShoppingData { shoppingLists: ShoppingList[] }

// ============ Recipes ============

app.get('/api/recipes', (_req, res) => {
  const data = readJSON<RecipeData>('recipe.json');
  res.json(data.recipes);
});

app.get('/api/recipes/:id', (req, res) => {
  const data = readJSON<RecipeData>('recipe.json');
  const recipe = data.recipes.find(r => r.id === req.params.id);
  if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
  res.json(recipe);
});

app.post('/api/recipes', (req, res) => {
  const data = readJSON<RecipeData>('recipe.json');
  const now = new Date().toISOString();
  const recipe: Recipe = {
    ...req.body,
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
  };
  data.recipes.push(recipe);
  writeJSON('recipe.json', data);
  res.status(201).json(recipe);
});

app.put('/api/recipes/:id', (req, res) => {
  const data = readJSON<RecipeData>('recipe.json');
  const idx = data.recipes.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Recipe not found' });
  data.recipes[idx] = {
    ...data.recipes[idx],
    ...req.body,
    id: data.recipes[idx].id,
    createdAt: data.recipes[idx].createdAt,
    updatedAt: new Date().toISOString(),
  };
  writeJSON('recipe.json', data);
  res.json(data.recipes[idx]);
});

app.delete('/api/recipes/:id', (req, res) => {
  const data = readJSON<RecipeData>('recipe.json');
  data.recipes = data.recipes.filter(r => r.id !== req.params.id);
  writeJSON('recipe.json', data);
  res.status(204).end();
});

// ============ Plans ============

app.get('/api/plans', (_req, res) => {
  const data = readJSON<PlanData>('plan.json');
  res.json(data.plans);
});

app.get('/api/plans/:id', (req, res) => {
  const data = readJSON<PlanData>('plan.json');
  const plan = data.plans.find(p => p.id === req.params.id);
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  res.json(plan);
});

app.post('/api/plans', (req, res) => {
  const data = readJSON<PlanData>('plan.json');
  const plan: WeekPlan = {
    ...req.body,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
  };
  data.plans.push(plan);
  writeJSON('plan.json', data);
  res.status(201).json(plan);
});

app.put('/api/plans/:id', (req, res) => {
  const data = readJSON<PlanData>('plan.json');
  const idx = data.plans.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Plan not found' });
  data.plans[idx] = { ...data.plans[idx], ...req.body, id: data.plans[idx].id };
  writeJSON('plan.json', data);
  res.json(data.plans[idx]);
});

app.delete('/api/plans/:id', (req, res) => {
  const data = readJSON<PlanData>('plan.json');
  data.plans = data.plans.filter(p => p.id !== req.params.id);
  writeJSON('plan.json', data);
  res.status(204).end();
});

// ============ Shopping Lists ============

app.get('/api/shopping', (_req, res) => {
  const data = readJSON<ShoppingData>('shopping.json');
  res.json(data.shoppingLists);
});

app.get('/api/shopping/:id', (req, res) => {
  const data = readJSON<ShoppingData>('shopping.json');
  const list = data.shoppingLists.find(s => s.id === req.params.id);
  if (!list) return res.status(404).json({ error: 'Shopping list not found' });
  res.json(list);
});

app.post('/api/shopping', (req, res) => {
  const data = readJSON<ShoppingData>('shopping.json');
  const list: ShoppingList = {
    ...req.body,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
  };
  data.shoppingLists.push(list);
  writeJSON('shopping.json', data);
  res.status(201).json(list);
});

app.put('/api/shopping/:id', (req, res) => {
  const data = readJSON<ShoppingData>('shopping.json');
  const idx = data.shoppingLists.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Shopping list not found' });
  data.shoppingLists[idx] = { ...data.shoppingLists[idx], ...req.body, id: data.shoppingLists[idx].id };
  writeJSON('shopping.json', data);
  res.json(data.shoppingLists[idx]);
});

app.delete('/api/shopping/:id', (req, res) => {
  const data = readJSON<ShoppingData>('shopping.json');
  data.shoppingLists = data.shoppingLists.filter(s => s.id !== req.params.id);
  writeJSON('shopping.json', data);
  res.status(204).end();
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
