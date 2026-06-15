import express from 'express';
import cors from 'cors';
import feedbackRoutes from './routes/feedbacks';

const app = express();
const PORT = 4001;

app.use(cors());
app.use(express.json());

app.use('/api', feedbackRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 反馈收集服务已启动: http://localhost:${PORT}`);
});
