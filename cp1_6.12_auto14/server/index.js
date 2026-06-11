import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

const app = express();
const PORT = 4000;
const SALT_ROUNDS = 10;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

const users = new Map();
const recipes = new Map();
const tokens = new Map();

const defaultAvatar = 'https://api.dicebear.com/7.x/avataaars/svg?seed=default';

const hashPassword = (password) => {
  return bcrypt.hashSync(password, SALT_ROUNDS);
};

const verifyPassword = (password, hash) => {
  return bcrypt.compareSync(password, hash);
};

const generateToken = () => {
  return uuidv4();
};

const sampleUsers = [
  { id: 'user1', username: '美食家小王', email: 'wang@example.com', password: '123456', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wang' },
  { id: 'user2', username: '厨神小李', email: 'li@example.com', password: '123456', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=li' },
  { id: 'user3', username: '甜品师小张', email: 'zhang@example.com', password: '123456', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhang' },
];

sampleUsers.forEach(u => {
  users.set(u.id, { ...u, password: hashPassword(u.password) });
});

const sampleRecipes = [
  {
    id: 'recipe1',
    title: '番茄炒蛋',
    description: '经典家常菜，酸甜可口，简单易做，是每个厨房新手必学的第一道菜。',
    coverImage: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=500&fit=crop',
    authorId: 'user1',
    authorName: '美食家小王',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wang',
    cuisine: '中式',
    difficulty: '简单',
    cookTime: 15,
    servings: 2,
    ingredients: [
      { id: 'ing1', name: '番茄', quantity: 2, unit: '个' },
      { id: 'ing2', name: '鸡蛋', quantity: 3, unit: '个' },
      { id: 'ing3', name: '白糖', quantity: 1, unit: '勺' },
      { id: 'ing4', name: '盐', quantity: 0.5, unit: '茶匙' },
      { id: 'ing5', name: '食用油', quantity: 2, unit: '勺' },
    ],
    steps: [
      { id: 'step1', order: 1, description: '番茄洗净切块，鸡蛋打散加少许盐搅匀。' },
      { id: 'step2', order: 2, description: '热锅倒油，倒入蛋液炒至凝固盛出备用。', tips: '鸡蛋不要炒太老，嫩嫩的更好吃' },
      { id: 'step3', order: 3, description: '锅中再加少许油，放入番茄翻炒出汁。' },
      { id: 'step4', order: 4, description: '加入白糖和少许盐调味，倒入炒好的鸡蛋翻炒均匀即可出锅。' },
    ],
    tags: ['家常菜', '快手菜', '下饭'],
    favorites: 128,
    favoritedBy: ['user2', 'user3'],
    comments: [
      { id: 'c1', recipeId: 'recipe1', userId: 'user2', username: '厨神小李', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=li', content: '经典美味！我加了点葱花更香～', likes: 5, likedBy: [], createdAt: '2024-01-15T10:30:00Z' },
      { id: 'c2', recipeId: 'recipe1', userId: 'user3', username: '甜品师小张', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhang', content: '第一次做就成功了，谢谢分享！', likes: 2, likedBy: [], createdAt: '2024-01-16T14:20:00Z' },
    ],
    isPublic: true,
    createdAt: '2024-01-10T08:00:00Z',
    updatedAt: '2024-01-10T08:00:00Z',
  },
  {
    id: 'recipe2',
    title: '日式照烧鸡腿',
    description: '外焦里嫩的照烧鸡腿，配上香甜的照烧酱汁，秒杀一切日料店！',
    coverImage: 'https://images.unsplash.com/photo-1598514983318-2f64f8f799c6?w=800&h=500&fit=crop',
    authorId: 'user2',
    authorName: '厨神小李',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=li',
    cuisine: '日式',
    difficulty: '中等',
    cookTime: 35,
    servings: 2,
    ingredients: [
      { id: 'ing1', name: '鸡腿', quantity: 2, unit: '个' },
      { id: 'ing2', name: '酱油', quantity: 3, unit: '勺' },
      { id: 'ing3', name: '味醂', quantity: 2, unit: '勺' },
      { id: 'ing4', name: '白糖', quantity: 1, unit: '勺' },
      { id: 'ing5', name: '清酒', quantity: 1, unit: '勺' },
      { id: 'ing6', name: '姜', quantity: 3, unit: '片' },
    ],
    steps: [
      { id: 'step1', order: 1, description: '鸡腿去骨，用叉子在肉面扎几下方便入味，加姜片腌制15分钟。' },
      { id: 'step2', order: 2, description: '调照烧汁：酱油、味醂、白糖、清酒混合均匀。', tips: '没有味醂可用料酒+少许糖代替' },
      { id: 'step3', order: 3, description: '平底锅不放油，鸡皮朝下煎至金黄出油。' },
      { id: 'step4', order: 4, description: '翻面继续煎至两面金黄。' },
      { id: 'step5', order: 5, description: '倒入照烧汁，中小火收汁，期间不断翻动使鸡腿均匀裹上酱汁。' },
      { id: 'step6', order: 6, description: '切片装盘，淋上剩余酱汁，撒上白芝麻即可。' },
    ],
    tags: ['日料', '鸡腿', '下饭菜'],
    favorites: 256,
    favoritedBy: ['user1', 'user3'],
    comments: [],
    isPublic: true,
    createdAt: '2024-01-08T12:00:00Z',
    updatedAt: '2024-01-12T09:30:00Z',
  },
  {
    id: 'recipe3',
    title: '提拉米苏',
    description: '经典意式甜品，绵密顺滑，入口即化，咖啡与奶酪的完美融合。',
    coverImage: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800&h=500&fit=crop',
    authorId: 'user3',
    authorName: '甜品师小张',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhang',
    cuisine: '意式',
    difficulty: '困难',
    cookTime: 60,
    servings: 6,
    ingredients: [
      { id: 'ing1', name: '马斯卡彭奶酪', quantity: 250, unit: '克' },
      { id: 'ing2', name: '手指饼干', quantity: 200, unit: '克' },
      { id: 'ing3', name: '浓缩咖啡', quantity: 200, unit: '毫升' },
      { id: 'ing4', name: '淡奶油', quantity: 150, unit: '毫升' },
      { id: 'ing5', name: '细砂糖', quantity: 50, unit: '克' },
      { id: 'ing6', name: '蛋黄', quantity: 3, unit: '个' },
      { id: 'ing7', name: '可可粉', quantity: 10, unit: '克' },
    ],
    steps: [
      { id: 'step1', order: 1, description: '蛋黄加糖打发至颜色变浅、体积膨胀。' },
      { id: 'step2', order: 2, description: '加入马斯卡彭奶酪搅拌均匀。' },
      { id: 'step3', order: 3, description: '淡奶油打发至六分发，与奶酪糊混合。', tips: '翻拌手法要轻，避免消泡' },
      { id: 'step4', order: 4, description: '手指饼干快速蘸取咖啡，铺一层在容器底部。' },
      { id: 'step5', order: 5, description: '倒入一半奶酪糊，再铺一层蘸了咖啡的手指饼干。' },
      { id: 'step6', order: 6, description: '倒入剩余奶酪糊，抹平表面，冷藏4小时以上。' },
      { id: 'step7', order: 7, description: '食用前筛上可可粉即可。' },
    ],
    tags: ['甜品', '意式', '下午茶'],
    favorites: 342,
    favoritedBy: ['user1', 'user2'],
    comments: [
      { id: 'c1', recipeId: 'recipe3', userId: 'user1', username: '美食家小王', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wang', content: '太好吃了！完全不输甜品店', likes: 8, likedBy: [], createdAt: '2024-01-14T16:00:00Z' },
    ],
    isPublic: true,
    createdAt: '2024-01-05T20:00:00Z',
    updatedAt: '2024-01-05T20:00:00Z',
  },
  {
    id: 'recipe4',
    title: '韩式石锅拌饭',
    description: '热腾腾的石锅饭配上各种蔬菜和辣酱，底部的锅巴香脆可口！',
    coverImage: 'https://images.unsplash.com/photo-1553163147-622ab57be1c7?w=800&h=500&fit=crop',
    authorId: 'user1',
    authorName: '美食家小王',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wang',
    cuisine: '韩式',
    difficulty: '中等',
    cookTime: 45,
    servings: 2,
    ingredients: [
      { id: 'ing1', name: '米饭', quantity: 2, unit: '碗' },
      { id: 'ing2', name: '牛肉片', quantity: 100, unit: '克' },
      { id: 'ing3', name: '菠菜', quantity: 100, unit: '克' },
      { id: 'ing4', name: '胡萝卜', quantity: 1, unit: '个' },
      { id: 'ing5', name: '鸡蛋', quantity: 2, unit: '个' },
      { id: 'ing6', name: '韩式辣酱', quantity: 2, unit: '勺' },
      { id: 'ing7', name: '香油', quantity: 1, unit: '勺' },
    ],
    steps: [
      { id: 'step1', order: 1, description: '各种蔬菜分别焯水或炒熟，牛肉用韩式调料腌制后炒熟。' },
      { id: 'step2', order: 2, description: '石锅刷香油，放入米饭。' },
      { id: 'step3', order: 3, description: '将各种蔬菜和牛肉摆放在米饭上。' },
      { id: 'step4', order: 4, description: '中间打入一个生鸡蛋。', tips: '喜欢全熟的可以煎好再放' },
      { id: 'step5', order: 5, description: '小火加热至听到滋滋声，底部形成锅巴。' },
      { id: 'step6', order: 6, description: '加入韩式辣酱，拌匀即可享用！' },
    ],
    tags: ['韩式', '主食', '石锅'],
    favorites: 189,
    favoritedBy: ['user2'],
    comments: [],
    isPublic: true,
    createdAt: '2024-01-12T11:00:00Z',
    updatedAt: '2024-01-13T10:00:00Z',
  },
  {
    id: 'recipe5',
    title: '泰式冬阴功汤',
    description: '酸辣鲜爽的冬阴功汤，虾的鲜美配合香茅柠檬叶的独特香气，开胃又过瘾！',
    coverImage: 'https://images.unsplash.com/photo-1548943487-a2e4e43b4853?w=800&h=500&fit=crop',
    authorId: 'user2',
    authorName: '厨神小李',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=li',
    cuisine: '泰式',
    difficulty: '中等',
    cookTime: 30,
    servings: 3,
    ingredients: [
      { id: 'ing1', name: '大虾', quantity: 8, unit: '个' },
      { id: 'ing2', name: '香茅', quantity: 2, unit: '根' },
      { id: 'ing3', name: '柠檬叶', quantity: 5, unit: '片' },
      { id: 'ing4', name: '南姜', quantity: 3, unit: '片' },
      { id: 'ing5', name: '椰浆', quantity: 100, unit: '毫升' },
      { id: 'ing6', name: '鱼露', quantity: 2, unit: '勺' },
      { id: 'ing7', name: '青柠', quantity: 1, unit: '个' },
      { id: 'ing8', name: '草菇', quantity: 100, unit: '克' },
    ],
    steps: [
      { id: 'step1', order: 1, description: '大虾去壳去虾线，虾头虾壳留用熬汤。' },
      { id: 'step2', order: 2, description: '锅中放水，加入虾头虾壳、香茅、柠檬叶、南姜煮15分钟。', tips: '熬虾头汤是鲜味的关键' },
      { id: 'step3', order: 3, description: '过滤掉渣滓，留清汤。' },
      { id: 'step4', order: 4, description: '汤中加入草菇和冬阴功酱煮5分钟。' },
      { id: 'step5', order: 5, description: '加入虾仁煮至变红。' },
      { id: 'step6', order: 6, description: '加鱼露调味，倒入椰浆，关火挤入青柠汁。' },
      { id: 'step7', order: 7, description: '撒上香菜即可出锅。' },
    ],
    tags: ['泰式', '汤品', '海鲜'],
    favorites: 215,
    favoritedBy: ['user3'],
    comments: [],
    isPublic: true,
    createdAt: '2024-01-09T15:00:00Z',
    updatedAt: '2024-01-09T15:00:00Z',
  },
  {
    id: 'recipe6',
    title: '法式奶油蘑菇汤',
    description: '丝滑浓郁的法式经典浓汤，蘑菇的鲜香与奶油的醇厚完美结合。',
    coverImage: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&h=500&fit=crop',
    authorId: 'user3',
    authorName: '甜品师小张',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhang',
    cuisine: '西式',
    difficulty: '中等',
    cookTime: 40,
    servings: 4,
    ingredients: [
      { id: 'ing1', name: '口蘑', quantity: 300, unit: '克' },
      { id: 'ing2', name: '洋葱', quantity: 1, unit: '个' },
      { id: 'ing3', name: '黄油', quantity: 30, unit: '克' },
      { id: 'ing4', name: '淡奶油', quantity: 150, unit: '毫升' },
      { id: 'ing5', name: '面粉', quantity: 2, unit: '勺' },
      { id: 'ing6', name: '鸡高汤', quantity: 500, unit: '毫升' },
      { id: 'ing7', name: '百里香', quantity: 1, unit: '茶匙' },
    ],
    steps: [
      { id: 'step1', order: 1, description: '口蘑切片，洋葱切丁。' },
      { id: 'step2', order: 2, description: '锅中放黄油，炒香洋葱丁。' },
      { id: 'step3', order: 3, description: '加入蘑菇炒至出水变软。', tips: '蘑菇要炒透才香' },
      { id: 'step4', order: 4, description: '撒入面粉翻炒均匀。' },
      { id: 'step5', order: 5, description: '慢慢加入鸡高汤，边加边搅拌避免结块。' },
      { id: 'step6', order: 6, description: '加入百里香，小火煮15分钟。' },
      { id: 'step7', order: 7, description: '用料理棒打至顺滑，倒回锅中加淡奶油煮沸调味。' },
    ],
    tags: ['西式', '汤品', '法式'],
    favorites: 167,
    favoritedBy: ['user1', 'user2'],
    comments: [],
    isPublic: true,
    createdAt: '2024-01-07T18:00:00Z',
    updatedAt: '2024-01-07T18:00:00Z',
  },
];

sampleRecipes.forEach(r => {
  recipes.set(r.id, r);
});

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: '未登录' });
  }
  
  const userId = tokens.get(token);
  if (!userId) {
    return res.status(403).json({ error: '无效的token' });
  }
  
  const user = users.get(userId);
  if (!user) {
    return res.status(403).json({ error: '用户不存在' });
  }
  
  req.user = { id: user.id, username: user.username, email: user.email, avatar: user.avatar };
  req.token = token;
  next();
};

app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;
  
  if (!username || !email || !password) {
    return res.status(400).json({ error: '请填写完整信息' });
  }
  
  const emailExists = Array.from(users.values()).some(u => u.email === email);
  if (emailExists) {
    return res.status(400).json({ error: '该邮箱已被注册' });
  }
  
  const id = uuidv4();
  const token = generateToken();
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const user = {
    id,
    username,
    email,
    password: hashedPassword,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
  };
  
  users.set(id, user);
  tokens.set(token, id);
  
  res.json({
    user: { id, username, email, avatar: user.avatar },
    token,
  });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: '请填写邮箱和密码' });
  }
  
  const user = Array.from(users.values()).find(u => u.email === email);
  if (!user) {
    return res.status(401).json({ error: '邮箱或密码错误' });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(401).json({ error: '邮箱或密码错误' });
  }
  
  const token = generateToken();
  tokens.set(token, user.id);
  
  res.json({
    user: { id: user.id, username: user.username, email: user.email, avatar: user.avatar },
    token,
  });
});

