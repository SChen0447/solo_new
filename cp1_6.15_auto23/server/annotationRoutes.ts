import { Router, Request, Response } from 'express';
import type { Annotation, ApiResponse, LabelType } from '../shared/types.js';
import {
  createAnnotation,
  getAnnotationsByAudioId,
  updateAnnotation,
  deleteAnnotation,
  getAnnotationById,
} from './annotationService.js';

const router = Router();

interface CreateAnnotationBody {
  startTime: number;
  endTime: number;
  content: string;
  color: string;
  labelType: LabelType;
}

router.post('/', async (req: Request<{}, {}, CreateAnnotationBody & { audioId: string }>, res: Response<ApiResponse<Annotation>>) => {
  try {
    const { audioId, startTime, endTime, content, color, labelType } = req.body;

    if (!audioId || startTime === undefined || endTime === undefined || !content || !color || !labelType) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    if (startTime >= endTime) {
      return res.status(400).json({ success: false, error: '起始时间必须小于结束时间' });
    }

    const annotation = await createAnnotation(audioId, {
      startTime,
      endTime,
      content,
      color,
      labelType,
    });

    res.json({ success: true, data: annotation });
  } catch (error) {
    console.error('创建批注失败:', error);
    res.status(500).json({ success: false, error: '创建批注失败' });
  }
});

router.get('/:audioId', async (req: Request<{ audioId: string }>, res: Response<ApiResponse<Annotation[]>>) => {
  try {
    const { audioId } = req.params;
    const annotations = await getAnnotationsByAudioId(audioId);
    res.json({ success: true, data: annotations });
  } catch (error) {
    console.error('获取批注失败:', error);
    res.status(500).json({ success: false, error: '获取批注失败' });
  }
});

router.get('/:audioId/:id', async (req: Request<{ audioId: string; id: string }>, res: Response<ApiResponse<Annotation>>) => {
  try {
    const { audioId, id } = req.params;
    const annotation = await getAnnotationById(id, audioId);

    if (!annotation) {
      return res.status(404).json({ success: false, error: '批注不存在' });
    }

    res.json({ success: true, data: annotation });
  } catch (error) {
    console.error('获取批注失败:', error);
    res.status(500).json({ success: false, error: '获取批注失败' });
  }
});

router.put('/:id', async (req: Request<{ id: string }, {}, Partial<Annotation> & { audioId: string }>, res: Response<ApiResponse<Annotation>>) => {
  try {
    const { id } = req.params;
    const { audioId, ...updateData } = req.body;

    if (!audioId) {
      return res.status(400).json({ success: false, error: '缺少audioId参数' });
    }

    const annotation = await updateAnnotation(id, audioId, updateData);

    if (!annotation) {
      return res.status(404).json({ success: false, error: '批注不存在' });
    }

    res.json({ success: true, data: annotation });
  } catch (error) {
    console.error('更新批注失败:', error);
    res.status(500).json({ success: false, error: '更新批注失败' });
  }
});

router.delete('/:id', async (req: Request<{ id: string }, {}, { audioId: string }>, res: Response<ApiResponse<boolean>>) => {
  try {
    const { id } = req.params;
    const { audioId } = req.body;

    if (!audioId) {
      return res.status(400).json({ success: false, error: '缺少audioId参数' });
    }

    const deleted = await deleteAnnotation(id, audioId);

    if (!deleted) {
      return res.status(404).json({ success: false, error: '批注不存在' });
    }

    res.json({ success: true, data: true });
  } catch (error) {
    console.error('删除批注失败:', error);
    res.status(500).json({ success: false, error: '删除批注失败' });
  }
});

export default router;
