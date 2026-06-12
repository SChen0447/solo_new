import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Ingredient {
  id: string;
  name: string;
  quantity: string;
}

export interface Step {
  id: string;
  description: string;
  emoji?: string;
}

export interface Recipe {
  id: string;
  name: string;
  coverScheme: number;
  cookTime: number;
  difficulty: Difficulty;
  emoji: string;
  ingredients: Ingredient[];
  steps: Step[];
  notes: string;
  createdAt: string;
  tags: string[];
}

const pantryIngredients: string[] = [
  '盐', '糖', '酱油', '醋', '食用油', '鸡蛋', '面粉', '大米',
  '蒜头', '生姜', '葱', '料酒', '生抽', '老抽', '蚝油',
  '白胡椒粉', '淀粉', '鸡精', '味精', '香油',
];

let recipes: Recipe[] = [
  {
    id: uuidv4(),
    name: '番茄炒蛋',
    coverScheme: 0,
    cookTime: 15,
    difficulty: 'easy',
    emoji: '🍅',
    tags: ['家常', '快手', '下饭菜'],
    notes: '<p><strong>小贴士：</strong></p><ul><li>鸡蛋要炒嫩一点，先盛出备用</li><li>番茄最好去皮，口感更佳</li></ul>',
    createdAt: new Date().toISOString(),
    ingredients: [
      { id: uuidv4(), name: '番茄', quantity: '2个' },
      { id: uuidv4(), name: '鸡蛋', quantity: '3个' },
      { id: uuidv4(), name: '盐', quantity: '适量' },
      { id: uuidv4(), name: '糖', quantity: '1小勺' },
      { id: uuidv4(), name: '葱', quantity: '少许' },
      { id: uuidv4(), name: '食用油', quantity: '适量' },
    ],
    steps: [
      { id: uuidv4(), description: '番茄去皮切块，鸡蛋打散，葱切葱花', emoji: '🔪' },
      { id: uuidv4(), description: '热锅倒油，倒入蛋液炒至金黄盛出备用', emoji: '🍳' },
      { id: uuidv4(), description: '锅中再加少许油，放入番茄块翻炒出汁', emoji: '🔥' },
      { id: uuidv4(), description: '加入盐和糖调味，倒入炒好的鸡蛋翻拌均匀', emoji: '🥄' },
      { id: uuidv4(), description: '撒上葱花即可出锅', emoji: '✨' },
    ],
  },
  {
    id: uuidv4(),
    name: '红烧排骨',
    coverScheme: 1,
    cookTime: 60,
    difficulty: 'medium',
    emoji: '🍖',
    tags: ['家常', '宴客', '硬菜'],
    notes: '<p>可以提前焯水去腥，冰糖上色更漂亮</p>',
    createdAt: new Date().toISOString(),
    ingredients: [
      { id: uuidv4(), name: '排骨', quantity: '500g' },
      { id: uuidv4(), name: '冰糖', quantity: '30g' },
      { id: uuidv4(), name: '生抽', quantity: '2勺' },
      { id: uuidv4(), name: '老抽', quantity: '1勺' },
      { id: uuidv4(), name: '料酒', quantity: '2勺' },
      { id: uuidv4(), name: '生姜', quantity: '3片' },
      { id: uuidv4(), name: '蒜头', quantity: '5瓣' },
      { id: uuidv4(), name: '八角', quantity: '2个' },
    ],
    steps: [
      { id: uuidv4(), description: '排骨冷水下锅焯水，加入料酒去腥，捞出沥干', emoji: '💧' },
      { id: uuidv4(), description: '锅中放少许油，加入冰糖小火炒出糖色', emoji: '🍬' },
      { id: uuidv4(), description: '放入排骨翻炒均匀上色', emoji: '🔥' },
      { id: uuidv4(), description: '加入姜片、蒜瓣、八角爆香，倒入生抽、老抽', emoji: '🧄' },
      { id: uuidv4(), description: '加入没过排骨的热水，大火烧开转小火炖40分钟', emoji: '⏰' },
      { id: uuidv4(), description: '大火收汁即可出锅', emoji: '✨' },
    ],
  },
  {
    id: uuidv4(),
    name: '蒜蓉西兰花',
    coverScheme: 2,
    cookTime: 10,
    difficulty: 'easy',
    emoji: '🥦',
    tags: ['素菜', '健康', '快手'],
    notes: '<p>焯水时加少许盐和油，西兰花更翠绿</p>',
    createdAt: new Date().toISOString(),
    ingredients: [
      { id: uuidv4(), name: '西兰花', quantity: '1颗' },
      { id: uuidv4(), name: '蒜头', quantity: '5瓣' },
      { id: uuidv4(), name: '盐', quantity: '适量' },
      { id: uuidv4(), name: '蚝油', quantity: '1勺' },
      { id: uuidv4(), name: '食用油', quantity: '适量' },
    ],
    steps: [
      { id: uuidv4(), description: '西兰花掰小朵，用盐水浸泡10分钟后冲洗干净', emoji: '💧' },
      { id: uuidv4(), description: '烧开水，加少许盐和油，放入西兰花焯水1分钟捞出', emoji: '♨️' },
      { id: uuidv4(), description: '热锅倒油，爆香蒜末', emoji: '🧄' },
      { id: uuidv4(), description: '倒入西兰花快速翻炒，加蚝油和盐调味', emoji: '🔥' },
    ],
  },
  {
    id: uuidv4(),
    name: '宫保鸡丁',
    coverScheme: 3,
    cookTime: 25,
    difficulty: 'medium',
    emoji: '🌶️',
    tags: ['川菜', '经典', '下饭菜'],
    notes: '<p><strong>调味汁比例：</strong>醋2:糖2:酱油1:淀粉1，加水调匀</p>',
    createdAt: new Date().toISOString(),
    ingredients: [
      { id: uuidv4(), name: '鸡胸肉', quantity: '300g' },
      { id: uuidv4(), name: '花生米', quantity: '50g' },
      { id: uuidv4(), name: '干辣椒', quantity: '8个' },
      { id: uuidv4(), name: '花椒', quantity: '1小勺' },
      { id: uuidv4(), name: '葱白', quantity: '2段' },
      { id: uuidv4(), name: '生姜', quantity: '2片' },
      { id: uuidv4(), name: '蒜头', quantity: '3瓣' },
      { id: uuidv4(), name: '醋', quantity: '2勺' },
      { id: uuidv4(), name: '糖', quantity: '2勺' },
      { id: uuidv4(), name: '淀粉', quantity: '适量' },
    ],
    steps: [
      { id: uuidv4(), description: '鸡胸肉切丁，用料酒、盐、淀粉腌制15分钟', emoji: '🔪' },
      { id: uuidv4(), description: '调碗汁：醋、糖、生抽、淀粉、水调匀', emoji: '🥣' },
      { id: uuidv4(), description: '热锅冷油，下花生米炸至金黄盛出', emoji: '🥜' },
      { id: uuidv4(), description: '锅中留底油，爆香干辣椒和花椒', emoji: '🌶️' },
      { id: uuidv4(), description: '下鸡丁滑炒至变色，加葱姜蒜翻炒', emoji: '🔥' },
      { id: uuidv4(), description: '倒入碗汁快速翻炒，最后加入花生米翻匀出锅', emoji: '✨' },
    ],
  },
  {
    id: uuidv4(),
    name: '提拉米苏',
    coverScheme: 4,
    cookTime: 40,
    difficulty: 'hard',
    emoji: '🍰',
    tags: ['甜品', '烘焙', '意式'],
    notes: '<p><strong>注意：</strong></p><ul><li>马斯卡彭奶酪不能冷冻</li><li>手指饼干不要蘸太久</li></ul>',
    createdAt: new Date().toISOString(),
    ingredients: [
      { id: uuidv4(), name: '马斯卡彭奶酪', quantity: '250g' },
      { id: uuidv4(), name: '手指饼干', quantity: '200g' },
      { id: uuidv4(), name: '浓缩咖啡', quantity: '200ml' },
      { id: uuidv4(), name: '鸡蛋', quantity: '3个' },
      { id: uuidv4(), name: '糖', quantity: '60g' },
      { id: uuidv4(), name: '淡奶油', quantity: '150ml' },
      { id: uuidv4(), name: '可可粉', quantity: '适量' },
    ],
    steps: [
      { id: uuidv4(), description: '蛋黄加糖打发至颜色变浅，加入马斯卡彭搅拌均匀', emoji: '🥚' },
      { id: uuidv4(), description: '淡奶油打发至6分发，与芝士糊混合', emoji: '🥛' },
      { id: uuidv4(), description: '蛋白打发至湿性发泡，分次翻拌入芝士糊', emoji: '☁️' },
      { id: uuidv4(), description: '手指饼干快速蘸咖啡，铺一层在容器底部', emoji: '🍪' },
      { id: uuidv4(), description: '倒一层芝士糊，重复铺饼干和芝士，冷藏4小时以上', emoji: '❄️' },
      { id: uuidv4(), description: '食用前筛上可可粉', emoji: '✨' },
    ],
  },
  {
    id: uuidv4(),
    name: '麻婆豆腐',
    coverScheme: 5,
    cookTime: 20,
    difficulty: 'medium',
    emoji: '🍲',
    tags: ['川菜', '家常', '下饭'],
    notes: '<p>用嫩豆腐口感更好，花椒粉是灵魂</p>',
    createdAt: new Date().toISOString(),
    ingredients: [
      { id: uuidv4(), name: '嫩豆腐', quantity: '1盒' },
      { id: uuidv4(), name: '猪肉末', quantity: '100g' },
      { id: uuidv4(), name: '豆瓣酱', quantity: '2勺' },
      { id: uuidv4(), name: '花椒粉', quantity: '1小勺' },
      { id: uuidv4(), name: '葱白', quantity: '适量' },
      { id: uuidv4(), name: '生姜', quantity: '适量' },
      { id: uuidv4(), name: '蒜头', quantity: '适量' },
      { id: uuidv4(), name: '淀粉', quantity: '适量' },
    ],
    steps: [
      { id: uuidv4(), description: '豆腐切小块，用淡盐水浸泡后沥干', emoji: '🔪' },
      { id: uuidv4(), description: '热锅倒油，炒散肉末至变色', emoji: '🥩' },
      { id: uuidv4(), description: '加入豆瓣酱炒出红油，下葱姜蒜末爆香', emoji: '🌶️' },
      { id: uuidv4(), description: '加入适量清水烧开，放入豆腐块轻轻推动', emoji: '💧' },
      { id: uuidv4(), description: '小火炖煮入味，勾薄芡收汁', emoji: '🔥' },
      { id: uuidv4(), description: '出锅前撒上花椒粉和葱花', emoji: '✨' },
    ],
  },
];

