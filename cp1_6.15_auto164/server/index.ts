import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = 3001;
const ADMIN_PASSWORD = 'admin123';

interface Drink {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  thumbnail: string;
  customizations: {
    milkTypes: string[];
    syrupFlavors: string[];
    temperatures: string[];
    espressoShots: { min: number; max: number; default: number };
    iceLevels: { min: number; max: number; default: number };
  };
}

interface Note {
  id: string;
  drinkId: string;
  content: string;
  mood: 'happy' | 'relaxed' | 'energized' | 'disappointed' | 'surprised';
  createdAt: string;
}

interface Order {
  id: string;
  drinkId: string;
  customizations: {
    milkType: string;
    syrupFlavor: string;
    temperature: string;
    espressoShots: number;
    iceLevel: number;
  };
  createdAt: string;
}

const dataDir = path.join(__dirname, 'data');
const drinksPath = path.join(dataDir, 'drinks.json');
const notesPath = path.join(dataDir, 'notes.json');
const ordersPath = path.join(dataDir, 'orders.json');

const readJSON = <T>(filePath: string): T => {
  const rawData = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(rawData);
};

const writeJSON = <T>(filePath: string, data: T): void => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
};

app.use(cors());
app.use(express.json());

app.get('/api/drinks', (_req: Request, res: Response<Drink[]>) => {
  const drinks = readJSON<Drink[]>(drinksPath);
  res.json(drinks);
});

app.get('/api/drinks/:id', (req: Request<{ id: string }>, res: Response<Drink | { error: string }>) => {
  const drinks = readJSON<Drink[]>(drinksPath);
  const drink = drinks.find(d => d.id === req.params.id);
  if (drink) {
    res.json(drink);
  } else {
    res.status(404).json({ error: 'Drink not found' });
  }
});

app.get('/api/notes', (req: Request<{}, {}, {}, { drinkId?: string }>, res: Response<Note[]>) => {
  let notes = readJSON<Note[]>(notesPath);
  if (req.query.drinkId) {
    notes = notes.filter(n => n.drinkId === req.query.drinkId);
  }
  notes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(notes);
});

app.post('/api/notes', (req: Request<{}, {}, Omit<Note, 'id' | 'createdAt'>>, res: Response<Note>) => {
  const notes = readJSON<Note[]>(notesPath);
  const newNote: Note = {
    ...req.body,
    id: `note-${uuidv4().slice(0, 8)}`,
    createdAt: new Date().toISOString()
  };
  notes.unshift(newNote);
  writeJSON(notesPath, notes);
  res.json(newNote);
});

app.post('/api/orders', (req: Request<{}, {}, Omit<Order, 'id' | 'createdAt'>>, res: Response<Order>) => {
  const orders = readJSON<Order[]>(ordersPath);
  const newOrder: Order = {
    ...req.body,
    id: `order-${uuidv4().slice(0, 8)}`,
    createdAt: new Date().toISOString()
  };
  orders.push(newOrder);
  writeJSON(ordersPath, orders);
  res.json(newOrder);
});

app.get('/api/dashboard', (_req: Request, res: Response) => {
  const drinks = readJSON<Drink[]>(drinksPath);
  const notes = readJSON<Note[]>(notesPath);
  const orders = readJSON<Order[]>(ordersPath);

  const orderCounts: { [key: string]: number } = {};
  orders.forEach(order => {
    orderCounts[order.drinkId] = (orderCounts[order.drinkId] || 0) + 1;
  });

  const topDrinks = drinks
    .map(drink => ({
      drinkId: drink.id,
      name: drink.name,
      count: orderCounts[drink.id] || 0
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const wordMap: { [key: string]: number } = {};
  const stopWords = ['的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这'];
  
  notes.forEach(note => {
    const words = note.content.split(/[\s，。！？、,.!?]+/);
    words.forEach(word => {
      if (word.length >= 2 && !stopWords.includes(word)) {
        wordMap[word] = (wordMap[word] || 0) + 1;
      }
    });
  });

  const wordCloud = Object.entries(wordMap)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 50);

  const moodScores: { [key: string]: number } = {
    'happy': 5,
    'surprised': 4,
    'energized': 4,
    'relaxed': 3,
    'disappointed': 1
  };

  const drinkMoods: { [key: string]: number[] } = {};
  notes.forEach(note => {
    if (!drinkMoods[note.drinkId]) {
      drinkMoods[note.drinkId] = [];
    }
    drinkMoods[note.drinkId].push(moodScores[note.mood] || 3);
  });

  const moodAverages = drinks
    .map(drink => {
      const moods = drinkMoods[drink.id] || [];
      const averageMood = moods.length > 0
        ? moods.reduce((a, b) => a + b, 0) / moods.length
        : 0;
      return {
        drinkId: drink.id,
        name: drink.name,
        averageMood: Math.round(averageMood * 10) / 10
      };
    })
    .sort((a, b) => b.averageMood - a.averageMood);

  const weeklyTrend: { date: string; count: number }[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const count = orders.filter(order => 
      order.createdAt.split('T')[0] === dateStr
    ).length;
    weeklyTrend.push({ date: dateStr, count });
  }

  res.json({
    topDrinks,
    wordCloud,
    moodAverages,
    weeklyTrend
  });
});

app.post('/api/login', (req: Request<{}, {}, { password: string }>, res: Response<{ success: boolean; message?: string }>) => {
  if (req.body.password === ADMIN_PASSWORD) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: '密码错误' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
