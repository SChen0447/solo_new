import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

app.use(cors());
app.use(express.json());

let menuItems = [
  {
    id: '1',
    name: '培根煎蛋套餐',
    description: '经典美式早餐，包含煎蛋、培根、吐司和现磨咖啡',
    imageUrl: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=400',
    stock: 25,
    recommended: true,
    prices: {
      breakfast: 28,
      lunch: 35,
      dinner: 38
    }
  },
  {
    id: '2',
    name: '三文鱼沙拉',
    description: '新鲜挪威三文鱼配有机蔬菜沙拉，健康低脂',
    imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
    stock: 15,
    recommended: true,
    prices: {
      breakfast: 0,
      lunch: 48,
      dinner: 52
    }
  },
  {
    id: '3',
    name: '黑椒牛排',
    description: '澳洲谷饲牛排配黑椒酱，附带时蔬和土豆泥',
    imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400',
    stock: 10,
    recommended: true,
    prices: {
      breakfast: 0,
      lunch: 88,
      dinner: 98
    }
  },
  {
    id: '4',
    name: '香菇鸡肉粥',
    description: '熬制三小时的营养粥品，加入鲜香菇和嫩滑鸡肉',
    imageUrl: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400',
    stock: 30,
    recommended: false,
    prices: {
      breakfast: 18,
      lunch: 22,
      dinner: 22
    }
  },
  {
    id: '5',
    name: '意大利肉酱面',
    description: '经典博洛尼亚肉酱，慢炖四小时，搭配手工意面',
    imageUrl: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400',
    stock: 20,
    recommended: false,
    prices: {
      breakfast: 0,
      lunch: 42,
      dinner: 48
    }
  },
  {
    id: '6',
    name: '抹茶提拉米苏',
    description: '日式抹茶风味提拉米苏，入口即化的精致甜点',
    imageUrl: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400',
    stock: 8,
    recommended: true,
    prices: {
      breakfast: 32,
      lunch: 32,
      dinner: 36
    }
  },
  {
    id: '7',
    name: '清蒸鲈鱼',
    description: '新鲜海鲈鱼清蒸，淋上秘制葱姜汁',
    imageUrl: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400',
    stock: 0,
    recommended: false,
    prices: {
      breakfast: 0,
      lunch: 68,
      dinner: 78
    }
  },
  {
    id: '8',
    name: '牛角面包拼盘',
    description: '现烤黄油牛角面包配多种果酱和黄油',
    imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400',
    stock: 40,
    recommended: false,
    prices: {
      breakfast: 22,
      lunch: 26,
      dinner: 26
    }
  }
];

let orders = [];

app.get('/api/menu', (req, res) => {
  res.json(menuItems);
});

app.get('/api/menu/:id', (req, res) => {
  const item = menuItems.find(m => m.id === req.params.id);
  if (!item) return res.status(404).json({ message: '菜品不存在' });
  res.json(item);
});

app.post('/api/menu', (req, res) => {
  const newItem = {
    id: uuidv4(),
    ...req.body,
    stock: req.body.stock || 0,
    recommended: req.body.recommended || false
  };
  menuItems.push(newItem);
  io.emit('menu:updated', { action: 'create', item: newItem });
  res.status(201).json(newItem);
});

app.put('/api/menu/:id', (req, res) => {
  const index = menuItems.findIndex(m => m.id === req.params.id);
  if (index === -1) return res.status(404).json({ message: '菜品不存在' });
  menuItems[index] = { ...menuItems[index], ...req.body };
  io.emit('menu:updated', { action: 'update', item: menuItems[index] });
  res.json(menuItems[index]);
});

app.put('/api/menu/:id/stock', (req, res) => {
  const index = menuItems.findIndex(m => m.id === req.params.id);
  if (index === -1) return res.status(404).json({ message: '菜品不存在' });
  menuItems[index].stock = parseInt(req.body.stock, 10) || 0;
  io.emit('stock:updated', { id: menuItems[index].id, stock: menuItems[index].stock });
  res.json({ id: menuItems[index].id, stock: menuItems[index].stock });
});

app.delete('/api/menu/:id', (req, res) => {
  const index = menuItems.findIndex(m => m.id === req.params.id);
  if (index === -1) return res.status(404).json({ message: '菜品不存在' });
  const deleted = menuItems.splice(index, 1)[0];
  io.emit('menu:updated', { action: 'delete', id: deleted.id });
  res.json({ message: '删除成功' });
});

app.get('/api/orders', (req, res) => {
  res.json(orders);
});

app.post('/api/orders', (req, res) => {
  const { items, timeSlot } = req.body;
  const processedItems = [];
  let total = 0;

  for (const orderItem of items) {
    const menuItem = menuItems.find(m => m.id === orderItem.id);
    if (!menuItem || menuItem.stock < orderItem.quantity) {
      return res.status(400).json({ message: `菜品 ${orderItem.id} 库存不足` });
    }
    menuItem.stock -= orderItem.quantity;
    const price = menuItem.prices[timeSlot] || 0;
    total += price * orderItem.quantity;
    processedItems.push({
      ...orderItem,
      name: menuItem.name,
      price,
      subtotal: price * orderItem.quantity
    });
    io.emit('stock:updated', { id: menuItem.id, stock: menuItem.stock });
  }

  const newOrder = {
    id: uuidv4(),
    items: processedItems,
    total,
    timeSlot,
    createdAt: new Date().toISOString()
  };
  orders.push(newOrder);
  io.emit('order:created', newOrder);
  res.status(201).json(newOrder);
});

io.on('connection', (socket) => {
  console.log('客户端连接:', socket.id);
  socket.emit('menu:init', menuItems);

  socket.on('disconnect', () => {
    console.log('客户端断开:', socket.id);
  });
});

const PORT = 4000;
httpServer.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
