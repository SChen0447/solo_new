import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'figures.json');

app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

interface HobbyFigure {
  id: string;
  workName: string;
  characterName: string;
  manufacturer: string;
  series: string;
  scale: string;
  material: string;
  purchasePrice: number;
  currentValue: number;
  purchaseDate: string;
  condition: number;
  storageLocation: string;
  createdAt: string;
}

const readData = (): HobbyFigure[] => {
  if (!fs.existsSync(DATA_FILE)) {
    return [];
  }
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  return raw ? JSON.parse(raw) : [];
};

const writeData = (data: HobbyFigure[]) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
};

const seedData = (): HobbyFigure[] => {
  return [
    {
      id: uuidv4(),
      workName: '原神',
      characterName: '雷电将军',
      manufacturer: 'Good Smile Company',
      series: '原神系列',
      scale: '1/7',
      material: 'PVC, ABS',
      purchasePrice: 1280,
      currentValue: 1680,
      purchaseDate: '2024-03-15',
      condition: 5,
      storageLocation: '展示柜A-1',
      createdAt: new Date().toISOString()
    },
    {
      id: uuidv4(),
      workName: '鬼灭之刃',
      characterName: '祢豆子',
      manufacturer: 'Aniplex',
      series: '鬼灭系列',
      scale: '1/8',
      material: 'PVC',
      purchasePrice: 890,
      currentValue: 1120,
      purchaseDate: '2023-12-20',
      condition: 4,
      storageLocation: '展示柜A-2',
      createdAt: new Date().toISOString()
    },
    {
      id: uuidv4(),
      workName: '新世纪福音战士',
      characterName: '绫波丽',
      manufacturer: 'Kotobukiya',
      series: 'EVA系列',
      scale: '1/6',
      material: 'PVC, 树脂',
      purchasePrice: 1580,
      currentValue: 1420,
      purchaseDate: '2023-08-10',
      condition: 5,
      storageLocation: '展示柜B-1',
      createdAt: new Date().toISOString()
    },
    {
      id: uuidv4(),
      workName: '进击的巨人',
      characterName: '三笠·阿克曼',
      manufacturer: 'Good Smile Company',
      series: '巨人系列',
      scale: '1/7',
      material: 'PVC, ABS',
      purchasePrice: 980,
      currentValue: 1350,
      purchaseDate: '2024-01-05',
      condition: 4,
      storageLocation: '展示柜B-2',
      createdAt: new Date().toISOString()
    },
    {
      id: uuidv4(),
      workName: 'Fate/stay night',
      characterName: 'Saber',
      manufacturer: 'Alter',
      series: 'Fate系列',
      scale: '1/7',
      material: 'PVC, 金属',
      purchasePrice: 1880,
      currentValue: 2200,
      purchaseDate: '2023-06-18',
      condition: 5,
      storageLocation: '展示柜C-1',
      createdAt: new Date().toISOString()
    },
    {
      id: uuidv4(),
      workName: '咒术回战',
      characterName: '五条悟',
      manufacturer: 'Bandai Namco',
      series: '咒术系列',
      scale: '1/8',
      material: 'PVC',
      purchasePrice: 760,
      currentValue: 980,
      purchaseDate: '2024-02-28',
      condition: 4,
      storageLocation: '展示柜C-2',
      createdAt: new Date().toISOString()
    },
    {
      id: uuidv4(),
      workName: '原神',
      characterName: '甘雨',
      manufacturer: 'Aniplex',
      series: '原神系列',
      scale: '1/7',
      material: 'PVC, ABS',
      purchasePrice: 1380,
      currentValue: 1580,
      purchaseDate: '2024-04-10',
      condition: 5,
      storageLocation: '展示柜A-3',
      createdAt: new Date().toISOString()
    },
    {
      id: uuidv4(),
      workName: '新世纪福音战士',
      characterName: '明日香',
      manufacturer: 'Alter',
      series: 'EVA系列',
      scale: '1/7',
      material: 'PVC, ABS',
      purchasePrice: 1450,
      currentValue: 1680,
      purchaseDate: '2023-11-25',
      condition: 4,
      storageLocation: '展示柜B-3',
      createdAt: new Date().toISOString()
    }
  ];
};

if (!fs.existsSync(DATA_FILE)) {
  writeData(seedData());
}

app.get('/api/figures', (req, res) => {
  try {
    const data = readData();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: '读取数据失败' });
  }
});

app.get('/api/figures/:id', (req, res) => {
  try {
    const data = readData();
    const figure = data.find(f => f.id === req.params.id);
    if (!figure) {
      return res.status(404).json({ error: '手办未找到' });
    }
    res.json(figure);
  } catch (err) {
    res.status(500).json({ error: '读取数据失败' });
  }
});

app.post('/api/figures', (req, res) => {
  try {
    const data = readData();
    const newFigure: HobbyFigure = {
      id: uuidv4(),
      ...req.body,
      createdAt: new Date().toISOString()
    };
    data.push(newFigure);
    writeData(data);
    res.status(201).json(newFigure);
  } catch (err) {
    res.status(500).json({ error: '创建数据失败' });
  }
});

app.put('/api/figures/:id', (req, res) => {
  try {
    const data = readData();
    const index = data.findIndex(f => f.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: '手办未找到' });
    }
    data[index] = { ...data[index], ...req.body, id: req.params.id };
    writeData(data);
    res.json(data[index]);
  } catch (err) {
    res.status(500).json({ error: '更新数据失败' });
  }
});

app.delete('/api/figures/:id', (req, res) => {
  try {
    const data = readData();
    const index = data.findIndex(f => f.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: '手办未找到' });
    }
    data.splice(index, 1);
    writeData(data);
    res.json({ message: '删除成功' });
  } catch (err) {
    res.status(500).json({ error: '删除数据失败' });
  }
});

app.listen(PORT, () => {
  console.log(`后端服务器运行在 http://localhost:${PORT}`);
});
