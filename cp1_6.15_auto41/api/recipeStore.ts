import { v4 as uuidv4 } from 'uuid';
import type { Recipe, User, Ingredient, Step, Rating, Difficulty, Collaborator } from '../../src/types.js';

const recipes = new Map<string, Recipe>();
const users = new Map<string, User>();

const user1Id = uuidv4();
const user2Id = uuidv4();
const user3Id = uuidv4();

users.set(user1Id, {
  id: user1Id,
  username: 'chef_zhang',
  password: 'hashed_password_1',
  avatar: '',
  createdRecipes: [],
  favoritedRecipes: [],
});

users.set(user2Id, {
  id: user2Id,
  username: 'cook_li',
  password: 'hashed_password_2',
  avatar: '',
  createdRecipes: [],
  favoritedRecipes: [],
});

users.set(user3Id, {
  id: user3Id,
  username: 'foodie_wang',
  password: 'hashed_password_3',
  avatar: '',
  createdRecipes: [],
  favoritedRecipes: [],
});

const recipe1Id = uuidv4();
const recipe2Id = uuidv4();
const recipe3Id = uuidv4();

const recipe1: Recipe = {
  id: recipe1Id,
  title: '番茄炒蛋',
  coverImage: '',
  authorId: user1Id,
  authorName: 'chef_zhang',
  difficulty: 'easy' as Difficulty,
  estimatedTime: 15,
  tags: ['家常菜', '快手菜', '蛋类'],
  ingredients: [
    { id: uuidv4(), name: '番茄', amount: 2, unit: '个', calories: 44, protein: 2.2, carbs: 9.6, fat: 0.4 },
    { id: uuidv4(), name: '鸡蛋', amount: 3, unit: '个', calories: 210, protein: 18, carbs: 1.2, fat: 15 },
    { id: uuidv4(), name: '食用油', amount: 2, unit: '汤匙', calories: 240, protein: 0, carbs: 0, fat: 28 },
    { id: uuidv4(), name: '盐', amount: 1, unit: '茶匙', calories: 0, protein: 0, carbs: 0, fat: 0 },
    { id: uuidv4(), name: '白糖', amount: 1, unit: '茶匙', calories: 16, protein: 0, carbs: 4, fat: 0 },
    { id: uuidv4(), name: '葱花', amount: 1, unit: '汤匙', calories: 3, protein: 0.2, carbs: 0.6, fat: 0 },
  ],
  steps: [
    { id: uuidv4(), order: 1, image: '', description: '番茄洗净，在顶部划十字刀，用开水烫30秒后去皮，切成小块备用。' },
    { id: uuidv4(), order: 2, image: '', description: '鸡蛋打入碗中，加少许盐搅打均匀至起泡。', timerPreset: 60 },
    { id: uuidv4(), order: 3, image: '', description: '锅中倒入一汤匙油，中火烧至七成热，倒入蛋液，用筷子快速划散，炒至金黄后盛出备用。', timerPreset: 120 },
    { id: uuidv4(), order: 4, image: '', description: '锅中再加一汤匙油，放入番茄块，中小火翻炒至出汁变软。', timerPreset: 300 },
    { id: uuidv4(), order: 5, image: '', description: '加入白糖和盐调味，将炒好的鸡蛋倒回锅中，翻炒均匀，撒葱花出锅。', timerPreset: 60 },
  ],
  ratings: [
    { userId: user2Id, score: 5 },
    { userId: user3Id, score: 4 },
  ],
  likes: [user2Id, user3Id],
  favorites: [user2Id],
  createdAt: new Date('2025-01-10T08:00:00Z').toISOString(),
  updatedAt: new Date('2025-01-10T08:00:00Z').toISOString(),
};

