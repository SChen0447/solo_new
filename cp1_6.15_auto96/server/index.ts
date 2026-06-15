import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

interface User {
  id: string;
  name: string;
  color: string;
  cursorPosition?: number;
  isEditing: boolean;
  lastActive: number;
}

interface Timer {
  id: string;
  stepId: string;
  duration: number;
  remaining: number;
  isRunning: boolean;
  startTime?: number;
}

interface Ingredient {
  id: string;
  name: string;
  quantity: string;
  unit: string;
}

interface RecipeStep {
  id: string;
  content: string;
  timer?: Timer;
}

interface HistoryEntry {
  id: string;
  content: string;
  timestamp: number;
  userId: string;
  userName: string;
}

interface Recipe {
  id: string;
  title: string;
  content: string;
  steps: RecipeStep[];
  ingredients: Ingredient[];
  history: HistoryEntry[];
  users: Map<string, User>;
  timers: Map<string, Timer>;
}

const recipes = new Map<string, Recipe>();

const COLOR_PALETTE = [
  '#e91e63', '#9c27b0', '#673ab7', '#3f51b5',
  '#2196f3', '#00bcd4', '#009688', '#4caf50',
  '#8bc34a', '#ffc107', '#ff9800', '#ff5722',
];

function getRandomColor(): string {
  return COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
}

