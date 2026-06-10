/**
 * 展览相关 API 路由
 * 
 * 接口列表：
 * GET  /api/exhibitions          获取所有展览（附带气泡数量）
 * POST /api/exhibitions          创建新展览
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { Exhibition, CreateExhibitionRequest } from '../types';
import {
  getAllExhibitions,
  addExhibition,
  getBubbleCountForExhibition,
} from '../store/index.js';

const router = Router();

/**
 * GET /api/exhibitions
 * 获取所有展览列表
 * 返回数据附加 bubbleCount 字段供列表页显示
 */
router.get('/', (_req, res) => {
  try {
    const exhibitions = getAllExhibitions();
    const withBubbleCount = exhibitions.map(exh => ({
      ...exh,
      bubbleCount: getBubbleCountForExhibition(exh.id),
    }));
    res.json(withBubbleCount);
  } catch (err) {
    console.error('[Exhibitions] 获取列表失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * POST /api/exhibitions
 * 创建新展览
 * 请求体: { name, theme, images: [{url, description, position} }
 */
router.post('/', (req, res) => {
  try {
    const { name, theme, images } = req.body as CreateExhibitionRequest;

    // 基础校验
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: '展览名称不能为空' });
    }
    if (name.length > 20) {
      return res.status(400).json({ error: '展览名称最多20个字符' });
    }
    if (!['nostalgia', 'hope', 'sadness', 'ecstasy'].includes(theme)) {
      return res.status(400).json({ error: '无效的情感主题' });
    }
    if (!Array.isArray(images)) {
      return res.status(400).json({ error: '图片数据格式错误' });
    }
    if (images.length > 6) {
      return res.status(400).json({ error: '最多上传6张图片' });
    }

    // 构造展览对象，给每张图片分配唯一ID
    const exhibition: Exhibition = {
      id: uuidv4(),
      name: name.trim(),
      theme,
      images: images.map(img => ({
        id: uuidv4(),
        url: img.url,
        description: img.description || '',
        position: img.position,
      })),
      createdAt: new Date().toISOString(),
    };

    addExhibition(exhibition);
    res.status(201).json(exhibition);
  } catch (err) {
    console.error('[Exhibitions] 创建展览失败:', err);
    res.status(500).json({ error: '创建展览失败' });
  }
});

export default router;
