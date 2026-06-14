import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_DIR = path.join(__dirname, '..', 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const MENU_FILE = path.join(DATA_DIR, 'menu.json');

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

const ensureDataDir = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
};

const ensureMenuFile = () => {
  if (!fs.existsSync(MENU_FILE)) {
    const defaultMenu = [
      { id: 'm1', name: '宫保鸡丁', price: 28 },
      { id: 'm2', name: '麻婆豆腐', price: 18 },
      { id: 'm3', name: '鱼香肉丝', price: 26 },
      { id: 'm4', name: '红烧肉', price: 38 },
      { id: 'm5', name: '西红柿炒鸡蛋', price: 16 },
      { id: 'm6', name: '糖醋里脊', price: 32 },
      { id: 'm7', name: '米饭', price: 3 },
      { id: 'm8', name: '紫菜蛋花汤', price: 10 },
    ];
    fs.writeFileSync(MENU_FILE, JSON.stringify(defaultMenu, null, 2), 'utf-8');
  }
};

const ensureOrdersFile = () => {
  if (!fs.existsSync(ORDERS_FILE)) {
    const now = Date.now();
    const sampleOrders = [
      {
        id: 'o-1001',
        orderNumber: 1001,
        customerName: '张先生',
        address: '幸福路88号A栋301',
        phone: '138****1234',
        location: { x: 50, y: 120 },
        items: [
          { id: 'm1', name: '宫保鸡丁', price: 28, quantity: 1 },
          { id: 'm7', name: '米饭', price: 3, quantity: 2 },
        ],
        customItems: [],
        totalPrice: 34,
        status: 'delivered',
        createdAt: now - 6 * 24 * 3600 * 1000,
        deliveredAt: now - 6 * 24 * 3600 * 1000 + 25 * 60 * 1000,
      },
      {
        id: 'o-1002',
        orderNumber: 1002,
        customerName: '李女士',
        address: '阳光小区15号楼2单元502',
        phone: '139****5678',
        location: { x: 220, y: 80 },
        items: [
          { id: 'm3', name: '鱼香肉丝', price: 26, quantity: 1 },
          { id: 'm8', name: '紫菜蛋花汤', price: 10, quantity: 1 },
        ],
        customItems: [],
        totalPrice: 36,
        status: 'delivered',
        createdAt: now - 5 * 24 * 3600 * 1000,
        deliveredAt: now - 5 * 24 * 3600 * 1000 + 32 * 60 * 1000,
      },
      {
        id: 'o-1003',
        orderNumber: 1003,
        customerName: '王师傅',
        address: '建设路36号甲单元102',
        phone: '136****9012',
        location: { x: 150, y: 280 },
        items: [
          { id: 'm4', name: '红烧肉', price: 38, quantity: 1 },
          { id: 'm2', name: '麻婆豆腐', price: 18, quantity: 1 },
          { id: 'm7', name: '米饭', price: 3, quantity: 3 },
        ],
        customItems: [],
        totalPrice: 65,
        status: 'delivered',
        createdAt: now - 4 * 24 * 3600 * 1000,
        deliveredAt: now - 4 * 24 * 3600 * 1000 + 28 * 60 * 1000,
      },
      {
        id: 'o-1004',
        orderNumber: 1004,
        customerName: '赵阿姨',
        address: '和平花园8栋401',
        phone: '137****3456',
        location: { x: 320, y: 180 },
        items: [
          { id: 'm6', name: '糖醋里脊', price: 32, quantity: 1 },
          { id: 'm5', name: '西红柿炒鸡蛋', price: 16, quantity: 1 },
        ],
        customItems: [
          { name: '加辣', price: 0, quantity: 1 },
        ],
        totalPrice: 48,
        status: 'delivered',
        createdAt: now - 3 * 24 * 3600 * 1000,
        deliveredAt: now - 3 * 24 * 3600 * 1000 + 22 * 60 * 1000,
      },
      {
        id: 'o-1005',
        orderNumber: 1005,
        customerName: '孙先生',
        address: '文明街168号305室',
        phone: '135****7890',
        location: { x: 80, y: 200 },
        items: [
          { id: 'm1', name: '宫保鸡丁', price: 28, quantity: 2 },
          { id: 'm7', name: '米饭', price: 3, quantity: 4 },
        ],
        customItems: [],
        totalPrice: 68,
        status: 'delivered',
        createdAt: now - 2 * 24 * 3600 * 1000,
        deliveredAt: now - 2 * 24 * 3600 * 1000 + 35 * 60 * 1000,
      },
      {
        id: 'o-1006',
        orderNumber: 1006,
        customerName: '周女士',
        address: '友谊大厦1508',
        phone: '186****2345',
        location: { x: 280, y: 340 },
        items: [
          { id: 'm3', name: '鱼香肉丝', price: 26, quantity: 1 },
          { id: 'm4', name: '红烧肉', price: 38, quantity: 1 },
        ],
        customItems: [],
        totalPrice: 64,
        status: 'delivered',
        createdAt: now - 1 * 24 * 3600 * 1000,
        deliveredAt: now - 1 * 24 * 3600 * 1000 + 27 * 60 * 1000,
      },
      {
        id: 'o-1007',
        orderNumber: 1007,
        customerName: '陈老板',
        address: '商业街A-125号',
        phone: '188****6789',
        location: { x: 180, y: 50 },
        items: [
          { id: 'm2', name: '麻婆豆腐', price: 18, quantity: 2 },
          { id: 'm8', name: '紫菜蛋花汤', price: 10, quantity: 2 },
        ],
        customItems: [
          { name: '打包盒', price: 2, quantity: 4 },
        ],
        totalPrice: 64,
        status: 'delivering',
        createdAt: now - 20 * 60 * 1000,
      },
      {
        id: 'o-1008',
        orderNumber: 1008,
        customerName: '吴小姐',
        address: '文化西路22号6号楼2单元702',
        phone: '187****0123',
        location: { x: 350, y: 100 },
        items: [
          { id: 'm5', name: '西红柿炒鸡蛋', price: 16, quantity: 1 },
          { id: 'm7', name: '米饭', price: 3, quantity: 1 },
        ],
        customItems: [],
        totalPrice: 19,
        status: 'cooking',
        createdAt: now - 8 * 60 * 1000,
      },
      {
        id: 'o-1009',
        orderNumber: 1009,
        customerName: '郑大爷',
        address: '幸福巷44号',
        phone: '185****4567',
        location: { x: 40, y: 360 },
        items: [
          { id: 'm6', name: '糖醋里脊', price: 32, quantity: 1 },
        ],
        customItems: [],
        totalPrice: 32,
        status: 'pending',
        createdAt: now - 35 * 60 * 1000,
      },
      {
        id: 'o-1010',
        orderNumber: 1010,
        customerName: '林同学',
        address: '大学路1号宿舍区A栋210',
        phone: '180****8901',
        location: { x: 120, y: 150 },
        items: [
          { id: 'm1', name: '宫保鸡丁', price: 28, quantity: 1 },
          { id: 'm7', name: '米饭', price: 3, quantity: 2 },
        ],
        customItems: [],
        totalPrice: 34,
        status: 'pending',
        createdAt: now - 2 * 60 * 1000,
      },
    ];
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(sampleOrders, null, 2), 'utf-8');
  }
};