app.get('/api/recipes', (req, res) => {
  const { search, difficulty, tag } = req.query;
  let result = [...recipes];

  if (search) {
    const s = String(search).toLowerCase();
    result = result.filter(
      (r) =>
        r.name.toLowerCase().includes(s) ||
        r.tags.some((t) => t.toLowerCase().includes(s)) ||
        r.ingredients.some((i) => i.name.toLowerCase().includes(s))
    );
  }
  if (difficulty) {
    result = result.filter((r) => r.difficulty === difficulty);
  }
  if (tag) {
    result = result.filter((r) => r.tags.includes(String(tag)));
  }

  res.json(result);
});

app.get('/api/recipes/:id', (req, res) => {
  const recipe = recipes.find((r) => r.id === req.params.id);
  if (!recipe) return res.status(404).json({ error: '食谱不存在' });
  res.json(recipe);
});

app.post('/api/recipes', (req, res) => {
  const newRecipe: Recipe = {
    id: uuidv4(),
    name: req.body.name || '新食谱',
    coverScheme: req.body.coverScheme ?? 0,
    cookTime: req.body.cookTime ?? 30,
    difficulty: req.body.difficulty || 'easy',
    emoji: req.body.emoji || '🍽️',
    ingredients: req.body.ingredients || [],
    steps: req.body.steps || [],
    notes: req.body.notes || '',
    tags: req.body.tags || [],
    createdAt: new Date().toISOString(),
  };
  recipes.unshift(newRecipe);
  res.status(201).json(newRecipe);
});

