import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { Order, Product, CreateOrderRequest, OrderStatus } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();
const ordersPath = path.join(__dirname, '../data/orders.json');
const productsPath = path.join(__dirname, '../data/products.json');

const readOrders = (): Order[] => {
  const data = fs.readFileSync(ordersPath, 'utf-8');
  return JSON.parse(data);
};

const writeOrders = (orders: Order[]) => {
  fs.writeFileSync(ordersPath, JSON.stringify(orders, null, 2));
};

const readProducts = (): Product[] => {
  const data = fs.readFileSync(productsPath, 'utf-8');
  return JSON.parse(data);
};

const writeProducts = (products: Product[]) => {
  fs.writeFileSync(productsPath, JSON.stringify(products, null, 2));
};

const generateOrderNo = (): string => {
  const date = new Date();
  const dateStr = date.getFullYear().toString() +
    (date.getMonth() + 1).toString().padStart(2, '0') +
    date.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD${dateStr}${random}`;
};

router.get('/', (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    let orders = readOrders();

    if (status && status !== 'all') {
      orders = orders.filter(o => o.status === status);
    }

    orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: '获取订单列表失败' });
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const { items }: CreateOrderRequest = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: '订单项不能为空' });
    }

    const products = readProducts();
    const orders = readOrders();

    for (const item of items) {
      const product = products.find(p => p.id === item.productId);
      if (!product) {
        return res.status(404).json({ error: `产品 ${item.productId} 不存在` });
      }
      if (product.stock <= 0) {
        return res.status(400).json({ error: `产品 ${product.name} 已租完` });
      }
    }

    const orderItems = items.map(item => {
      const product = products.find(p => p.id === item.productId)!;
      return {
        ...item,
        subtotal: item.days * item.dailyRate
      };
    });

    const totalAmount = orderItems.reduce((sum, item) => sum + item.subtotal, 0);

    const order: Order = {
      id: uuidv4(),
      orderNo: generateOrderNo(),
      items: orderItems,
      totalAmount,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    for (const item of items) {
      const productIndex = products.findIndex(p => p.id === item.productId);
      if (productIndex !== -1) {
        products[productIndex].stock -= 1;
      }
    }

    orders.push(order);
    writeOrders(orders);
    writeProducts(products);

    res.status(201).json(order);
  } catch (error) {
    console.error('创建订单错误:', error);
    res.status(500).json({ error: '创建订单失败' });
  }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, actualReturnDate } = req.body;

    const orders = readOrders();
    const orderIndex = orders.findIndex(o => o.id === id);

    if (orderIndex === -1) {
      return res.status(404).json({ error: '订单不存在' });
    }

    if (status) {
      orders[orderIndex].status = status as OrderStatus;
    }

    if (actualReturnDate) {
      orders[orderIndex].actualReturnDate = actualReturnDate;
    }

    writeOrders(orders);
    res.json(orders[orderIndex]);
  } catch (error) {
    res.status(500).json({ error: '更新订单失败' });
  }
});

export default router;
