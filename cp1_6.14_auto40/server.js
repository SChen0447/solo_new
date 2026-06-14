import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_DIR = path.join(__dirname, 'data');
const RECIPES_FILE = path.join(DATA_DIR, 'recipes.json');
const FAVORITES_FILE = path.join(DATA_DIR, 'favorites.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

app.use(express.json({ limit: '10mb' }));

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const readJSONFile = (filePath, defaultData) => {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
      return defaultData;
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`读取文件失败: ${filePath}`, error);
    return defaultData;
  }
};

const writeJSONFile = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`写入文件失败: ${filePath}`, error);
    return false;
  }
};

const sampleRecipes = [
  {
    id: uuidv4(),
    name: '经典巧克力蛋糕',
    description: '浓郁的巧克力风味，口感绵密湿润，适合各种场合的经典甜品。',
    difficulty: '中等',
    prepTime: 30,
    bakeTemp: 180,
    bakeTime: 45,
    originalServings: 8,
    color: '#E8A87C',
    ingredients: [
      { id: uuidv4(), name: '低筋面粉', amount: 200, unit: '克', percentage: 33.33 },
      { id: uuidv4(), name: '白砂糖', amount: 180, unit: '克', percentage: 30.00 },
      { id: uuidv4(), name: '可可粉', amount: 60, unit: '克', percentage: 10.00 },
      { id: uuidv4(), name: '鸡蛋', amount: 4, unit: '个', percentage: 13.33 },
      { id: uuidv4(), name: '牛奶', amount: 80, unit: '毫升', percentage: 13.34 },
    ],
    createdAt: Date.now() - 86400000,
  },
  {
    id: uuidv4(),
    name: '黄油曲奇',
    description: '酥脆香甜，黄油香气浓郁的经典小饼干。',
    difficulty: '简单',
    prepTime: 20,
    bakeTemp: 170,
    bakeTime: 15,
    originalServings: 24,
    color: '#C38D9E',
    ingredients: [
      { id: uuidv4(), name: '黄油', amount: 200, unit: '克', percentage: 40.00 },
      { id: uuidv4(), name: '糖粉', amount: 100, unit: '克', percentage: 20.00 },
      { id: uuidv4(), name: '低筋面粉', amount: 200, unit: '克', percentage: 40.00 },
    ],
    createdAt: Date.now() - 172800000,
  },
  {
    id: uuidv4(),
    name: '法式马卡龙',
    description: '外酥内软，色彩缤纷的经典法式甜点，制作难度较高。',
    difficulty: '困难',
    prepTime: 60,
    bakeTemp: 150,
    bakeTime: 12,
    originalServings: 20,
    color: '#85DCB8',
    ingredients: [
      { id: uuidv4(), name: '杏仁粉', amount: 100, unit: '克', percentage: 33.33 },
      { id: uuidv4(), name: '糖粉', amount: 100, unit: '克', percentage: 33.33 },
      { id: uuidv4(), name: '蛋白', amount: 80, unit: '克', percentage: 26.67 },
      { id: uuidv4(), name: '白砂糖', amount: 20, unit: '克', percentage: 6.67 },
    ],
    createdAt: Date.now() - 259200000,
  },
];

const defaultSettings = {
  theme: 'warm',
  defaultServings: 4,
  searchDebounce: 300,
};

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '烘焙食谱 API 服务运行中' });
});

app.get('/api/recipes', (req, res) => {
  const recipes = readJSONFile(RECIPES_FILE, sampleRecipes);
  res.json(recipes);
});

app.get('/api/recipes/:id', (req, res) => {
  const recipes = readJSONFile(RECIPES_FILE, sampleRecipes);
  const recipe = recipes.find((r) => r.id === req.params.id);
  if (!recipe) {
    return res.status(404).json({ error: '食谱不存在' });
  }
  res.json(recipe);
});

