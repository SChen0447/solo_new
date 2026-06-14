import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Product } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();
const dataPath = path.join(__dirname, '../data/products.json');

const readProducts = (): Product[] => {
  const data = fs.readFileSync(dataPath, 'utf-8');
  return JSON.parse(data);
};

const writeProducts = (products: Product[]) => {
  fs.writeFileSync(dataPath, JSON.stringify(products, null, 2));
};

router.get('/', (req: Request, res: Response) => {
  try {
    const { category, minPrice, maxPrice, search } = req.query;
    let products = readProducts();

    if (category && category !== 'all') {
      products = products.filter(p => p.category === category);
    }

    if (minPrice) {
      products = products.filter(p => p.dailyRate >= Number(minPrice));
    }

    if (maxPrice) {
      products = products.filter(p => p.dailyRate <= Number(maxPrice));
    }

    if (search) {
      const searchLower = String(search).toLowerCase();
      products = products.filter(p => 
        p.name.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower)
      );
    }

    res.json(products);
  } catch (error) {
    res.status(500).json({ error: '获取产品列表失败' });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const products = readProducts();
    const product = products.find(p => p.id === id);

    if (!product) {
      return res.status(404).json({ error: '产品不存在' });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ error: '获取产品详情失败' });
  }
});

export default router;