app.post('/api/auth/logout', authenticateToken, (req, res) => {
  tokens.delete(req.token);
  res.json({ success: true });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

app.get('/api/recipes', (req, res) => {
  const { cuisine, sort, search } = req.query;
  
  let recipeList = Array.from(recipes.values()).filter(r => r.isPublic);
  
  if (cuisine && cuisine !== '全部') {
    recipeList = recipeList.filter(r => r.cuisine === cuisine);
  }
  
  if (search) {
    const searchLower = search.toLowerCase();
    recipeList = recipeList.filter(r => 
      r.title.toLowerCase().includes(searchLower) ||
      r.description.toLowerCase().includes(searchLower) ||
      r.tags.some(t => t.toLowerCase().includes(searchLower))
    );
  }
  
  if (sort === 'newest') {
    recipeList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } else if (sort === 'oldest') {
    recipeList.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  } else if (sort === 'favorites') {
    recipeList.sort((a, b) => b.favorites - a.favorites);
  }
  
  res.json({ recipes: recipeList });
});

app.get('/api/recipes/:id', (req, res) => {
  const recipe = recipes.get(req.params.id);
  if (!recipe) {
    return res.status(404).json({ error: '食谱不存在' });
  }
  res.json({ recipe });
});

app.post('/api/recipes', authenticateToken, (req, res) => {
  const { title, description, coverImage, cuisine, difficulty, cookTime, servings, ingredients, steps, tags, isPublic } = req.body;
  
  const id = uuidv4();
  const now = new Date().toISOString();
  const recipe = {
    id,
    title,
    description,
    coverImage: coverImage || 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=800&h=500&fit=crop',
    authorId: req.user.id,
    authorName: req.user.username,
    authorAvatar: req.user.avatar,
    cuisine,
    difficulty,
    cookTime: Number(cookTime),
    servings: Number(servings),
    ingredients: ingredients.map(ing => ({ ...ing, id: uuidv4() })),
    steps: steps.map((step, idx) => ({ ...step, id: uuidv4(), order: idx + 1 })),
    tags: tags || [],
    favorites: 0,
    favoritedBy: [],
    comments: [],
    isPublic: isPublic !== undefined ? isPublic : true,
    createdAt: now,
    updatedAt: now,
  };
  
  recipes.set(id, recipe);
  res.status(201).json({ recipe });
});

app.put('/api/recipes/:id', authenticateToken, (req, res) => {
  const recipe = recipes.get(req.params.id);
  if (!recipe) {
    return res.status(404).json({ error: '食谱不存在' });
  }
  
  if (recipe.authorId !== req.user.id) {
    return res.status(403).json({ error: '无权限编辑此食谱' });
  }
  
  const updatedRecipe = {
    ...recipe,
    ...req.body,
    updatedAt: new Date().toISOString(),
  };
  
  if (req.body.ingredients) {
    updatedRecipe.ingredients = req.body.ingredients.map(ing => 
      ing.id ? ing : { ...ing, id: uuidv4() }
    );
  }
  
  if (req.body.steps) {
    updatedRecipe.steps = req.body.steps.map((step, idx) => ({
      ...step,
      id: step.id || uuidv4(),
      order: idx + 1,
    }));
  }
  
  recipes.set(req.params.id, updatedRecipe);
  res.json({ recipe: updatedRecipe });
});

app.delete('/api/recipes/:id', authenticateToken, (req, res) => {
  const recipe = recipes.get(req.params.id);
  if (!recipe) {
    return res.status(404).json({ error: '食谱不存在' });
  }
  
  if (recipe.authorId !== req.user.id) {
    return res.status(403).json({ error: '无权限删除此食谱' });
  }
  
  recipes.delete(req.params.id);
  res.json({ success: true });
});

app.post('/api/recipes/:id/favorite', authenticateToken, (req, res) => {
  const recipe = recipes.get(req.params.id);
  if (!recipe) {
    return res.status(404).json({ error: '食谱不存在' });
  }
  
  const userId = req.user.id;
  const index = recipe.favoritedBy.indexOf(userId);
  
  if (index > -1) {
    recipe.favoritedBy.splice(index, 1);
    recipe.favorites--;
  } else {
    recipe.favoritedBy.push(userId);
    recipe.favorites++;
  }
  
  recipe.updatedAt = new Date().toISOString();
  recipes.set(req.params.id, recipe);
  res.json({ recipe });
});

app.get('/api/recipes/:id/comments', (req, res) => {
  const recipe = recipes.get(req.params.id);
  if (!recipe) {
    return res.status(404).json({ error: '食谱不存在' });
  }
  res.json({ comments: recipe.comments });
});

app.post('/api/recipes/:id/comments', authenticateToken, (req, res) => {
  const recipe = recipes.get(req.params.id);
  if (!recipe) {
    return res.status(404).json({ error: '食谱不存在' });
  }
  
  const { content, parentId, replyTo } = req.body;
  
  if (!content || !content.trim()) {
    return res.status(400).json({ error: '评论内容不能为空' });
  }
  
  const comment = {
    id: uuidv4(),
    recipeId: req.params.id,
    userId: req.user.id,
    username: req.user.username,
    avatar: req.user.avatar,
    content: content.trim(),
    parentId: parentId || null,
    replyTo: replyTo || null,
    likes: 0,
    likedBy: [],
    createdAt: new Date().toISOString(),
  };
  
  recipe.comments.push(comment);
  recipe.updatedAt = new Date().toISOString();
  recipes.set(req.params.id, recipe);
  
  res.status(201).json({ comment });
});

app.post('/api/recipes/:id/comments/:commentId/like', authenticateToken, (req, res) => {
  const recipe = recipes.get(req.params.id);
  if (!recipe) {
    return res.status(404).json({ error: '食谱不存在' });
  }
  
  const comment = recipe.comments.find(c => c.id === req.params.commentId);
  if (!comment) {
    return res.status(404).json({ error: '评论不存在' });
  }
  
  const userId = req.user.id;
  const index = comment.likedBy.indexOf(userId);
  
  if (index > -1) {
    comment.likedBy.splice(index, 1);
    comment.likes--;
  } else {
    comment.likedBy.push(userId);
    comment.likes++;
  }
  
  recipe.updatedAt = new Date().toISOString();
  recipes.set(req.params.id, recipe);
  res.json({ comment });
});

app.get('/api/users/:userId/favorites', (req, res) => {
  const userId = req.params.userId;
  const favoriteRecipes = Array.from(recipes.values()).filter(r => 
    r.isPublic && r.favoritedBy.includes(userId)
  );
  res.json({ recipes: favoriteRecipes });
});

app.get('/api/users/:userId/recipes', (req, res) => {
  const userId = req.params.userId;
  const userRecipes = Array.from(recipes.values()).filter(r => r.authorId === userId);
  res.json({ recipes: userRecipes });
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
