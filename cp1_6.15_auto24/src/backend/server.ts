import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RECIPES_PATH = path.join(__dirname, 'data', 'recipes.json');
const FAVORITES_PATH = path.join(__dirname, 'data', 'favorites.json');

const app = express();
app.use(cors());
app.use(express.json());

function readJSON(filePath: string): any {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

function writeJSON(filePath: string, data: any): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

interface Nutrition {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
}

interface Recipe {
  id: string;
  name: string;
  ingredients: string[];
  cookTime: number;
  nutrition: Nutrition;
  allergens: string[];
}

interface SearchResult extends Recipe {
  matchedCount: number;
  totalIngredients: number;
  matchPercentage: number;
}

interface Favorite {
  id: string;
  recipeId: string;
  recipeName: string;
  addedAt: number;
  rating: 0 | 1 | 2 | 3 | 4 | 5;
  note: string;
}

app.post('/api/search', (req, res) => {
  try {
    const { ingredients } = req.body as { ingredients: string[] };
    if (!ingredients || ingredients.length === 0) {
      return res.status(400).json({ error: '请输入至少一种食材' });
    }
    const userIngredients = ingredients.map((i) => i.trim()).filter(Boolean);
    const recipes: Recipe[] = readJSON(RECIPES_PATH);

    const results: SearchResult[] = recipes
      .map((recipe) => {
        const matched = recipe.ingredients.filter((ing) =>
          userIngredients.some(
            (u) => u === ing || u.includes(ing) || ing.includes(u)
          )
        );
        return {
          ...recipe,
          matchedCount: matched.length,
          totalIngredients: recipe.ingredients.length,
          matchPercentage:
            matched.length === 0
              ? 0
              : Math.round((matched.length / recipe.ingredients.length) * 100),
        };
      })
      .filter((r) => r.matchedCount >= 3)
      .sort((a, b) => b.matchPercentage - a.matchPercentage);

    setTimeout(() => {
      res.json({ results });
    }, 120);
  } catch (err) {
    res.status(500).json({ error: '搜索失败' });
  }
});

app.get('/api/recipe/:id', (req, res) => {
  try {
    const { id } = req.params;
    const recipes: Recipe[] = readJSON(RECIPES_PATH);
    const recipe = recipes.find((r) => r.id === id);
    if (!recipe) {
      return res.status(404).json({ error: '菜谱不存在' });
    }
    res.json({ recipe });
  } catch (err) {
    res.status(500).json({ error: '获取菜谱失败' });
  }
});

app.get('/api/favorites', (_req, res) => {
  try {
    const favorites: Favorite[] = readJSON(FAVORITES_PATH);
    res.json({ favorites });
  } catch (err) {
    res.status(500).json({ error: '获取收藏失败' });
  }
});

app.post('/api/favorites', (req, res) => {
  try {
    const { recipeId, recipeName } = req.body as {
      recipeId: string;
      recipeName: string;
    };
    if (!recipeId || !recipeName) {
      return res.status(400).json({ error: '参数缺失' });
    }
    const favorites: Favorite[] = readJSON(FAVORITES_PATH);
    const exists = favorites.find((f) => f.recipeId === recipeId);
    if (exists) {
      return res.json({ favorite: exists });
    }
    const newFav: Favorite = {
      id: uuidv4(),
      recipeId,
      recipeName,
      addedAt: Date.now(),
      rating: 0,
      note: '',
    };
    favorites.push(newFav);
    writeJSON(FAVORITES_PATH, favorites);
    res.json({ favorite: newFav });
  } catch (err) {
    res.status(500).json({ error: '添加收藏失败' });
  }
});

app.put('/api/favorites/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { rating, note } = req.body as Partial<Pick<Favorite, 'rating' | 'note'>>;
    const favorites: Favorite[] = readJSON(FAVORITES_PATH);
    const idx = favorites.findIndex((f) => f.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: '收藏不存在' });
    }
    if (rating !== undefined) favorites[idx].rating = rating;
    if (note !== undefined) favorites[idx].note = note;
    writeJSON(FAVORITES_PATH, favorites);
    res.json({ favorite: favorites[idx] });
  } catch (err) {
    res.status(500).json({ error: '更新收藏失败' });
  }
});

app.delete('/api/favorites/:id', (req, res) => {
  try {
    const { id } = req.params;
    const favorites: Favorite[] = readJSON(FAVORITES_PATH);
    const filtered = favorites.filter((f) => f.id !== id);
    if (filtered.length === favorites.length) {
      return res.status(404).json({ error: '收藏不存在' });
    }
    writeJSON(FAVORITES_PATH, filtered);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '删除收藏失败' });
  }
});

app.delete('/api/favorites/recipe/:recipeId', (req, res) => {
  try {
    const { recipeId } = req.params;
    const favorites: Favorite[] = readJSON(FAVORITES_PATH);
    const filtered = favorites.filter((f) => f.recipeId !== recipeId);
    writeJSON(FAVORITES_PATH, filtered);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '取消收藏失败' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`[server] 配方探索者后端运行在 http://localhost:${PORT}`);
});