app.put('/api/recipes/:id', (req, res) => {
  const idx = recipes.findIndex((r) => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '食谱不存在' });
  recipes[idx] = { ...recipes[idx], ...req.body, id: req.params.id };
  res.json(recipes[idx]);
});

app.delete('/api/recipes/:id', (req, res) => {
  const idx = recipes.findIndex((r) => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '食谱不存在' });
  recipes.splice(idx, 1);
  res.json({ success: true });
});

app.post('/api/shopping-list', (req, res) => {
  const recipeIds: string[] = req.body.recipeIds || [];
  const selectedRecipes = recipes.filter((r) => recipeIds.includes(r.id));

  const combined: Record<string, { name: string; quantities: string[]; inPantry: boolean; recipeSources: string[] }> = {};

  for (const recipe of selectedRecipes) {
    for (const ing of recipe.ingredients) {
      const key = ing.name.toLowerCase().trim();
      if (!combined[key]) {
        combined[key] = {
          name: ing.name,
          quantities: [],
          inPantry: pantryIngredients.some((p) => p.includes(ing.name) || ing.name.includes(p)),
          recipeSources: [],
        };
      }
      if (!combined[key].quantities.includes(ing.quantity)) {
        combined[key].quantities.push(ing.quantity);
      }
      if (!combined[key].recipeSources.includes(recipe.name)) {
        combined[key].recipeSources.push(recipe.name);
      }
    }
  }

  const shoppingList = Object.values(combined);
  const toBuy = shoppingList.filter((i) => !i.inPantry);
  const inPantry = shoppingList.filter((i) => i.inPantry);

  res.json({
    totalItems: shoppingList.length,
    needToBuy: toBuy.length,
    alreadyHave: inPantry.length,
    items: shoppingList.sort((a, b) => (a.inPantry === b.inPantry ? 0 : a.inPantry ? 1 : -1)),
  });
});

app.get('/api/pantry', (_req, res) => {
  res.json(pantryIngredients);
});

app.listen(PORT, () => {
  console.log(`🍳 Recipe Book API 服务器运行在 http://localhost:${PORT}`);
});
