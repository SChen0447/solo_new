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
const DATA_FILE = path.join(DATA_DIR, 'recipes.json');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    const sampleRecipes = generateSampleData();
    fs.writeFileSync(DATA_FILE, JSON.stringify(sampleRecipes, null, 2), 'utf-8');
  }
}

function generateSampleData() {
  const now = new Date().toISOString();
  return [
    {
      id: uuidv4(),
      name: '经典法式黄油面包',
      type: 'bread',
      ingredients: [
        { id: uuidv4(), name: '高筋面粉', amount: 500, unitCost: 0.008 },
        { id: uuidv4(), name: '黄油', amount: 100, unitCost: 0.06 },
        { id: uuidv4(), name: '糖', amount: 50, unitCost: 0.01 },
        { id: uuidv4(), name: '鸡蛋', amount: 100, unitCost: 0.015 },
        { id: uuidv4(), name: '酵母', amount: 8, unitCost: 0.05 },
        { id: uuidv4(), name: '牛奶', amount: 250, unitCost: 0.006 }
      ],
      experiments: [
        {
          id: uuidv4(),
          bakingDate: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
          actualWeight: 780,
          browningScore: 7,
          riseUniformity: 6,
          textureDescription: '外皮酥脆，内部组织略有孔洞，发酵稍欠',
          costNote: '黄油使用国产替代',
          photos: [
            'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=400',
            'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400'
          ],
          actualCost: 15.2,
          createdAt: new Date(Date.now() - 7 * 86400000).toISOString()
        },
        {
          id: uuidv4(),
          bakingDate: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
          actualWeight: 820,
          browningScore: 5,
          riseUniformity: 8,
          textureDescription: '内部组织均匀细密，口感柔软，下次试试加20g黄油',
          photos: [
            'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400'
          ],
          actualCost: 16.8,
          createdAt: new Date(Date.now() - 2 * 86400000).toISOString()
        }
      ],
      createdAt: now,
      updatedAt: now
    },
    {
      id: uuidv4(),
      name: '巧克力熔岩蛋糕',
      type: 'cake',
      ingredients: [
        { id: uuidv4(), name: '黑巧克力', amount: 200, unitCost: 0.12 },
        { id: uuidv4(), name: '黄油', amount: 150, unitCost: 0.06 },
        { id: uuidv4(), name: '鸡蛋', amount: 200, unitCost: 0.015 },
        { id: uuidv4(), name: '糖', amount: 100, unitCost: 0.01 },
        { id: uuidv4(), name: '低筋面粉', amount: 60, unitCost: 0.01 }
      ],
      experiments: [
        {
          id: uuidv4(),
          bakingDate: new Date(Date.now() - 4 * 86400000).toISOString().split('T')[0],
          actualWeight: 520,
          browningScore: 6,
          riseUniformity: 5,
          textureDescription: '流心效果好，表皮略硬',
          photos: [
            'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400'
          ],
          actualCost: 38.5,
          createdAt: new Date(Date.now() - 4 * 86400000).toISOString()
        }
      ],
      createdAt: now,
      updatedAt: now
    },
    {
      id: uuidv4(),
      name: '经典黄油曲奇',
      type: 'cookie',
      ingredients: [
        { id: uuidv4(), name: '低筋面粉', amount: 200, unitCost: 0.01 },
        { id: uuidv4(), name: '黄油', amount: 130, unitCost: 0.06 },
        { id: uuidv4(), name: '糖粉', amount: 80, unitCost: 0.012 },
        { id: uuidv4(), name: '鸡蛋', amount: 40, unitCost: 0.015 },
        { id: uuidv4(), name: '香草精', amount: 5, unitCost: 0.2 }
      ],
      experiments: [],
      createdAt: now,
      updatedAt: now
    }
  ];
}

function readRecipes() {
  ensureDataFile();
  const data = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(data);
}

function writeRecipes(recipes) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(recipes, null, 2), 'utf-8');
}

app.get('/api/recipes', (req, res) => {
  try {
    const recipes = readRecipes();
    res.json(recipes);
  } catch (err) {
    res.status(500).json({ error: '读取配方数据失败' });
  }
});

app.get('/api/recipes/:id', (req, res) => {
  try {
    const recipes = readRecipes();
    const recipe = recipes.find(r => r.id === req.params.id);
    if (!recipe) {
      return res.status(404).json({ error: '配方不存在' });
    }
    res.json(recipe);
  } catch (err) {
    res.status(500).json({ error: '读取配方失败' });
  }
});

