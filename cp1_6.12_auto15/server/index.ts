import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.post('/api/parse', (req, res) => {
  const { text } = req.body;
  res.json({
    success: true,
    message: '解析请求已接收（主要逻辑在前端执行）',
    receivedLength: text?.length || 0
  });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  需求文档生成器后端服务已启动`);
  console.log(`  端口: ${PORT}`);
  console.log(`  API: http://localhost:${PORT}/api`);
  console.log(`========================================\n`);
});
