/**
 * Express 服务器主入口文件
 * 
 * 启动流程：
 * 1. 加载依赖 → 2. loadFromDisk() 读取 data/data.json（文件持久化存储）
 * → 3. 配置中间件(CORS/JSON/静态资源) → 4. 挂载路由
 * → 5. 启动监听 3001 端口
 * 
 * 数据读写逻辑（文件持久化）：
 * - 启动时: store/loadFromDisk() 从 data/data.json 读取全部数据
 * - 写入时: 每个路由处理器调用 addExhibition()/addBubble()
 *            → 内部先更新内存 → 再 saveToDisk() 同步写文件
 * - 优势: 服务器重启数据不丢失，无需额外数据库
 * 
 * 前端调用关系：
 * - Vite dev server (5173端口) 通过 proxy 转发 /api 和 /uploads 到这里
 * - src/api/client.ts → fetch/XHR → 各路由
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import exhibitionsRouter from './routes/exhibitions.js';
import uploadRouter from './routes/upload.js';
import bubblesRouter from './routes/bubbles.js';
import { loadFromDisk } from './store/index.js';
import { UPLOAD_DIR } from './middleware/multer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// ============================================================
// 1. 启动时加载持久化数据（从data/data.json → 内存）
// ============================================================
loadFromDisk();

// ============================================================
// 2. 全局中间件
// ============================================================
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 静态资源：上传的图片通过 /uploads/xxx.jpg 访问
app.use('/uploads', express.static(UPLOAD_DIR));

// ============================================================
// 3. 挂载路由
// ============================================================

/**
 * 展览管理：列表获取/创建 */
app.use('/api/exhibitions', exhibitionsRouter);

/**
 * 图片上传：multer处理，返回图片存储到uploads/ */
app.use('/api/upload', uploadRouter);

/**
 * 记忆气泡：获取指定展览气泡/保存新气泡 */
app.use('/api/bubbles', bubblesRouter);

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ============================================================
// 4. 启动服务器
// ============================================================
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════╗
║   🖼️  记忆走廊 Memory Corridor   ║
║   后端服务器已启动                     ║
║   端口: ${PORT}                         ║
║   前端地址: http://localhost:${PORT}         ║
╚══════════════════════════════════════╝
  `);
});