app.post('/api/recipes', (req, res) => {
  const recipes = readJSONFile(RECIPES_FILE, sampleRecipes);
  const { name, description, difficulty, prepTime, bakeTemp, bakeTime, ingredients, originalServings } = req.body;

  if (!name || name.trim().length === 0 || name.length > 50) {
    return res.status(400).json({ error: '食谱名称必填且不能超过50字符' });
  }
  if (description && description.length > 200) {
    return res.status(400).json({ error: '简介不能超过200字符' });
  }
  if (!['简单', '中等', '困难'].includes(difficulty)) {
    return res.status(400).json({ error: '难度值无效' });
  }
  if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
    return res.status(400).json({ error: '至少需要一条配料' });
  }

  const warmColors = ['#F4A261', '#E76F51', '#E9C46A', '#F6BD60', '#E8A87C', '#C38D9E', '#85DCB8', '#F8B195', '#F67280', '#C06C84'];
  const randomColor = warmColors[Math.floor(Math.random() * warmColors.length)];

  const newRecipe = {
    id: uuidv4(),
    name: name.trim(),
    description: description || '',
    difficulty,
    prepTime: parseInt(prepTime, 10) || 0,
    bakeTemp: parseInt(bakeTemp, 10) || 0,
    bakeTime: parseInt(bakeTime, 10) || 0,
    originalServings: parseInt(originalServings, 10) || 4,
    color: randomColor,
    ingredients: ingredients.map((ing) => ({
      id: ing.id || uuidv4(),
      name: ing.name.trim(),
      amount: parseFloat(ing.amount) || 0,
      unit: ing.unit,
      percentage: parseFloat(ing.percentage) || 0,
    })),
    createdAt: Date.now(),
  };

  recipes.unshift(newRecipe);
  writeJSONFile(RECIPES_FILE, recipes);
  res.status(201).json(newRecipe);
});

app.put('/api/recipes/:id', (req, res) => {
  const recipes = readJSONFile(RECIPES_FILE, sampleRecipes);
  const index = recipes.findIndex((r) => r.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: '食谱不存在' });
  }

  const { name, description, difficulty, prepTime, bakeTemp, bakeTime, ingredients, originalServings } = req.body;

  if (!name || name.trim().length === 0 || name.length > 50) {
    return res.status(400).json({ error: '食谱名称必填且不能超过50字符' });
  }
  if (description && description.length > 200) {
    return res.status(400).json({ error: '简介不能超过200字符' });
  }
  if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
    return res.status(400).json({ error: '至少需要一条配料' });
  }

  recipes[index] = {
    ...recipes[index],
    name: name.trim(),
    description: description || '',
    difficulty: difficulty || recipes[index].difficulty,
    prepTime: parseInt(prepTime, 10) || recipes[index].prepTime,
    bakeTemp: parseInt(bakeTemp, 10) || recipes[index].bakeTemp,
    bakeTime: parseInt(bakeTime, 10) || recipes[index].bakeTime,
    originalServings: parseInt(originalServings, 10) || recipes[index].originalServings,
    ingredients: ingredients.map((ing) => ({
      id: ing.id || uuidv4(),
      name: ing.name.trim(),
      amount: parseFloat(ing.amount) || 0,
      unit: ing.unit,
      percentage: parseFloat(ing.percentage) || 0,
    })),
    updatedAt: Date.now(),
  };

  writeJSONFile(RECIPES_FILE, recipes);
  res.json(recipes[index]);
});

app.delete('/api/recipes/:id', (req, res) => {
  let recipes = readJSONFile(RECIPES_FILE, sampleRecipes);
  const exists = recipes.some((r) => r.id === req.params.id);
  if (!exists) {
    return res.status(404).json({ error: '食谱不存在' });
  }
  recipes = recipes.filter((r) => r.id !== req.params.id);
  writeJSONFile(RECIPES_FILE, recipes);

  let favorites = readJSONFile(FAVORITES_FILE, []);
  favorites = favorites.filter((id) => id !== req.params.id);
  writeJSONFile(FAVORITES_FILE, favorites);

  res.json({ success: true });
});

app.get('/api/favorites', (req, res) => {
  const favorites = readJSONFile(FAVORITES_FILE, []);
  res.json(favorites);
});

app.post('/api/favorites/:id', (req, res) => {
  const favorites = readJSONFile(FAVORITES_FILE, []);
  const recipeId = req.params.id;
  if (!favorites.includes(recipeId)) {
    favorites.push(recipeId);
    writeJSONFile(FAVORITES_FILE, favorites);
  }
  res.json(favorites);
});

app.delete('/api/favorites/:id', (req, res) => {
  let favorites = readJSONFile(FAVORITES_FILE, []);
  favorites = favorites.filter((id) => id !== req.params.id);
  writeJSONFile(FAVORITES_FILE, favorites);
  res.json(favorites);
});

app.get('/api/settings', (req, res) => {
  const settings = readJSONFile(SETTINGS_FILE, defaultSettings);
  res.json(settings);
});

app.put('/api/settings', (req, res) => {
  const settings = readJSONFile(SETTINGS_FILE, defaultSettings);
  const updated = { ...settings, ...req.body };
  writeJSONFile(SETTINGS_FILE, updated);
  res.json(updated);
});

app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ error: '服务器内部错误' });
});

app.listen(PORT, () => {
  console.log(`🚀 烘焙食谱 API 服务器运行在: http://localhost:${PORT}`);
  readJSONFile(RECIPES_FILE, sampleRecipes);
  readJSONFile(FAVORITES_FILE, []);
  readJSONFile(SETTINGS_FILE, defaultSettings);
});