app.post('/api/recipes', (req, res) => {
  try {
    const recipes = readRecipes();
    const now = new Date().toISOString();
    const newRecipe = {
      id: uuidv4(),
      ...req.body,
      ingredients: (req.body.ingredients || []).map(ing => ({
        ...ing,
        id: ing.id || uuidv4()
      })),
      experiments: [],
      createdAt: now,
      updatedAt: now
    };
    recipes.push(newRecipe);
    writeRecipes(recipes);
    res.status(201).json(newRecipe);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '创建配方失败' });
  }
});

app.put('/api/recipes/:id', (req, res) => {
  try {
    const recipes = readRecipes();
    const index = recipes.findIndex(r => r.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: '配方不存在' });
    }
    const now = new Date().toISOString();
    recipes[index] = {
      ...recipes[index],
      ...req.body,
      id: recipes[index].id,
      experiments: recipes[index].experiments,
      createdAt: recipes[index].createdAt,
      updatedAt: now
    };
    writeRecipes(recipes);
    res.json(recipes[index]);
  } catch (err) {
    res.status(500).json({ error: '更新配方失败' });
  }
});

app.delete('/api/recipes/:id', (req, res) => {
  try {
    const recipes = readRecipes();
    const filtered = recipes.filter(r => r.id !== req.params.id);
    if (filtered.length === recipes.length) {
      return res.status(404).json({ error: '配方不存在' });
    }
    writeRecipes(filtered);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '删除配方失败' });
  }
});

app.post('/api/recipes/:id/experiments', (req, res) => {
  try {
    const recipes = readRecipes();
    const index = recipes.findIndex(r => r.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: '配方不存在' });
    }
    const now = new Date().toISOString();
    const newExperiment = {
      id: uuidv4(),
      ...req.body,
      recipeId: recipes[index].id,
      createdAt: now
    };
    recipes[index].experiments.push(newExperiment);
    recipes[index].updatedAt = now;
    writeRecipes(recipes);
    res.status(201).json(newExperiment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '创建实验记录失败' });
  }
});

app.put('/api/recipes/:recipeId/experiments/:expId', (req, res) => {
  try {
    const recipes = readRecipes();
    const recipeIndex = recipes.findIndex(r => r.id === req.params.recipeId);
    if (recipeIndex === -1) {
      return res.status(404).json({ error: '配方不存在' });
    }
    const expIndex = recipes[recipeIndex].experiments.findIndex(
      e => e.id === req.params.expId
    );
    if (expIndex === -1) {
      return res.status(404).json({ error: '实验记录不存在' });
    }
    recipes[recipeIndex].experiments[expIndex] = {
      ...recipes[recipeIndex].experiments[expIndex],
      ...req.body,
      id: recipes[recipeIndex].experiments[expIndex].id,
      recipeId: recipes[recipeIndex].experiments[expIndex].recipeId,
      createdAt: recipes[recipeIndex].experiments[expIndex].createdAt
    };
    recipes[recipeIndex].updatedAt = new Date().toISOString();
    writeRecipes(recipes);
    res.json(recipes[recipeIndex].experiments[expIndex]);
  } catch (err) {
    res.status(500).json({ error: '更新实验记录失败' });
  }
});

app.delete('/api/recipes/:recipeId/experiments/:expId', (req, res) => {
  try {
    const recipes = readRecipes();
    const recipeIndex = recipes.findIndex(r => r.id === req.params.recipeId);
    if (recipeIndex === -1) {
      return res.status(404).json({ error: '配方不存在' });
    }
    const beforeLen = recipes[recipeIndex].experiments.length;
    recipes[recipeIndex].experiments = recipes[recipeIndex].experiments.filter(
      e => e.id !== req.params.expId
    );
    if (recipes[recipeIndex].experiments.length === beforeLen) {
      return res.status(404).json({ error: '实验记录不存在' });
    }
    recipes[recipeIndex].updatedAt = new Date().toISOString();
    writeRecipes(recipes);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '删除实验记录失败' });
  }
});

ensureDataFile();

app.listen(PORT, () => {
  console.log(`烘焙实验室后端服务运行在 http://localhost:${PORT}`);
});
