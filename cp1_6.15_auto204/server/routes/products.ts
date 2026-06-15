import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../index';

const router = Router();

interface MaterialConsumption {
  inventoryId: string;
  quantity: number;
}

interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  initial_quantity: number;
  unit_cost: number;
  created_at: string;
  updated_at: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  materials: string;
  created_at: string;
}

interface ConsumptionRow {
  id: string;
  inventory_id: string;
  product_id: string;
  quantity_consumed: number;
  consumed_at: string;
}

router.post('/', (req: Request, res: Response) => {
  try {
    const { name, price, materials } = req.body as {
      name: string;
      price: number;
      materials: MaterialConsumption[];
    };

    if (!name || !price || !materials || materials.length === 0) {
      res.status(400).json({ error: '缺少必填字段' });
      return;
    }

    const insufficient: { name: string; available: number; unit: string }[] = [];

    for (const m of materials) {
      const item = db.prepare('SELECT * FROM inventory WHERE id = ?').get(m.inventoryId) as InventoryItem | undefined;
      if (!item || item.quantity < m.quantity) {
        insufficient.push({
          name: item?.name || '未知材料',
          available: item?.quantity || 0,
          unit: item?.unit || '',
        });
      }
    }

    if (insufficient.length > 0) {
      res.status(400).json({ error: '库存不足', insufficient });
      return;
    }

    const productId = uuidv4();
    const now = new Date().toISOString();

    const insertProduct = db.prepare(`
      INSERT INTO products (id, name, price, materials, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertConsumption = db.prepare(`
      INSERT INTO inventory_consumption (id, inventory_id, product_id, quantity_consumed, consumed_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const updateInventory = db.prepare(`
      UPDATE inventory SET quantity = quantity - ?, updated_at = ? WHERE id = ?
    `);

    const transaction = db.transaction(() => {
      insertProduct.run(productId, name, price, JSON.stringify(materials), now);

      for (const m of materials) {
        const consumptionId = uuidv4();
        insertConsumption.run(consumptionId, m.inventoryId, productId, m.quantity, now);
        updateInventory.run(m.quantity, now, m.inventoryId);
      }
    });

    transaction();

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId) as Product;
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get('/', (req: Request, res: Response) => {
  try {
    const { startDate, endDate, type } = req.query;

    if (type === 'report') {
      const month = req.query.month as string;
      let dateFilter = '';
      const params: (string | number)[] = [];

      if (month) {
        dateFilter = "WHERE p.created_at >= ? AND p.created_at < ?";
        const start = `${month}-01`;
        const [y, m] = month.split('-').map(Number);
        const nextMonth = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
        params.push(start, nextMonth);
      } else if (startDate && endDate) {
        dateFilter = "WHERE p.created_at >= ? AND p.created_at <= ?";
        params.push(startDate as string, endDate as string);
      } else {
        const now = new Date();
        const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        dateFilter = "WHERE p.created_at >= ? AND p.created_at < ?";
        const start = `${thisMonth}-01`;
        const [y, m] = thisMonth.split('-').map(Number);
        const nextMonth = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
        params.push(start, nextMonth);
      }

      const products = db.prepare(`
        SELECT p.*, GROUP_CONCAT(ic.inventory_id || ':' || ic.quantity_consumed) as consumption_ids
        FROM products p
        LEFT JOIN inventory_consumption ic ON p.id = ic.product_id
        ${dateFilter}
        GROUP BY p.id
        ORDER BY p.created_at DESC
      `).all(...params) as (Product & { consumption_ids: string })[];

      const consumptions = db.prepare(`
        SELECT ic.*, i.name as material_name, i.unit_cost, i.unit
        FROM inventory_consumption ic
        JOIN inventory i ON ic.inventory_id = i.id
      `).all() as (ConsumptionRow & { material_name: string; unit_cost: number; unit: string })[];

      const weeklySales = db.prepare(`
        SELECT
          strftime('%Y-W%W', p.created_at) as week,
          SUM(p.price) as total_sales,
          COUNT(*) as count
        FROM products p
        ${dateFilter}
        GROUP BY strftime('%Y-W%W', p.created_at)
        ORDER BY week ASC
      `).all(...params);

      const materialConsumption = db.prepare(`
        SELECT
          i.id as inventory_id,
          i.name as material_name,
          i.unit,
          SUM(ic.quantity_consumed) as total_consumed
        FROM inventory_consumption ic
        JOIN inventory i ON ic.inventory_id = i.id
        JOIN products p ON ic.product_id = p.id
        ${dateFilter}
        GROUP BY ic.inventory_id
        ORDER BY total_consumed DESC
      `).all(...params);

      const totalSales = db.prepare(`
        SELECT COALESCE(SUM(p.price), 0) as total
        FROM products p
        ${dateFilter}
      `).get(...params) as { total: number };

      let totalCost = 0;
      for (const c of consumptions) {
        const product = products.find(p => p.id === c.product_id);
        if (product) {
          totalCost += c.quantity_consumed * c.unit_cost;
        }
      }

      const topProducts = db.prepare(`
        SELECT p.name, p.price, COUNT(*) as sales_count,
               GROUP_CONCAT(ic.inventory_id || ':' || ic.quantity_consumed) as consumption_data
        FROM products p
        LEFT JOIN inventory_consumption ic ON p.id = ic.product_id
        ${dateFilter}
        GROUP BY p.id
        ORDER BY sales_count DESC, p.price DESC
        LIMIT 5
      `).all(...params);

      res.json({
        products,
        consumptions,
        weeklySales,
        materialConsumption,
        totalSales: totalSales.total,
        totalCost,
        totalProfit: totalSales.total - totalCost,
        topProducts,
      });
      return;
    }

    let query = 'SELECT * FROM products WHERE 1=1';
    const params: (string | number)[] = [];

    if (startDate) {
      query += ' AND created_at >= ?';
      params.push(startDate as string);
    }
    if (endDate) {
      query += ' AND created_at <= ?';
      params.push(endDate as string);
    }

    query += ' ORDER BY created_at DESC';

    const products = db.prepare(query).all(...params) as Product[];

    const consumptions = db.prepare(`
      SELECT ic.*, i.name as material_name, i.unit_cost, i.unit
      FROM inventory_consumption ic
      JOIN inventory i ON ic.inventory_id = i.id
      ${startDate ? "WHERE ic.consumed_at >= '" + startDate + "'" : ''}
      ${endDate ? (startDate ? ' AND' : ' WHERE') + " ic.consumed_at <= '" + endDate + "'" : ''}
    `).all();

    res.json({ products, consumptions });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!product) {
      res.status(404).json({ error: '作品不存在' });
      return;
    }

    const consumptions = db.prepare(
      'SELECT * FROM inventory_consumption WHERE product_id = ?'
    ).all(id) as ConsumptionRow[];

    const transaction = db.transaction(() => {
      for (const c of consumptions) {
        db.prepare('UPDATE inventory SET quantity = quantity + ? WHERE id = ?').run(
          c.quantity_consumed,
          c.inventory_id
        );
      }
      db.prepare('DELETE FROM inventory_consumption WHERE product_id = ?').run(id);
      db.prepare('DELETE FROM products WHERE id = ?').run(id);
    });

    transaction();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
