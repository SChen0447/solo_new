import express from 'express';
import cors from 'cors';
import {
  initDb,
  getTimeSlotsByDate,
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  getStats,
} from './db.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

initDb();

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/time-slots', (req, res) => {
  try {
    const { date } = req.query;
    if (!date || typeof date !== 'string') {
      return res.status(400).json({ error: '请提供日期参数' });
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({ error: '日期格式不正确，请使用 YYYY-MM-DD 格式' });
    }

    const slots = getTimeSlotsByDate(date);
    res.json(slots);
  } catch (error) {
    console.error('获取时段失败:', error);
    res.status(500).json({ error: '获取时段失败' });
  }
});

app.post('/api/orders', (req, res) => {
  try {
    const { customer_name, phone, project_type, description, time_slot } = req.body;

    if (!customer_name || !phone || !project_type || !time_slot) {
      return res.status(400).json({ error: '请填写所有必填项' });
    }

    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ error: '请输入有效的手机号码' });
    }

    const validProjects = ['陶艺', '木工', '布艺'];
    if (!validProjects.includes(project_type)) {
      return res.status(400).json({ error: '无效的项目类型' });
    }

    const order = createOrder({
      customer_name,
      phone,
      project_type,
      description,
      time_slot,
    });

    res.status(201).json(order);
  } catch (error) {
    console.error('创建订单失败:', error);
    res.status(500).json({ error: '创建订单失败' });
  }
});

app.get('/api/orders', (req, res) => {
  try {
    const { status } = req.query;
    const orders = getAllOrders(status as string | undefined);
    res.json(orders);
  } catch (error) {
    console.error('获取订单失败:', error);
    res.status(500).json({ error: '获取订单失败' });
  }
});

app.get('/api/orders/:id', (req, res) => {
  try {
    const { id } = req.params;
    const order = getOrderById(id);
    if (!order) {
      return res.status(404).json({ error: '订单不存在' });
    }
    res.json(order);
  } catch (error) {
    console.error('获取订单详情失败:', error);
    res.status(500).json({ error: '获取订单详情失败' });
  }
});

app.put('/api/orders/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: '请提供状态参数' });
    }

    const updatedOrder = updateOrderStatus(id, status);
    if (!updatedOrder) {
      return res.status(404).json({ error: '订单不存在' });
    }

    res.json(updatedOrder);
  } catch (error) {
    if (error instanceof Error && error.message === '无效的状态值') {
      return res.status(400).json({ error: error.message });
    }
    console.error('更新订单状态失败:', error);
    res.status(500).json({ error: '更新订单状态失败' });
  }
});

app.get('/api/stats', (req, res) => {
  try {
    const stats = getStats();
    res.json(stats);
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({ error: '获取统计数据失败' });
  }
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});

export default app;