ensureDataDir();
ensureMenuFile();
ensureOrdersFile();

interface MenuItem {
  id: string;
  name: string;
  price: number;
}

interface OrderItem {
  id?: string;
  name: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  orderNumber: number;
  customerName: string;
  address: string;
  phone: string;
  location: { x: number; y: number };
  items: OrderItem[];
  customItems: OrderItem[];
  totalPrice: number;
  status: 'pending' | 'cooking' | 'delivering' | 'delivered';
  createdAt: number;
  deliveredAt?: number;
  notes?: string;
}

const readJSON = <T>(filePath: string): T => {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as T;
};

const writeJSON = (filePath: string, data: unknown) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
};

app.get('/api/menu', (req: Request, res: Response) => {
  try {
    const menu = readJSON<MenuItem[]>(MENU_FILE);
    res.json(menu);
  } catch (err) {
    res.status(500).json({ error: '读取菜单失败' });
  }
});

app.get('/api/orders', (req: Request, res: Response) => {
  try {
    const { status, date } = req.query;
    let orders = readJSON<Order[]>(ORDERS_FILE);

    if (status && typeof status === 'string') {
      orders = orders.filter((o) => o.status === status);
    }

    if (date && typeof date === 'string') {
      const target = new Date(date);
      const startOfDay = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
      const endOfDay = startOfDay + 24 * 3600 * 1000;
      orders = orders.filter((o) => o.createdAt >= startOfDay && o.createdAt < endOfDay);
    }

    orders.sort((a, b) => b.createdAt - a.createdAt);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: '读取订单失败' });
  }
});

app.get('/api/orders/:id', (req: Request, res: Response) => {
  try {
    const orders = readJSON<Order[]>(ORDERS_FILE);
    const order = orders.find((o) => o.id === req.params.id);
    if (!order) {
      res.status(404).json({ error: '订单不存在' });
      return;
    }
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: '读取订单失败' });
  }
});