function generateUserName(): string {
  const adjectives = ['快乐的', '热情的', '创意的', '勇敢的', '温柔的', '聪明的'];
  const nouns = ['厨师', '美食家', '烘焙师', '料理达人', '小厨神', '品味家'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj}${noun}${num}`;
}

function createRecipe(id: string): Recipe {
  const steps: RecipeStep[] = [
    { id: uuidv4(), content: '准备所有食材，洗净切好备用。', timer: undefined },
    { id: uuidv4(), content: '热锅倒油，中火加热。', timer: { id: uuidv4(), stepId: '', duration: 60, remaining: 60, isRunning: false } },
    { id: uuidv4(), content: '放入主料翻炒至金黄。', timer: { id: uuidv4(), stepId: '', duration: 180, remaining: 180, isRunning: false } },
    { id: uuidv4(), content: '加入调料，小火慢炖。', timer: { id: uuidv4(), stepId: '', duration: 600, remaining: 600, isRunning: false } },
  ];

  steps.forEach(step => {
    if (step.timer) {
      step.timer.stepId = step.id;
    }
  });

  const timers = new Map<string, Timer>();
  steps.forEach(step => {
    if (step.timer) {
      timers.set(step.timer.id, step.timer);
    }
  });

  return {
    id,
    title: '美味家常菜',
    content: '这是一道非常美味的家常菜，简单易做，适合新手尝试。\n\n步骤：\n1. 准备食材\n2. 热锅\n3. 翻炒\n4. 调味出锅',
    steps,
    ingredients: [
      { id: uuidv4(), name: '主料', quantity: '500', unit: '克' },
      { id: uuidv4(), name: '食用油', quantity: '2', unit: '勺' },
      { id: uuidv4(), name: '盐', quantity: '1', unit: '茶匙' },
      { id: uuidv4(), name: '酱油', quantity: '1', unit: '勺' },
    ],
    history: [],
    users: new Map(),
    timers,
  };
}

app.get('/api/recipes/:id', (req, res) => {
  const { id } = req.params;
  let recipe = recipes.get(id);

  if (!recipe) {
    recipe = createRecipe(id);
    recipes.set(id, recipe);
  }

  res.json({
    id: recipe.id,
    title: recipe.title,
    content: recipe.content,
    steps: recipe.steps,
    ingredients: recipe.ingredients,
    history: recipe.history.slice(-30),
    userCount: recipe.users.size,
  });
});

let timerInterval: NodeJS.Timeout | null = null;

function startTimerLoop() {
  if (timerInterval) return;

  timerInterval = setInterval(() => {
    const now = Date.now();
    recipes.forEach(recipe => {
      let hasUpdates = false;
      recipe.timers.forEach(timer => {
        if (timer.isRunning && timer.startTime) {
          const elapsed = Math.floor((now - timer.startTime) / 1000);
          const newRemaining = Math.max(0, timer.duration - elapsed);

          if (newRemaining !== timer.remaining) {
            timer.remaining = newRemaining;
            hasUpdates = true;

            if (newRemaining <= 0) {
              timer.isRunning = false;
              timer.startTime = undefined;
              io.to(recipe.id).emit('timer:finished', { timerId: timer.id, stepId: timer.stepId });
            }
          }
        }
      });

      if (hasUpdates) {
        const timersData = Array.from(recipe.timers.values());
        io.to(recipe.id).emit('timers:update', timersData);
      }
    });
  }, 100);
}

startTimerLoop();

io.on('connection', (socket) => {
  let currentRecipeId: string | null = null;
  let userId: string | null = null;

  socket.on('join', ({ recipeId, name }: { recipeId: string; name?: string }) => {
    currentRecipeId = recipeId;
    userId = socket.id;

    let recipe = recipes.get(recipeId);
    if (!recipe) {
      recipe = createRecipe(recipeId);
      recipes.set(recipeId, recipe);
    }

    const userName = name || generateUserName();
    const user: User = {
      id: userId,
      name: userName,
      color: getRandomColor(),
      isEditing: false,
      lastActive: Date.now(),
    };

    recipe.users.set(userId, user);
    socket.join(recipeId);

    socket.emit('user:joined', { userId, user });

    const usersList = Array.from(recipe.users.values());
    io.to(recipeId).emit('users:update', usersList);

    socket.emit('recipe:data', {
      id: recipe.id,
      title: recipe.title,
      content: recipe.content,
      steps: recipe.steps,
      ingredients: recipe.ingredients,
      history: recipe.history.slice(-30),
      timers: Array.from(recipe.timers.values()),
    });
  });

  socket.on('recipe:update', ({ content }: { content: string }) => {
    if (!currentRecipeId || !userId) return;

    const recipe = recipes.get(currentRecipeId);
    if (!recipe) return;

    const user = recipe.users.get(userId);
    if (!user) return;

    recipe.content = content;
    user.lastActive = Date.now();

    const historyEntry: HistoryEntry = {
      id: uuidv4(),
      content,
      timestamp: Date.now(),
      userId,
      userName: user.name,
    };
    recipe.history.push(historyEntry);
    if (recipe.history.length > 30) {
      recipe.history = recipe.history.slice(-30);
    }

    socket.to(currentRecipeId).emit('recipe:updated', {
      content,
      userId,
      userName: user.name,
    });
  });

  socket.on('cursor:move', ({ position }: { position: number }) => {
    if (!currentRecipeId || !userId) return;

    const recipe = recipes.get(currentRecipeId);
    if (!recipe) return;

    const user = recipe.users.get(userId);
    if (!user) return;

    user.cursorPosition = position;
    user.lastActive = Date.now();

    socket.to(currentRecipeId).emit('cursor:updated', {
      userId,
      position,
    });
  });

  socket.on('user:editing', ({ isEditing }: { isEditing: boolean }) => {
    if (!currentRecipeId || !userId) return;

    const recipe = recipes.get(currentRecipeId);
    if (!recipe) return;

    const user = recipe.users.get(userId);
    if (!user) return;

    user.isEditing = isEditing;
    user.lastActive = Date.now();

    io.to(currentRecipeId).emit('user:editing', {
      userId,
      isEditing,
    });
  });

  socket.on('timer:start', ({ timerId }: { timerId: string }) => {
    if (!currentRecipeId) return;

    const recipe = recipes.get(currentRecipeId);
    if (!recipe) return;

    const timer = recipe.timers.get(timerId);
    if (!timer) return;

    if (!timer.isRunning) {
      timer.isRunning = true;
      timer.startTime = Date.now() - (timer.duration - timer.remaining) * 1000;
    }

    io.to(currentRecipeId).emit('timer:started', {
      timerId,
      remaining: timer.remaining,
    });
  });

  socket.on('timer:pause', ({ timerId }: { timerId: string }) => {
    if (!currentRecipeId) return;

    const recipe = recipes.get(currentRecipeId);
    if (!recipe) return;

    const timer = recipe.timers.get(timerId);
    if (!timer) return;

    if (timer.isRunning) {
      timer.isRunning = false;
      timer.startTime = undefined;
    }

    io.to(currentRecipeId).emit('timer:paused', {
      timerId,
      remaining: timer.remaining,
    });
  });

  socket.on('timer:reset', ({ timerId }: { timerId: string }) => {
    if (!currentRecipeId) return;

    const recipe = recipes.get(currentRecipeId);
    if (!recipe) return;

    const timer = recipe.timers.get(timerId);
    if (!timer) return;

    timer.isRunning = false;
    timer.remaining = timer.duration;
    timer.startTime = undefined;

    io.to(currentRecipeId).emit('timer:reset', {
      timerId,
      duration: timer.duration,
    });
  });

  socket.on('timer:set', ({ timerId, duration }: { timerId: string; duration: number }) => {
    if (!currentRecipeId) return;

    const recipe = recipes.get(currentRecipeId);
    if (!recipe) return;

    const timer = recipe.timers.get(timerId);
    if (!timer) return;

    timer.duration = duration;
    if (!timer.isRunning) {
      timer.remaining = duration;
    }

    io.to(currentRecipeId).emit('timer:set', {
      timerId,
      duration,
      remaining: timer.remaining,
    });
  });

  socket.on('ingredient:add', ({ ingredient }: { ingredient: Omit<Ingredient, 'id'> }) => {
    if (!currentRecipeId) return;

    const recipe = recipes.get(currentRecipeId);
    if (!recipe) return;

    const newIngredient: Ingredient = {
      id: uuidv4(),
      ...ingredient,
    };

    recipe.ingredients.unshift(newIngredient);

    io.to(currentRecipeId).emit('ingredient:added', {
      ingredient: newIngredient,
    });
  });

  socket.on('ingredient:remove', ({ ingredientId }: { ingredientId: string }) => {
    if (!currentRecipeId) return;

    const recipe = recipes.get(currentRecipeId);
    if (!recipe) return;

    recipe.ingredients = recipe.ingredients.filter(i => i.id !== ingredientId);

    io.to(currentRecipeId).emit('ingredient:removed', {
      ingredientId,
    });
  });

  socket.on('ingredient:update', ({ ingredientId, updates }: { ingredientId: string; updates: Partial<Ingredient> }) => {
    if (!currentRecipeId) return;

    const recipe = recipes.get(currentRecipeId);
    if (!recipe) return;

    const ingredient = recipe.ingredients.find(i => i.id === ingredientId);
    if (!ingredient) return;

    Object.assign(ingredient, updates);

    io.to(currentRecipeId).emit('ingredient:updated', {
      ingredient,
    });
  });

  socket.on('step:add', () => {
    if (!currentRecipeId) return;

    const recipe = recipes.get(currentRecipeId);
    if (!recipe) return;

    const stepId = uuidv4();
    const timerId = uuidv4();
    const timer: Timer = {
      id: timerId,
      stepId,
      duration: 60,
      remaining: 60,
      isRunning: false,
    };

    const newStep: RecipeStep = {
      id: stepId,
      content: '新步骤',
      timer,
    };

    recipe.steps.push(newStep);
    recipe.timers.set(timerId, timer);

    io.to(currentRecipeId).emit('step:added', {
      step: newStep,
    });
  });

  socket.on('step:update', ({ stepId, content }: { stepId: string; content: string }) => {
    if (!currentRecipeId) return;

    const recipe = recipes.get(currentRecipeId);
    if (!recipe) return;

    const step = recipe.steps.find(s => s.id === stepId);
    if (!step) return;

    step.content = content;

    io.to(currentRecipeId).emit('step:updated', {
      stepId,
      content,
    });
  });

  socket.on('leave', () => {
    if (!currentRecipeId || !userId) return;

    const recipe = recipes.get(currentRecipeId);
    if (!recipe) return;

    recipe.users.delete(userId);
    socket.leave(currentRecipeId);

    const usersList = Array.from(recipe.users.values());
    io.to(currentRecipeId).emit('users:update', usersList);

    currentRecipeId = null;
    userId = null;
  });

  socket.on('disconnect', () => {
    if (!currentRecipeId || !userId) return;

    const recipe = recipes.get(currentRecipeId);
    if (!recipe) return;

    setTimeout(() => {
      const currentRecipe = recipes.get(currentRecipeId!);
      if (!currentRecipe) return;

      if (currentRecipe.users.has(userId!)) {
        currentRecipe.users.delete(userId!);
        const usersList = Array.from(currentRecipe.users.values());
        io.to(currentRecipeId!).emit('users:update', usersList);
      }
    }, 5000);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
