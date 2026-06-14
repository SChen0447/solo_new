import express from 'express';
import cors from 'cors';
import * as fs from 'fs';
import * as path from 'path';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

interface SocialLink {
  platform: string;
  url: string;
}

interface Card {
  id: string;
  name: string;
  occupation: string;
  phone: string;
  email: string;
  website: string;
  socialLinks: SocialLink[];
  bio: string;
  theme: string;
  avatarUrl: string;
  createdAt: string;
  receivedAt?: string;
}

interface CardData {
  cards: Card[];
}

const DATA_PATH = path.join(__dirname, 'data', 'cards.json');

function readData(): CardData {
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { cards: [] };
  }
}

function writeData(data: CardData): void {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function generateShortId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

app.get('/api/cards', (req, res) => {
  const data = readData();
  const cards = data.cards.sort((a, b) => 
    new Date(b.receivedAt || b.createdAt).getTime() - new Date(a.receivedAt || a.createdAt).getTime()
  );
  res.json({ cards });
});

app.get('/api/cards/:id', (req, res) => {
  const { id } = req.params;
  const data = readData();
  const card = data.cards.find(c => c.id === id);
  if (!card) {
    res.status(404).json({ error: '名片不存在' });
    return;
  }
  res.json({ card });
});

app.post('/api/cards', (req, res) => {
  const {
    name,
    occupation,
    phone,
    email,
    website,
    socialLinks,
    bio,
    theme,
    avatarUrl,
  } = req.body;

  if (!name || !theme) {
    res.status(400).json({ error: '姓名和主题为必填项' });
    return;
  }

  const data = readData();
  let id: string;
  do {
    id = generateShortId();
  } while (data.cards.some(c => c.id === id));

  const newCard: Card = {
    id,
    name,
    occupation: occupation || '',
    phone: phone || '',
    email: email || '',
    website: website || '',
    socialLinks: socialLinks || [],
    bio: bio || '',
    theme,
    avatarUrl: avatarUrl || '',
    createdAt: new Date().toISOString(),
  };

  data.cards.push(newCard);
  writeData(data);

  res.status(201).json({ card: newCard });
});

app.put('/api/cards/:id', (req, res) => {
  const { id } = req.params;
  const data = readData();
  const cardIndex = data.cards.findIndex(c => c.id === id);

  if (cardIndex === -1) {
    res.status(404).json({ error: '名片不存在' });
    return;
  }

  const updated = { ...data.cards[cardIndex], ...req.body, id };
  data.cards[cardIndex] = updated;
  writeData(data);

  res.json({ card: updated });
});

app.delete('/api/cards/:id', (req, res) => {
  const { id } = req.params;
  const data = readData();
  const cardIndex = data.cards.findIndex(c => c.id === id);

  if (cardIndex === -1) {
    res.status(404).json({ error: '名片不存在' });
    return;
  }

  data.cards.splice(cardIndex, 1);
  writeData(data);

  res.json({ success: true });
});

app.post('/api/exchange', (req, res) => {
  const { cardId } = req.body;

  if (!cardId) {
    res.status(400).json({ error: '请提供名片ID' });
    return;
  }

  const data = readData();
  const card = data.cards.find(c => c.id === cardId);

  if (!card) {
    res.status(404).json({ error: '名片不存在，请检查ID是否正确' });
    return;
  }

  const receivedCard = { ...card, receivedAt: new Date().toISOString() };
  const existingIndex = data.cards.findIndex(c => c.id === cardId);
  
  if (existingIndex !== -1) {
    data.cards[existingIndex] = receivedCard;
  } else {
    data.cards.push(receivedCard);
  }
  
  writeData(data);

  res.json({ card: receivedCard });
});

app.listen(PORT, () => {
  console.log(`名片服务运行在 http://localhost:${PORT}`);
});
