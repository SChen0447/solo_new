import express, { Request, Response } from 'express';
import cors from 'cors';
import {
  OfficeItem,
  BorrowRecord,
  getAllItems,
  addItem,
  updateItem,
  deleteItem,
  borrowItem,
  returnItem,
  getAllBorrowRecords,
  getStats,
  getActiveBorrowRecordByItem,
} from './database';

export interface Stats {
  totalItems: number;
  totalBorrowCount: number;
  currentlyBorrowed: number;
  overdueCount: number;
}

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get('/api/items', (_req: Request, res: Response) => {
  try {
    const items = getAllItems();
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取物品列表失败' });
  }
});

app.post('/api/items', (req: Request, res: Response) => {
  try {
    const { name, code, department } = req.body;
    if (!name || !code || !department) {
      return res.status(400).json({ success: false, error: '请填写完整的物品信息' });
    }
    const existingItems = getAllItems();
    if (existingItems.some((i) => i.code === code)) {
      return res.status(400).json({ success: false, error: '物品编号已存在' });
    }
    const newItem: OfficeItem = addItem({ name, code, department });
    res.json({ success: true, data: newItem });
  } catch (error) {
    res.status(500).json({ success: false, error: '添加物品失败' });
  }
});

app.put('/api/items/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, code, department } = req.body;
    if (!name && !code && !department) {
      return res.status(400).json({ success: false, error: '请提供要更新的字段' });
    }
    const updateData: Partial<Omit<OfficeItem, 'id'>> = {};
    if (name) updateData.name = name;
    if (code) updateData.code = code;
    if (department) updateData.department = department;
    const updated = updateItem(id, updateData);
    if (!updated) {
      return res.status(404).json({ success: false, error: '物品不存在' });
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: '更新物品失败' });
  }
});

app.delete('/api/items/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const activeRecord = getActiveBorrowRecordByItem(id);
    if (activeRecord) {
      return res.status(400).json({ success: false, error: '该物品正在借出中，无法删除' });
    }
    const deleted = deleteItem(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: '物品不存在' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: '删除物品失败' });
  }
});

app.post('/api/items/borrow/:itemId', (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    const { employeeId, employeeName, expectedReturnDate } = req.body;
    if (!employeeId || !employeeName || !expectedReturnDate) {
      return res.status(400).json({ success: false, error: '请填写完整的借出信息' });
    }
    const result = borrowItem({ itemId, employeeId, employeeName, expectedReturnDate });
    if ('error' in result) {
      return res.status(400).json({ success: false, error: result.error });
    }
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: '借出登记失败' });
  }
});

app.post('/api/items/return/:recordId', (req: Request, res: Response) => {
  try {
    const { recordId } = req.params;
    const { employeeId } = req.body;
    if (!employeeId) {
      return res.status(400).json({ success: false, error: '请填写工号' });
    }
    const result = returnItem(recordId, employeeId);
    if ('error' in result) {
      return res.status(400).json({ success: false, error: result.error });
    }
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: '归还登记失败' });
  }
});

app.get('/api/borrow-records', (_req: Request, res: Response) => {
  try {
    const records = getAllBorrowRecords();
    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取借出记录失败' });
  }
});

app.get('/api/stats', (_req: Request, res: Response) => {
  try {
    const stats = getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取统计数据失败' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 OfficeLend 后端服务器已启动: http://localhost:${PORT}`);
});

export { BorrowRecord };