const recipe2: Recipe = {
  id: recipe2Id,
  title: '红烧肉',
  coverImage: '',
  authorId: user2Id,
  authorName: 'cook_li',
  difficulty: 'medium' as Difficulty,
  estimatedTime: 90,
  tags: ['家常菜', '肉类', '硬菜'],
  ingredients: [
    { id: uuidv4(), name: '五花肉', amount: 500, unit: '克', calories: 1650, protein: 65, carbs: 0, fat: 155 },
    { id: uuidv4(), name: '生姜', amount: 3, unit: '片', calories: 6, protein: 0.2, carbs: 1.2, fat: 0 },
    { id: uuidv4(), name: '大葱', amount: 1, unit: '根', calories: 25, protein: 0.7, carbs: 5.6, fat: 0.1 },
    { id: uuidv4(), name: '八角', amount: 2, unit: '个', calories: 6, protein: 0.3, carbs: 1, fat: 0.3 },
    { id: uuidv4(), name: '冰糖', amount: 30, unit: '克', calories: 116, protein: 0, carbs: 29, fat: 0 },
    { id: uuidv4(), name: '生抽', amount: 2, unit: '汤匙', calories: 20, protein: 1.6, carbs: 3.2, fat: 0 },
    { id: uuidv4(), name: '老抽', amount: 1, unit: '汤匙', calories: 10, protein: 0.8, carbs: 1.6, fat: 0 },
    { id: uuidv4(), name: '料酒', amount: 2, unit: '汤匙', calories: 24, protein: 0, carbs: 1.2, fat: 0 },
  ],
  steps: [
    { id: uuidv4(), order: 1, image: '', description: '五花肉切成3厘米见方的块，冷水下锅焯水，加料酒去腥，煮出浮沫后捞出洗净沥干。', timerPreset: 300 },
    { id: uuidv4(), order: 2, image: '', description: '锅中不放油，小火放入冰糖，慢慢熬至糖融化变成琥珀色，起密集小泡。', timerPreset: 300 },
    { id: uuidv4(), order: 3, image: '', description: '迅速放入焯好的五花肉，翻炒均匀使每块肉都裹上糖色。', timerPreset: 120 },
    { id: uuidv4(), order: 4, image: '', description: '加入姜片、葱段、八角，倒入生抽和老抽翻炒上色，加入没过肉的热水。', timerPreset: 60 },
    { id: uuidv4(), order: 5, image: '', description: '大火烧开后转小火，加盖慢炖60分钟，中途翻动一两次。', timerPreset: 3600 },
    { id: uuidv4(), order: 6, image: '', description: '开盖转大火收汁，待汤汁浓稠包裹住肉块即可出锅装盘。', timerPreset: 600 },
  ],
  ratings: [
    { userId: user1Id, score: 5 },
    { userId: user3Id, score: 5 },
  ],
  likes: [user1Id, user3Id],
  favorites: [user1Id, user3Id],
  createdAt: new Date('2025-02-14T10:30:00Z').toISOString(),
  updatedAt: new Date('2025-02-14T10:30:00Z').toISOString(),
};

