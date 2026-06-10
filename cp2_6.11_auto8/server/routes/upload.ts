/**
 * 图片上传 API 路由
 * 
 * 接口列表：
 * POST /api/upload   上传单张图片
 * 
 * 错误处理：
 * - 超过2MB：返回413错误 + 错误信息（前端据此触发按钮抖动+红色提示条）
 * - 格式错误：返回400错误
 * 
 * 前端调用方：src/api/client.ts (uploadImageWithProgress)
 * 使用XMLHttpRequest监听progress事件，触发进度条更新
 */

import { Router } from 'express';
import { upload } from '../middleware/multer.js';

const router = Router();

/**
 * POST /api/upload
 * 上传单张图片
 * Content-Type: multipart/form-data
 * field name: "image"
 */
router.post('/', (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      console.error('[Upload] 上传错误:', err.message);
      // 文件大小超限
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: '图片大小不能超过 2MB' });
      }
      // 格式错误或其他
      return res.status(400).json({ error: err.message || '上传失败' });
    }

    if (!req.file) {
      return res.status(400).json({ error: '未选择图片' });
    }

    // 返回可访问的URL路径
    // 通过 Express.static 中间件挂载 uploads 目录为 /uploads
    const fileUrl = `/uploads/${req.file.filename}`;

    res.json({
      url: fileUrl,
      filename: req.file.filename,
    });
  });
});

export default router;
