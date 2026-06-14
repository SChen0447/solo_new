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
const DATA_DIR = path.join(__dirname, '..', 'data');

app.use(cors());
app.use(express.json());

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJSONFile(filename) {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeJSONFile(filename, data) {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function generatePickupCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function addEvent(type, description, relatedId) {
  const events = readJSONFile('events.json');
  const newEvent = {
    id: uuidv4(),
    type,
    description,
    relatedId,
    timestamp: new Date().toISOString(),
  };
  events.unshift(newEvent);
  writeJSONFile('events.json', events);
  return newEvent;
}

app.get('/api/luggage', (req, res) => {
  const luggage = readJSONFile('luggage.json');
  res.json(luggage);
});

app.post('/api/luggage', (req, res) => {
  const { name, phone, luggageType, notes, expectedPickupTime } = req.body;
  
  if (!name || !phone || !luggageType) {
    return res.status(400).json({ error: '姓名、手机号和行李类型为必填项' });
  }

  const luggage = readJSONFile('luggage.json');
  const pickupCode = generatePickupCode();
  
  const newLuggage = {
    id: uuidv4(),
    name,
    phone,
    luggageType,
    notes: notes || '',
    expectedPickupTime: expectedPickupTime || null,
    pickupCode,
    status: 'stored',
    storedAt: new Date().toISOString(),
    claimedAt: null,
  };

  luggage.push(newLuggage);
  writeJSONFile('luggage.json', luggage);
  
  addEvent('store', `${name} 寄存了${luggageType}`, newLuggage.id);
  
  res.status(201).json(newLuggage);
});

app.put('/api/luggage/:id', (req, res) => {
  const { id } = req.params;
  const { status, pickupCode } = req.body;
  
  const luggage = readJSONFile('luggage.json');
  const index = luggage.findIndex(item => item.id === id);
  
  if (index === -1) {
    return res.status(404).json({ error: '行李记录不存在' });
  }

  if (status === 'claimed') {
    if (!pickupCode) {
      return res.status(400).json({ error: '请输入取件码' });
    }
    if (luggage[index].pickupCode !== pickupCode) {
      return res.status(400).json({ error: '取件码错误' });
    }
    luggage[index].status = 'claimed';
    luggage[index].claimedAt = new Date().toISOString();
    addEvent('claim', `${luggage[index].name} 取走了${luggage[index].luggageType}`, id);
  }

  writeJSONFile('luggage.json', luggage);
  res.json(luggage[index]);
});

app.get('/api/shareItems', (req, res) => {
  const shareItems = readJSONFile('shareItems.json');
  res.json(shareItems);
});

app.post('/api/shareItems', (req, res) => {
  const { name, itemType, description } = req.body;
  
  if (!name || !itemType) {
    return res.status(400).json({ error: '物品名称和类型为必填项' });
  }

  const shareItems = readJSONFile('shareItems.json');
  
  const newItem = {
    id: uuidv4(),
    name,
    itemType,
    description: description || '',
    status: 'available',
    borrowCount: 0,
    currentBorrower: null,
    borrowedAt: null,
    expectedReturnAt: null,
    returnedAt: null,
  };

  shareItems.push(newItem);
  writeJSONFile('shareItems.json', shareItems);
  
  addEvent('addItem', `添加了共享物品: ${name}`, newItem.id);
  
  res.status(201).json(newItem);
});

app.put('/api/shareItems/:id', (req, res) => {
  const { id } = req.params;
  const { action, borrowerName, expectedReturnAt } = req.body;
  
  const shareItems = readJSONFile('shareItems.json');
  const index = shareItems.findIndex(item => item.id === id);
  
  if (index === -1) {
    return res.status(404).json({ error: '物品不存在' });
  }

  if (action === 'borrow') {
    if (shareItems[index].status !== 'available') {
      return res.status(400).json({ error: '该物品已被借出' });
    }
    if (!borrowerName) {
      return res.status(400).json({ error: '请输入借用人姓名' });
    }
    
    const defaultReturnTime = new Date();
    defaultReturnTime.setHours(defaultReturnTime.getHours() + 24);
    
    shareItems[index].status = 'borrowed';
    shareItems[index].borrowCount += 1;
    shareItems[index].currentBorrower = borrowerName;
    shareItems[index].borrowedAt = new Date().toISOString();
    shareItems[index].expectedReturnAt = expectedReturnAt || defaultReturnTime.toISOString();
    shareItems[index].returnedAt = null;
    
    addEvent('borrow', `${borrowerName} 借出了 ${shareItems[index].name}`, id);
    
  } else if (action === 'return') {
    if (shareItems[index].status !== 'borrowed') {
      return res.status(400).json({ error: '该物品未被借出' });
    }
    
    shareItems[index].status = 'available';
    shareItems[index].returnedAt = new Date().toISOString();
    
    addEvent('return', `${shareItems[index].currentBorrower} 归还了 ${shareItems[index].name}`, id);
    
    shareItems[index].currentBorrower = null;
    shareItems[index].borrowedAt = null;
    shareItems[index].expectedReturnAt = null;
  }

  writeJSONFile('shareItems.json', shareItems);
  res.json(shareItems[index]);
});

app.get('/api/events', (req, res) => {
  const events = readJSONFile('events.json');
  const limit = parseInt(req.query.limit) || 50;
  res.json(events.slice(0, limit));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API endpoints: http://localhost:${PORT}/api`);
});
