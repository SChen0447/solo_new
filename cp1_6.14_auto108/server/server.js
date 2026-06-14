import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');

const app = express();
app.use(cors());
app.use(express.json());

function readData(file) {
  const filePath = path.join(DATA_DIR, file);
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function writeData(file, data) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2));
}

const DEFAULT_USER = {
  id: 'user-001',
  name: '社区居民小王',
  joinDate: '2024-01-15T10:00:00.000Z',
};

app.get('/api/users', (req, res) => {
  res.json([DEFAULT_USER]);
});

app.get('/api/users/current', (req, res) => {
  res.json(DEFAULT_USER);
});

app.get('/api/items', (req, res) => {
  const items = readData('items.json');
  res.json(items);
});

app.get('/api/items/:id', (req, res) => {
  const items = readData('items.json');
  const item = items.find((i) => i.id === req.params.id);
  if (!item) return res.status(404).json({ error: '物品不存在' });
  res.json(item);
});

app.post('/api/items', (req, res) => {
  const items = readData('items.json');
  const newItem = {
    id: uuidv4(),
    ...req.body,
    userId: DEFAULT_USER.id,
    status: 'available',
    createdAt: new Date().toISOString(),
  };
  items.unshift(newItem);
  writeData('items.json', items);
  res.status(201).json(newItem);
});

app.delete('/api/items/:id', (req, res) => {
  const items = readData('items.json');
  const index = items.findIndex((i) => i.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: '物品不存在' });
  const [deleted] = items.splice(index, 1);
  writeData('items.json', items);
  res.json(deleted);
});

app.patch('/api/items/:id', (req, res) => {
  const items = readData('items.json');
  const index = items.findIndex((i) => i.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: '物品不存在' });
  items[index] = { ...items[index], ...req.body };
  writeData('items.json', items);
  res.json(items[index]);
});

app.get('/api/trades', (req, res) => {
  const trades = readData('trades.json');
  res.json(trades);
});

app.post('/api/trades', (req, res) => {
  const trades = readData('trades.json');
  const { itemId, myItemId } = req.body;
  const items = readData('items.json');
  const targetItem = items.find((i) => i.id === itemId);
  const myItem = items.find((i) => i.id === myItemId);
  if (!targetItem || !myItem) {
    return res.status(400).json({ error: '物品不存在' });
  }
  const newTrade = {
    id: uuidv4(),
    requesterId: DEFAULT_USER.id,
    requesterItemId: myItemId,
    responderId: targetItem.userId,
    responderItemId: itemId,
    status: 'pending',
    createdAt: new Date().toISOString(),
    history: [
      {
        status: 'pending',
        timestamp: new Date().toISOString(),
        message: '交换请求已发起',
      },
    ],
  };
  trades.unshift(newTrade);
  writeData('trades.json', trades);
  res.status(201).json(newTrade);
});

app.patch('/api/trades/:id', (req, res) => {
  const trades = readData('trades.json');
  const index = trades.findIndex((t) => t.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: '交易不存在' });

  const { status } = req.body;
  const trade = trades[index];
  trade.status = status;
  trade.history = trade.history || [];

  if (status === 'accepted') {
    trade.acceptedAt = new Date().toISOString();
    trade.history.push({
      status: 'accepted',
      timestamp: new Date().toISOString(),
      message: '对方已接受交换',
    });
    const items = readData('items.json');
    const idx1 = items.findIndex((i) => i.id === trade.requesterItemId);
    const idx2 = items.findIndex((i) => i.id === trade.responderItemId);
    if (idx1 !== -1) items[idx1].status = 'exchanged';
    if (idx2 !== -1) items[idx2].status = 'exchanged';
    writeData('items.json', items);
  } else if (status === 'rejected') {
    trade.history.push({
      status: 'rejected',
      timestamp: new Date().toISOString(),
      message: '对方已拒绝交换',
    });
  } else if (status === 'cancelled') {
    trade.history.push({
      status: 'cancelled',
      timestamp: new Date().toISOString(),
      message: '交易已取消',
    });
  }

  trades[index] = trade;
  writeData('trades.json', trades);
  res.json(trade);
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