app.post('/api/orders', (req: Request, res: Response) => {
  try {
    const orders = readJSON<Order[]>(ORDERS_FILE);
    const maxNum = orders.reduce((max, o) => (o.orderNumber > max ? o.orderNumber : max), 1000);
    const newOrder: Order = {
      id: `o-${maxNum + 1}`,
      orderNumber: maxNum + 1,
      customerName: req.body.customerName,
      address: req.body.address,
      phone: req.body.phone,
      location: req.body.location || {
        x: Math.floor(Math.random() * 360) + 20,
        y: Math.floor(Math.random() * 360) + 20,
      },
      items: req.body.items || [],
      customItems: req.body.customItems || [],
      totalPrice: req.body.totalPrice || 0,
      status: req.body.status || 'pending',
      createdAt: Date.now(),
      notes: req.body.notes,
    };
    orders.push(newOrder);
    writeJSON(ORDERS_FILE, orders);
    res.status(201).json(newOrder);
  } catch (err) {
    res.status(500).json({ error: '创建订单失败' });
  }
});

app.put('/api/orders/:id', (req: Request, res: Response) => {
  try {
    const orders = readJSON<Order[]>(ORDERS_FILE);
    const idx = orders.findIndex((o) => o.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: '订单不存在' });
      return;
    }
    const updated = { ...orders[idx], ...req.body };
    if (
      updated.status === 'delivered' &&
      (!updated.deliveredAt || orders[idx].status !== 'delivered')
    ) {
      updated.deliveredAt = Date.now();
    }
    orders[idx] = updated;
    writeJSON(ORDERS_FILE, orders);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: '更新订单失败' });
  }
});

app.delete('/api/orders/:id', (req: Request, res: Response) => {
  try {
    const orders = readJSON<Order[]>(ORDERS_FILE);
    const filtered = orders.filter((o) => o.id !== req.params.id);
    if (filtered.length === orders.length) {
      res.status(404).json({ error: '订单不存在' });
      return;
    }
    writeJSON(ORDERS_FILE, filtered);
    res.json({ message: '删除成功' });
  } catch (err) {
    res.status(500).json({ error: '删除订单失败' });
  }
});

app.get('/api/stats/summary', (req: Request, res: Response) => {
  try {
    const orders = readJSON<Order[]>(ORDERS_FILE);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startTs = startOfToday.getTime();
    const endTs = startTs + 24 * 3600 * 1000;

    const todayOrders = orders.filter((o) => o.createdAt >= startTs && o.createdAt < endTs);
    const todayDelivered = todayOrders.filter((o) => o.status === 'delivered' && o.deliveredAt);
    const totalSales = todayDelivered.reduce((sum, o) => sum + o.totalPrice, 0);

    const avgDeliveryTime =
      todayDelivered.length > 0
        ? Math.round(
            todayDelivered.reduce((sum, o) => {
              const mins = (o.deliveredAt! - o.createdAt) / (60 * 1000);
              return sum + mins;
            }, 0) / todayDelivered.length
          )
        : 0;

    res.json({
      totalOrders: todayOrders.length,
      avgDeliveryTime,
      totalSales,
    });
  } catch (err) {
    res.status(500).json({ error: '获取统计数据失败' });
  }
});

app.get('/api/stats/weekly', (req: Request, res: Response) => {
  try {
    const orders = readJSON<Order[]>(ORDERS_FILE);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailySales: { date: string; sales: number; target: number }[] = [];
    const TARGET = 200;

    for (let i = 6; i >= 0; i--) {
      const day = new Date(today);
      day.setDate(day.getDate() - i);
      const startTs = day.getTime();
      const endTs = startTs + 24 * 3600 * 1000;

      const dayOrders = orders.filter(
        (o) =>
          (o.status === 'delivered' || o.status === 'delivering' || o.status === 'cooking' || o.status === 'pending') &&
          o.createdAt >= startTs &&
          o.createdAt < endTs
      );
      const sales = dayOrders
        .filter((o) => o.status === 'delivered')
        .reduce((sum, o) => sum + o.totalPrice, 0);

      const dateStr = `${day.getMonth() + 1}/${day.getDate()}`;
      dailySales.push({ date: dateStr, sales, target: TARGET });
    }

    res.json(dailySales);
  } catch (err) {
    res.status(500).json({ error: '获取周统计数据失败' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 后端服务器已启动: http://localhost:${PORT}`);
});