const recipe3: Recipe = {
  id: recipe3Id,
  title: '宫保鸡丁',
  coverImage: '',
  authorId: user3Id,
  authorName: 'foodie_wang',
  difficulty: 'medium' as Difficulty,
  estimatedTime: 30,
  tags: ['川菜', '鸡肉', '辣菜'],
  ingredients: [
    { id: uuidv4(), name: '鸡胸肉', amount: 300, unit: '克', calories: 330, protein: 63, carbs: 0, fat: 7.2 },
    { id: uuidv4(), name: '花生米', amount: 50, unit: '克', calories: 284, protein: 13, carbs: 10, fat: 24 },
    { id: uuidv4(), name: '干辣椒', amount: 8, unit: '个', calories: 24, protein: 0.8, carbs: 4.8, fat: 0.4 },
    { id: uuidv4(), name: '花椒', amount: 1, unit: '茶匙', calories: 6, protein: 0.2, carbs: 1.2, fat: 0.3 },
    { id: uuidv4(), name: '大葱', amount: 1, unit: '根', calories: 25, protein: 0.7, carbs: 5.6, fat: 0.1 },
    { id: uuidv4(), name: '生姜', amount: 2, unit: '片', calories: 4, protein: 0.1, carbs: 0.8, fat: 0 },
    { id: uuidv4(), name: '大蒜', amount: 3, unit: '瓣', calories: 13, protein: 0.6, carbs: 3, fat: 0.1 },
    { id: uuidv4(), name: '生抽', amount: 1, unit: '汤匙', calories: 10, protein: 0.8, carbs: 1.6, fat: 0 },
    { id: uuidv4(), name: '醋', amount: 1, unit: '汤匙', calories: 3, protein: 0, carbs: 0.6, fat: 0 },
    { id: uuidv4(), name: '白糖', amount: 1, unit: '汤匙', calories: 48, protein: 0, carbs: 12, fat: 0 },
    { id: uuidv4(), name: '淀粉', amount: 1, unit: '汤匙', calories: 34, protein: 0.1, carbs: 8.4, fat: 0 },
  ],
  steps: [
    { id: uuidv4(), order: 1, image: '', description: '鸡胸肉切成1.5厘米见方的丁，加入生抽、料酒和淀粉抓匀腌制15分钟。', timerPreset: 900 },
    { id: uuidv4(), order: 2, image: '', description: '调制宫保汁：碗中混合生抽、醋、白糖、淀粉和少许水搅匀备用。' },
    { id: uuidv4(), order: 3, image: '', description: '花生米小火慢炒至金黄酥脆，盛出放凉备用。', timerPreset: 300 },
    { id: uuidv4(), order: 4, image: '', description: '锅中热油，放入干辣椒段和花椒，小火炒出香味至辣椒变色。', timerPreset: 60 },
    { id: uuidv4(), order: 5, image: '', description: '倒入腌好的鸡丁，大火快速翻炒至变白断生。', timerPreset: 180 },
    { id: uuidv4(), order: 6, image: '', description: '加入葱段、姜蒜翻炒出香味，倒入调好的宫保汁翻炒均匀。', timerPreset: 60 },
    { id: uuidv4(), order: 7, image: '', description: '最后放入炒好的花生米，快速翻炒几下即可出锅装盘。', timerPreset: 30 },
  ],
  ratings: [
    { userId: user1Id, score: 4 },
    { userId: user2Id, score: 4 },
  ],
  likes: [user1Id],
  favorites: [user2Id],
  createdAt: new Date('2025-03-20T12:00:00Z').toISOString(),
  updatedAt: new Date('2025-03-20T12:00:00Z').toISOString(),
};

recipes.set(recipe1Id, recipe1);
recipes.set(recipe2Id, recipe2);
recipes.set(recipe3Id, recipe3);

users.get(user1Id)!.createdRecipes.push(recipe1Id);
users.get(user2Id)!.createdRecipes.push(recipe2Id);
users.get(user3Id)!.createdRecipes.push(recipe3Id);
users.get(user2Id)!.favoritedRecipes.push(recipe1Id);
users.get(user1Id)!.favoritedRecipes.push(recipe2Id);
users.get(user3Id)!.favoritedRecipes.push(recipe2Id);
users.get(user2Id)!.favoritedRecipes.push(recipe3Id);

