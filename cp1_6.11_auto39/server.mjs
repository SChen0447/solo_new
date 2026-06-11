import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors());
app.use(express.json());

const users = new Map();
const meetings = new Map();
const todos = new Map();
const reports = new Map();

users.set('u1', { id: 'u1', username: 'admin', displayName: '管理员', password: '123456' });
users.set('u2', { id: 'u2', username: 'zhangsan', displayName: '张三', password: '123456' });
users.set('u3', { id: 'u3', username: 'lisi', displayName: '李四', password: '123456' });
users.set('u4', { id: 'u4', username: 'wangwu', displayName: '王五', password: '123456' });
users.set('u5', { id: 'u5', username: 'zhaoliu', displayName: '赵六', password: '123456' });

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  for (const user of users.values()) {
    if (user.username === username && user.password === password) {
      const { password: _, ...safeUser } = user;
      return res.json({ user: safeUser, token: 'mock-token-' + uuidv4() });
    }
  }
  return res.status(401).json({ error: '用户名或密码错误' });
});

app.get('/api/users', (req, res) => {
  const query = (req.query.q || '').toLowerCase();
  const result = Array.from(users.values())
    .map(u => { const { password: _, ...safe } = u; return safe; })
    .filter(u => !query || u.username.toLowerCase().includes(query) || u.displayName.toLowerCase().includes(query));
  res.json(result);
});

app.post('/api/meetings', (req, res) => {
  const { title, dateTime, participantIds, agendas, createdBy } = req.body;
  const id = uuidv4();
  const meeting = {
    id,
    title,
    dateTime,
    participantIds: participantIds || [],
    agendas: (agendas || []).map((a, idx) => ({
      id: uuidv4(),
      meetingId: id,
      title: a.title,
      estimatedDuration: a.estimatedDuration,
      notes: '',
      status: 'pending',
      actualDuration: 0,
      order: idx
    })),
    status: 'scheduled',
    createdBy: createdBy || 'u1',
    createdAt: new Date().toISOString()
  };
  meetings.set(id, meeting);
  res.json(meeting);
});

app.get('/api/meetings', (req, res) => {
  const list = Array.from(meetings.values()).sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const result = list.map(m => {
    const meetingTodos = Array.from(todos.values()).filter(t => t.meetingId === m.id);
    const completedCount = meetingTodos.filter(t => t.completed).length;
    const completionRate = meetingTodos.length > 0 ? Math.round((completedCount / meetingTodos.length) * 100) : 0;
    return { ...m, todoCount: meetingTodos.length, completedTodoCount: completedCount, completionRate };
  });
  res.json(result);
});

app.get('/api/meetings/:id', (req, res) => {
  const meeting = meetings.get(req.params.id);
  if (!meeting) return res.status(404).json({ error: '会议不存在' });
  const meetingTodos = Array.from(todos.values()).filter(t => t.meetingId === meeting.id);
  const report = reports.get(meeting.id) || null;
  res.json({ ...meeting, todos: meetingTodos, report });
});

app.put('/api/meetings/:id', (req, res) => {
  const meeting = meetings.get(req.params.id);
  if (!meeting) return res.status(404).json({ error: '会议不存在' });
  const updated = { ...meeting, ...req.body, updatedAt: new Date().toISOString() };
  meetings.set(req.params.id, updated);
  res.json(updated);
});

app.post('/api/meetings/:id/report', (req, res) => {
  const meeting = meetings.get(req.params.id);
  if (!meeting) return res.status(404).json({ error: '会议不存在' });
  const existingTodos = Array.from(todos.values()).filter(t => t.meetingId === meeting.id);
  if (existingTodos.length === 0) {
    meeting.agendas.forEach(a => {
      if (a.notes && a.notes.includes('待办')) {
        const todo = {
          id: uuidv4(),
          meetingId: meeting.id,
          description: `从「${a.title}」提取的待办事项`,
          assigneeId: meeting.participantIds[0] || meeting.createdBy,
          dueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10),
          completed: false
        };
        todos.set(todo.id, todo);
      }
    });
  }
  const summary = `本次会议「${meeting.title}」共进行了 ${meeting.agendas.length} 项议程讨论，达成多项共识。请相关人员按时完成分配的待办事项。`;
  const report = {
    id: uuidv4(),
    meetingId: meeting.id,
    summary,
    createdAt: new Date().toISOString()
  };
  reports.set(meeting.id, report);
  meeting.status = 'completed';
  meetings.set(meeting.id, meeting);
  const meetingTodos = Array.from(todos.values()).filter(t => t.meetingId === meeting.id);
  res.json({ report, todos: meetingTodos });
});

app.get('/api/meetings/:id/report', (req, res) => {
  const meeting = meetings.get(req.params.id);
  if (!meeting) return res.status(404).json({ error: '会议不存在' });
  const report = reports.get(meeting.id);
  const meetingTodos = Array.from(todos.values()).filter(t => t.meetingId === meeting.id);
  res.json({ report: report || null, todos: meetingTodos, meeting });
});

app.post('/api/todos', (req, res) => {
  const { meetingId, description, assigneeId, dueDate } = req.body;
  const todo = {
    id: uuidv4(),
    meetingId,
    description,
    assigneeId: assigneeId || '',
    dueDate: dueDate || '',
    completed: false
  };
  todos.set(todo.id, todo);
  res.json(todo);
});

app.put('/api/todos/:id', (req, res) => {
  const todo = todos.get(req.params.id);
  if (!todo) return res.status(404).json({ error: '待办事项不存在' });
  const updated = { ...todo, ...req.body };
  todos.set(req.params.id, updated);
  res.json(updated);
});

app.delete('/api/todos/:id', (req, res) => {
  const todo = todos.get(req.params.id);
  if (!todo) return res.status(404).json({ error: '待办事项不存在' });
  todos.delete(req.params.id);
  res.json({ success: true });
});

app.get('/api/todos', (req, res) => {
  res.json(Array.from(todos.values()));
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`会议管家后端服务已启动: http://localhost:${PORT}`);
});
