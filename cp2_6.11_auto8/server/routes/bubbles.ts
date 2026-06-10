/**
 * 记忆气泡 API 路由
 * 
 * 接口列表：
 * GET  /api/bubbles/:exhibitionId   获取指定展览的所有气泡
 * POST /api/bubbles                保存一个新气泡
 * 
 * 前端调用方：
 * - 进入展览浏览页时 → GET 加载已有气泡
 * - 用户创建气泡并提交 → POST 保存气泡
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { Bubble, SaveBubbleRequest } from '../types';
import { getBubblesByExhibitionId, addBubble } from '../store/index.js';
import { getExhibitionById } from '../store/index.js';

const router = Router();

/**
 * GET /api/bubbles/:exhibitionId
 * 获取指定展览的所有气泡
 */
router.get('/:exhibitionId', (req, res) => {
  try {
    const { exhibitionId } = req.params;
    const bubbles = getBubblesByExhibitionId(exhibitionId);
    res.json(bubbles);
  } catch (err) {
    console.error('[Bubbles] 获取气泡失败:', err);
    res.status(500).json({ error: '获取气泡失败' });
  }
});

/**
 * POST /api/bubbles
 * 保存一个新气泡
 * 请求体: { exhibitionId, x, y, text }
 */
router.post('/', (req, res) => {
  try {
    const { exhibitionId, x, y, text } = req.body as SaveBubbleRequest;

    // 校验展览是否存在
    const exhibition = getExhibitionById(exhibitionId);
    if (!exhibition) {
      return res.status(404).json({ error: '展览不存在' });
    }

    if (typeof x !== 'number' || typeof y !== 'number') {
      return res.status(400).json({ error: '无效的坐标' });
    }
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: '气泡内容不能为空' });
    }
    if (text.length > 50) {
      return res.status(400).json({ error: '气泡内容最多50个字符' });
    }

    const bubble: Bubble = {
      id: uuidv4(),
      exhibitionId,
      x,
      y,
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };

    addBubble(bubble);
    res.status(201).json(bubble);
  } catch (err) {
    console.error('[Bubbles] 保存气泡失败:', err);
    res.status(500).json({ error: '保存气泡失败' });
  }
});

export default router;
