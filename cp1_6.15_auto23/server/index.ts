import dotenv from 'dotenv';
import app from '../api/app.js';
import { ensureDirectories } from './storage.js';

dotenv.config();

const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    await ensureDirectories();
    console.log('数据目录初始化完成');
    
    app.listen(PORT, () => {
      console.log(`后端服务器运行在 http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
}

startServer();