export const recipeStore = {
  getAllRecipes(): Recipe[] {
    return Array.from(recipes.values()).map((r) => ({
      ...r,
      ratings: [],
      likes: [],
      favorites: [],
    }));
  },

  getRecipeById(id: string): Recipe | undefined {
    return recipes.get(id);
  },

  searchRecipes(query: string, tag?: string): Recipe[] {
    const q = query.toLowerCase();
    return Array.from(recipes.values()).filter((r) => {
      const matchesQuery =
        r.title.toLowerCase().includes(q) ||
        r.ingredients.some((ing) => ing.name.toLowerCase().includes(q));
      const matchesTag = tag ? r.tags.includes(tag) : true;
      return matchesQuery && matchesTag;
    });
  },

  createRecipe(data: Partial<Recipe>): Recipe {
    const now = new Date().toISOString();
    const recipe: Recipe = {
      id: uuidv4(),
      title: data.title ?? '',
      coverImage: data.coverImage ?? '',
      authorId: data.authorId ?? '',
      authorName: data.authorName ?? '',
      difficulty: data.difficulty ?? 'easy',
      estimatedTime: data.estimatedTime ?? 0,
      tags: data.tags ?? [],
      ingredients: data.ingredients ?? [],
      steps: data.steps ?? [],
      ratings: data.ratings ?? [],
      likes: data.likes ?? [],
      favorites: data.favorites ?? [],
      createdAt: now,
      updatedAt: now,
    };
    recipes.set(recipe.id, recipe);
    const user = users.get(recipe.authorId);
    if (user) {
      user.createdRecipes.push(recipe.id);
    }
    return recipe;
  },

  updateRecipe(id: string, data: Partial<Recipe>): Recipe | undefined {
    const existing = recipes.get(id);
    if (!existing) return undefined;
    const updated: Recipe = {
      ...existing,
      ...data,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    recipes.set(id, updated);
    return updated;
  },

  deleteRecipe(id: string): boolean {
    return recipes.delete(id);
  },

  rateRecipe(recipeId: string, userId: string, score: number): { avgScore: number; totalRaters: number } | undefined {
    const recipe = recipes.get(recipeId);
    if (!recipe) return undefined;
    const existing = recipe.ratings.find((r) => r.userId === userId);
    if (existing) {
      existing.score = score;
    } else {
      recipe.ratings.push({ userId, score });
    }
    const totalScore = recipe.ratings.reduce((sum, r) => sum + r.score, 0);
    const totalRaters = recipe.ratings.length;
    return { avgScore: Math.round((totalScore / totalRaters) * 10) / 10, totalRaters };
  },

  likeRecipe(recipeId: string, userId: string): string[] | undefined {
    const recipe = recipes.get(recipeId);
    if (!recipe) return undefined;
    if (!recipe.likes.includes(userId)) {
      recipe.likes.push(userId);
    }
    return recipe.likes;
  },

  favoriteRecipe(recipeId: string, userId: string): boolean {
    const recipe = recipes.get(recipeId);
    if (!recipe) return false;
    if (recipe.favorites.includes(userId)) return false;
    recipe.favorites.push(userId);
    const user = users.get(userId);
    if (user && !user.favoritedRecipes.includes(recipeId)) {
      user.favoritedRecipes.push(recipeId);
    }
    return true;
  },

  unfavoriteRecipe(recipeId: string, userId: string): boolean {
    const recipe = recipes.get(recipeId);
    if (!recipe) return false;
    const idx = recipe.favorites.indexOf(userId);
    if (idx === -1) return false;
    recipe.favorites.splice(idx, 1);
    const user = users.get(userId);
    if (user) {
      const rIdx = user.favoritedRecipes.indexOf(recipeId);
      if (rIdx !== -1) user.favoritedRecipes.splice(rIdx, 1);
    }
    return true;
  },
};

export const userStore = {
  getAllUsers(): User[] {
    return Array.from(users.values());
  },

  getUserById(id: string): User | undefined {
    return users.get(id);
  },

  getUserByUsername(username: string): User | undefined {
    return Array.from(users.values()).find((u) => u.username === username);
  },

  createUser(username: string, password: string): User {
    const user: User = {
      id: uuidv4(),
      username,
      password,
      avatar: '',
      createdRecipes: [],
      favoritedRecipes: [],
    };
    users.set(user.id, user);
    return user;
  },
};

export const collaborators = new Map<string, Set<Collaborator>>();
