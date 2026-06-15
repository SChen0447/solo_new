const express = require('express');
const cors = require('cors');
const path = require('path');
const { toolQueries, reservationQueries, borrowQueries, userQueries } = require('./db');
const { generateQRCode } = require('./utils/qrGenerator');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/tools', (req, res) => {
  const { category, search } = req.query;
  const tools = toolQueries.getAll(category, search);
  const toolsWithReservations = tools.map(tool => ({
    ...tool,
    reservations: reservationQueries.getByToolId(tool.id)
  }));
  res.json(toolsWithReservations);
});

app.get('/api/tools/:id', (req, res) => {
  const tool = toolQueries.getById(req.params.id);
  if (!tool) {
    return res.status(404).json({ error: '工具不存在' });
  }
  const reservations = reservationQueries.getByToolId(tool.id);
  res.json({ ...tool, reservations });
});

app.get('/api/tools/:id/availability', (req, res) => {
  const { id } = req.params;
  const { date } = req.query;
  
  const tool = toolQueries.getById(id);
  if (!tool) {
    return res.status(404).json({ error: '工具不存在' });
  }
  
  const timeSlots = [
    { slot: '09:00-12:00', label: '上午 9:00-12:00' },
    { slot: '13:00-17:00', label: '下午 13:00-17:00' },
    { slot: '18:00-21:00', label: '晚间 18:00-21:00' }
  ];
  
  const availability = timeSlots.map(({ slot, label }) => {
    const conflict = reservationQueries.checkConflict(id, date, slot);
    return {
      slot,
      label,
      available: !conflict && tool.status === 'available'
    };
  });
  
  res.json(availability);
});

app.post('/api/tools', async (req, res) => {
  try {
    const { name, category, description, image_url } = req.body;
    
    if (!name || !category) {
      return res.status(400).json({ error: '工具名称和类别不能为空' });
    }
    
    const toolId = toolQueries.create({
      name,
      category,
      description,
      image_url,
      qr_code_url: ''
    });
    
    const qrCodeUrl = await generateQRCode(toolId);
    toolQueries.updateQrCode(toolId, qrCodeUrl);
    
    const tool = toolQueries.getById(toolId);
    res.status(201).json(tool);
  } catch (error) {
    console.error('创建工具失败:', error);
    res.status(500).json({ error: '创建工具失败' });
  }
});

app.put('/api/tools/:id', (req, res) => {
  const { id } = req.params;
  const { name, category, description, image_url, status } = req.body;
  
  const tool = toolQueries.getById(id);
  if (!tool) {
    return res.status(404).json({ error: '工具不存在' });
  }
  
  toolQueries.update(id, {
    name: name || tool.name,
    category: category || tool.category,
    description: description !== undefined ? description : tool.description,
    image_url: image_url !== undefined ? image_url : tool.image_url,
    status: status || tool.status
  });
  
  res.json(toolQueries.getById(id));
});

app.delete('/api/tools/:id', (req, res) => {
  const { id } = req.params;
  
  const tool = toolQueries.getById(id);
  if (!tool) {
    return res.status(404).json({ error: '工具不存在' });
  }
  
  toolQueries.delete(id);
  res.json({ message: '删除成功' });
});

app.get('/api/reservations', (req, res) => {
  const { status, user_name } = req.query;
  
  if (user_name) {
    const reservations = reservationQueries.getByUser(user_name);
    return res.json(reservations);
  }
  
  const reservations = reservationQueries.getAll(status);
  res.json(reservations);
});

app.get('/api/reservations/upcoming', (req, res) => {
  const { user_name } = req.query;
  if (!user_name) {
    return res.status(400).json({ error: '缺少用户名' });
  }
  
  const upcoming = reservationQueries.getUpcoming(user_name);
  upcoming.forEach(r => reservationQueries.markNotified(r.id));
  res.json(upcoming);
});

app.post('/api/reservations', (req, res) => {
  const { tool_id, user_name, date, time_slot } = req.body;
  
  if (!tool_id || !user_name || !date || !time_slot) {
    return res.status(400).json({ error: '缺少必要参数' });
  }
  
  const tool = toolQueries.getById(tool_id);
  if (!tool) {
    return res.status(404).json({ error: '工具不存在' });
  }
  
  if (tool.status !== 'available') {
    return res.status(400).json({ error: '工具当前不可预约' });
  }
  
  const conflict = reservationQueries.checkConflict(tool_id, date, time_slot);
  if (conflict) {
    return res.status(409).json({ error: '该时段已被预约' });
  }
  
  const reservationId = reservationQueries.create({
    tool_id,
    user_name,
    date,
    time_slot
  });
  
  const reservation = reservationQueries.getAll().find(r => r.id === reservationId);
  res.status(201).json(reservation);
});

app.put('/api/reservations/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  reservationQueries.updateStatus(id, status);
  res.json({ message: '状态更新成功' });
});

app.post('/api/borrow', (req, res) => {
  const { tool_id, user_name } = req.body;
  
  if (!tool_id || !user_name) {
    return res.status(400).json({ error: '缺少必要参数' });
  }
  
  const tool = toolQueries.getById(tool_id);
  if (!tool) {
    return res.status(404).json({ error: '工具不存在' });
  }
  
  if (tool.status !== 'available') {
    return res.status(400).json({ error: '工具当前不可借出' });
  }
  
  const activeBorrow = borrowQueries.getActiveByToolId(tool_id);
  if (activeBorrow) {
    return res.status(400).json({ error: '该工具已被借出' });
  }
  
  const recordId = borrowQueries.create({ tool_id, user_name });
  toolQueries.updateStatus(tool_id, 'borrowed');
  
  const pendingReservations = reservationQueries.getByToolId(tool_id);
  pendingReservations.forEach(r => {
    reservationQueries.updateStatus(r.id, 'completed');
  });
  
  const record = borrowQueries.getAll().find(b => b.id === recordId);
  res.status(201).json(record);
});

app.post('/api/return', (req, res) => {
  const { tool_id } = req.body;
  
  if (!tool_id) {
    return res.status(400).json({ error: '缺少工具ID' });
  }
  
  const activeBorrow = borrowQueries.getActiveByToolId(tool_id);
  if (!activeBorrow) {
    return res.status(400).json({ error: '该工具未被借出' });
  }
  
  borrowQueries.returnTool(activeBorrow.id);
  toolQueries.updateStatus(tool_id, 'available');
  
  res.json({ message: '归还成功' });
});

app.get('/api/borrow-records', (req, res) => {
  const records = borrowQueries.getAll();
  res.json(records);
});

app.get('/api/stats', (req, res) => {
  const stats = borrowQueries.getStats();
  
  const tools = toolQueries.getAll();
  const totalTools = tools.length;
  const availableTools = tools.filter(t => t.status === 'available').length;
  const borrowedTools = tools.filter(t => t.status === 'borrowed').length;
  const maintenanceTools = tools.filter(t => t.status === 'maintenance').length;
  
  const totalReservations = reservationQueries.getAll().length;
  
  res.json({
    ...stats,
    totalTools,
    availableTools,
    borrowedTools,
    maintenanceTools,
    totalReservations
  });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  const user = userQueries.login(username, password);
  if (!user) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  
  res.json({
    id: user.id,
    username: user.username,
    role: user.role
  });
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
