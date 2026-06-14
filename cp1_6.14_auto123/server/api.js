import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

const DATA_DIR = path.join(__dirname, '..', 'data');
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const DATA_FILES = {
  instruments: path.join(DATA_DIR, 'instruments.json'),
  orders: path.join(DATA_DIR, 'orders.json'),
  reviews: path.join(DATA_DIR, 'reviews.json'),
  users: path.join(DATA_DIR, 'users.json'),
  tradeReviews: path.join(DATA_DIR, 'tradeReviews.json'),
};

const readJSON = (file) => {
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return [];
  }
};

const writeJSON = (file, data) => {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
};

for (const file of Object.values(DATA_FILES)) {
  if (!fs.existsSync(file)) writeJSON(file, []);
}

const users = readJSON(DATA_FILES.users);
if (users.length === 0) {
  const defaultUsers = [
    { id: 'user-1', name: '乐器收藏家', avatar: '', creditScore: 65, createdAt: Date.now() },
    { id: 'user-2', name: '吉他修复师', avatar: '', creditScore: 42, createdAt: Date.now() },
    { id: 'user-3', name: '小提琴学徒', avatar: '', creditScore: 18, createdAt: Date.now() },
  ];
  writeJSON(DATA_FILES.users, defaultUsers);
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

app.get('/api/users', (req, res) => {
  const users = readJSON(DATA_FILES.users);
  res.json(users);
});

app.get('/api/users/:id', (req, res) => {
  const users = readJSON(DATA_FILES.users);
  const user = users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  res.json(user);
});

app.get('/api/instruments', (req, res) => {
  const instruments = readJSON(DATA_FILES.instruments);
  res.json(instruments);
});

app.get('/api/instruments/:id', (req, res) => {
  const instruments = readJSON(DATA_FILES.instruments);
  const instrument = instruments.find((i) => i.id === req.params.id);
  if (!instrument) return res.status(404).json({ error: '乐器不存在' });
  res.json(instrument);
});

app.post('/api/instruments', (req, res) => {
  const instruments = readJSON(DATA_FILES.instruments);
  const newInstrument = {
    id: uuidv4(),
    ...req.body,
    renovations: [],
    reviews: [],
    listed: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  instruments.push(newInstrument);
  writeJSON(DATA_FILES.instruments, instruments);
  res.status(201).json(newInstrument);
});

app.put('/api/instruments/:id', (req, res) => {
  const instruments = readJSON(DATA_FILES.instruments);
  const idx = instruments.findIndex((i) => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '乐器不存在' });
  instruments[idx] = { ...instruments[idx], ...req.body, updatedAt: Date.now() };
  writeJSON(DATA_FILES.instruments, instruments);
  res.json(instruments[idx]);
});

app.post('/api/instruments/:id/renovations', (req, res) => {
  const instruments = readJSON(DATA_FILES.instruments);
  const idx = instruments.findIndex((i) => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '乐器不存在' });
  const renovation = {
    id: uuidv4(),
    ...req.body,
    createdAt: Date.now(),
  };
  instruments[idx].renovations = instruments[idx].renovations || [];
  instruments[idx].renovations.push(renovation);
  instruments[idx].updatedAt = Date.now();
  writeJSON(DATA_FILES.instruments, instruments);
  res.status(201).json(renovation);
});

app.post('/api/instruments/:id/reviews', (req, res) => {
  const instruments = readJSON(DATA_FILES.instruments);
  const idx = instruments.findIndex((i) => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '乐器不存在' });
  const review = {
    id: uuidv4(),
    ...req.body,
    createdAt: Date.now(),
  };
  instruments[idx].reviews = instruments[idx].reviews || [];
  instruments[idx].reviews.push(review);
  instruments[idx].updatedAt = Date.now();
  writeJSON(DATA_FILES.instruments, instruments);
  res.status(201).json(review);
});

app.post('/api/upload', upload.array('photos', 3), (req, res) => {
  const files = req.files || [];
  const urls = files.map((f) => `/uploads/${f.filename}`);
  res.json({ urls });
});

app.get('/api/orders', (req, res) => {
  const orders = readJSON(DATA_FILES.orders);
  res.json(orders);
});

app.get('/api/orders/:id', (req, res) => {
  const orders = readJSON(DATA_FILES.orders);
  const order = orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: '订单不存在' });
  res.json(order);
});

app.post('/api/orders', (req, res) => {
  const orders = readJSON(DATA_FILES.orders);
  const newOrder = {
    id: uuidv4(),
    ...req.body,
    status: 'pending',
    createdAt: Date.now(),
  };
  orders.push(newOrder);
  writeJSON(DATA_FILES.orders, orders);

  const instruments = readJSON(DATA_FILES.instruments);
  const instIdx = instruments.findIndex((i) => i.id === req.body.instrumentId);
  if (instIdx !== -1) {
    instruments[instIdx].sold = true;
    instruments[instIdx].listed = false;
    writeJSON(DATA_FILES.instruments, instruments);
  }

  res.status(201).json(newOrder);
});

app.put('/api/orders/:id', (req, res) => {
  const orders = readJSON(DATA_FILES.orders);
  const idx = orders.findIndex((o) => o.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '订单不存在' });
  orders[idx] = { ...orders[idx], ...req.body, updatedAt: Date.now() };
  writeJSON(DATA_FILES.orders, orders);
  res.json(orders[idx]);
});

app.get('/api/trade-reviews', (req, res) => {
  const reviews = readJSON(DATA_FILES.tradeReviews);
  res.json(reviews);
});

app.post('/api/trade-reviews', (req, res) => {
  const reviews = readJSON(DATA_FILES.tradeReviews);
  const newReview = {
    id: uuidv4(),
    ...req.body,
    createdAt: Date.now(),
  };
  reviews.push(newReview);
  writeJSON(DATA_FILES.tradeReviews, reviews);

  const users = readJSON(DATA_FILES.users);
  const { targetUserId, rating, role } = req.body;
  const userIdx = users.findIndex((u) => u.id === targetUserId);
  if (userIdx !== -1) {
    let change = 0;
    if (role === 'buyer') {
      change = rating >= 4 ? 2 : rating <= 2 ? -3 : 0;
    } else {
      change = rating >= 4 ? 3 : rating <= 2 ? -5 : 0;
    }

    const userReviews = reviews
      .filter((r) => r.targetUserId === targetUserId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 100);

    let weightedScore = 0;
    let totalWeight = 0;
    userReviews.forEach((r, i) => {
      const weight = 1 - i * 0.01;
      let delta = 0;
      if (r.role === 'buyer') {
        delta = r.rating >= 4 ? 2 : r.rating <= 2 ? -3 : 0;
      } else {
        delta = r.rating >= 4 ? 3 : r.rating <= 2 ? -5 : 0;
      }
      weightedScore += delta * weight;
      totalWeight += weight;
    });

    users[userIdx].creditScore = Math.max(0, Math.round(weightedScore));
    writeJSON(DATA_FILES.users, users);
  }

  res.status(201).json(newReview);
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
