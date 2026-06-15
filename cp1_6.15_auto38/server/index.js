import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const books = [
  {
    id: '1',
    title: '百年孤独',
    author: '加西亚·马尔克斯',
    price: 88,
    coverImage: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=600&fit=crop',
    description: '魔幻现实主义文学代表作，讲述布恩迪亚家族七代人的传奇故事。',
    pages: 360,
    publisher: '南海出版公司',
    publishDate: '2024-06-15',
    coverColor: '#8B4513',
    spineColor: '#654321',
    pageColor: '#f5f0eb',
    edgeDesign: 'gold',
    specialFeatures: ['烫金封面', '书口彩绘', '限量编号']
  },
  {
    id: '2',
    title: '三体',
    author: '刘慈欣',
    price: 98,
    coverImage: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=400&h=600&fit=crop',
    description: '中国科幻里程碑之作，展现宏大的宇宙观和深刻的人性思考。',
    pages: 420,
    publisher: '重庆出版社',
    publishDate: '2024-07-20',
    coverColor: '#0a192f',
    spineColor: '#172a45',
    pageColor: '#f5f0eb',
    edgeDesign: 'galaxy',
    specialFeatures: ['UV工艺', '星空书口', '作者签名']
  },
  {
    id: '3',
    title: '人类简史',
    author: '尤瓦尔·赫拉利',
    price: 108,
    coverImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop',
    description: '从认知革命到科学革命，重新审视人类的发展历程。',
    pages: 480,
    publisher: '中信出版社',
    publishDate: '2024-08-10',
    coverColor: '#2c3e50',
    spineColor: '#1a252f',
    pageColor: '#f5f0eb',
    edgeDesign: 'marble',
    specialFeatures: ['布面精装', '大理石纹书口', '典藏函套']
  },
  {
    id: '4',
    title: '小王子',
    author: '安托万·德·圣-埃克苏佩里',
    price: 68,
    coverImage: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400&h=600&fit=crop',
    description: '献给所有曾经是孩子的大人，一个关于爱与责任的童话。',
    pages: 120,
    publisher: '人民文学出版社',
    publishDate: '2024-09-01',
    coverColor: '#f39c12',
    spineColor: '#d68910',
    pageColor: '#f5f0eb',
    edgeDesign: 'stars',
    specialFeatures: ['全彩插图', '星光书口', '译者签名']
  },
  {
    id: '5',
    title: '红楼梦',
    author: '曹雪芹',
    price: 128,
    coverImage: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=600&fit=crop',
    description: '中国古典小说巅峰之作，描绘封建社会的众生相。',
    pages: 800,
    publisher: '人民文学出版社',
    publishDate: '2024-10-15',
    coverColor: '#8e44ad',
    spineColor: '#6c3483',
    pageColor: '#f5f0eb',
    edgeDesign: 'classical',
    specialFeatures: ['线装工艺', '古典纹样书口', '脂评批注']
  },
  {
    id: '6',
    title: '活着',
    author: '余华',
    price: 78,
    coverImage: 'https://images.unsplash.com/photo-1476275466078-4007374efbbe?w=400&h=600&fit=crop',
    description: '讲述一个人和他命运之间的友情，讲述人如何去承受巨大的苦难。',
    pages: 280,
    publisher: '作家出版社',
    publishDate: '2024-11-01',
    coverColor: '#c0392b',
    spineColor: '#922b21',
    pageColor: '#f5f0eb',
    edgeDesign: 'ink',
    specialFeatures: ['水墨设计', '书法书口', '作者题字']
  }
];

const orders = [];

app.get('/api/books', (req, res) => {
  setTimeout(() => {
    res.json(books);
  }, 300);
});

app.get('/api/books/:id', (req, res) => {
  setTimeout(() => {
    const book = books.find(b => b.id === req.params.id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.json(book);
  }, 200);
});

app.get('/api/orders', (req, res) => {
  setTimeout(() => {
    res.json(orders);
  }, 200);
});

app.post('/api/orders', (req, res) => {
  setTimeout(() => {
    const { items, shippingInfo, total } = req.body;
    
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'No items in order' });
    }
    
    if (!shippingInfo || !shippingInfo.name || !shippingInfo.phone || !shippingInfo.address) {
      return res.status(400).json({ error: 'Incomplete shipping information' });
    }
    
    const orderId = 'ORD' + Date.now().toString().slice(-8);
    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + 14);
    
    const order = {
      id: orderId,
      items,
      shippingInfo,
      total,
      status: 'pending',
      createdAt: new Date().toISOString(),
      estimatedDelivery: estimatedDelivery.toISOString().split('T')[0]
    };
    
    orders.push(order);
    
    res.json({
      orderId,
      estimatedDelivery: order.estimatedDelivery,
      status: order.status
    });
  }, 400);
});

app.patch('/api/orders/:id/status', (req, res) => {
  setTimeout(() => {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'shipped', 'completed'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const order = orders.find(o => o.id === req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    order.status = status;
    order.updatedAt = new Date().toISOString();
    
    res.json({ success: true, order });
  }, 200);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
