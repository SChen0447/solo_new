import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../index';

const router = Router();

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

interface ConsumptionRecord {
  id: string;
  inventory_id: string;
  product_id: string;
  quantity_consumed: number;
  consumed_at: string;
}

router.get('/', (_req: Request, res: Response) => {
  try {
    const items = db.prepare(`
      SELECT * FROM inventory ORDER BY name COLLATE NOCASE ASC
    `).all() as InventoryItem[];

    const consumption = db.prepare(`
      SELECT ic.*, i.name as material_name
      FROM inventory_consumption ic
      JOIN inventory i ON ic.inventory_id = i.id
      WHERE ic.consumed_at >= datetime('now', '-7 days', 'localtime')
      ORDER BY ic.consumed_at DESC
    `).all() as (ConsumptionRecord & { material_name: string })[];

    const trendData = db.prepare(`
      SELECT
        date(consumed_at) as date,
        inventory_id,
        SUM(quantity_consumed) as total_consumed
      FROM inventory_consumption
      WHERE consumed_at >= datetime('now', '-7 days', 'localtime')
      GROUP BY date(consumed_at), inventory_id
      ORDER BY date ASC
    `).all();

    res.json({ items, consumption, trendData });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const { name, unit, quantity, unit_cost } = req.body;
    if (!name || !unit || quantity === undefined) {
      res.status(400).json({ error: '缺少必填字段' });
      return;
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO inventory (id, name, unit, quantity, initial_quantity, unit_cost, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, unit, quantity, quantity, unit_cost || 0, now, now);

    const item = db.prepare('SELECT * FROM inventory WHERE id = ?').get(id) as InventoryItem;
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { quantity, name, unit, unit_cost } = req.body;

    const existing = db.prepare('SELECT * FROM inventory WHERE id = ?').get(id) as InventoryItem | undefined;
    if (!existing) {
      res.status(404).json({ error: '材料不存在' });
      return;
    }

    const now = new Date().toISOString();
    const newQuantity = quantity !== undefined ? quantity : existing.quantity;
    const newName = name || existing.name;
    const newUnit = unit || existing.unit;
    const newUnitCost = unit_cost !== undefined ? unit_cost : existing.unit_cost;

    db.prepare(`
      UPDATE inventory SET quantity = ?, name = ?, unit = ?, unit_cost = ?, updated_at = ?
      WHERE id = ?
    `).run(newQuantity, newName, newUnit, newUnitCost, now, id);

    const item = db.prepare('SELECT * FROM inventory WHERE id = ?').get(id) as InventoryItem;
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM inventory WHERE id = ?').get(id);
    if (!existing) {
      res.status(404).json({ error: '材料不存在' });
      return;
    }

    db.prepare('DELETE FROM inventory_consumption WHERE inventory_id = ?').run(id);
    db.prepare('DELETE FROM inventory WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post('/restock/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;
    if (!quantity || quantity <= 0) {
      res.status(400).json({ error: '补货数量必须大于0' });
      return;
    }

    const existing = db.prepare('SELECT * FROM inventory WHERE id = ?').get(id) as InventoryItem | undefined;
    if (!existing) {
      res.status(404).json({ error: '材料不存在' });
      return;
    }

    const now = new Date().toISOString();
    const newQuantity = existing.quantity + quantity;
    const newInitial = existing.initial_quantity + quantity;

    db.prepare(`
      UPDATE inventory SET quantity = ?, initial_quantity = ?, updated_at = ? WHERE id = ?
    `).run(newQuantity, newInitial, now, id);

    const item = db.prepare('SELECT * FROM inventory WHERE id = ?').get(id) as InventoryItem;
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
