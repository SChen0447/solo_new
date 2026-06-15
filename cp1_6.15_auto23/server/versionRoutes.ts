import { Router, Request, Response } from 'express';
import type { AnnotationVersion, VersionDiff, ApiResponse, Annotation } from '../shared/types.js';
import {
  createVersion,
  getVersionsByAudioId,
  getVersionById,
  compareVersions,
  deleteVersion,
} from './versionService.js';

const router = Router();

interface CreateVersionBody {
  audioId: string;
  annotations: Annotation[];
  description?: string;
}

router.post('/', async (req: Request<{}, {}, CreateVersionBody>, res: Response<ApiResponse<AnnotationVersion>>) => {
  try {
    const { audioId, annotations, description } = req.body;

    if (!audioId || !annotations) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    const version = await createVersion(audioId, annotations, description);
    res.json({ success: true, data: version });
  } catch (error) {
    console.error('创建版本失败:', error);
    res.status(500).json({ success: false, error: '创建版本失败' });
  }
});

router.get('/:audioId', async (req: Request<{ audioId: string }>, res: Response<ApiResponse<AnnotationVersion[]>>) => {
  try {
    const { audioId } = req.params;
    const versions = await getVersionsByAudioId(audioId);
    res.json({ success: true, data: versions });
  } catch (error) {
    console.error('获取版本列表失败:', error);
    res.status(500).json({ success: false, error: '获取版本列表失败' });
  }
});

router.get('/detail/:id', async (req: Request<{ id: string }, {}, {}, { audioId: string }>, res: Response<ApiResponse<AnnotationVersion>>) => {
  try {
    const { id } = req.params;
    const { audioId } = req.query;

    if (!audioId) {
      return res.status(400).json({ success: false, error: '缺少audioId参数' });
    }

    const version = await getVersionById(id, audioId as string);

    if (!version) {
      return res.status(404).json({ success: false, error: '版本不存在' });
    }

    res.json({ success: true, data: version });
  } catch (error) {
    console.error('获取版本详情失败:', error);
    res.status(500).json({ success: false, error: '获取版本详情失败' });
  }
});

router.get('/compare', async (
  req: Request<{}, {}, {}, { baseId: string; compareId: string; audioId: string }>,
  res: Response<ApiResponse<VersionDiff>>
) => {
  try {
    const { baseId, compareId, audioId } = req.query;

    if (!baseId || !compareId || !audioId) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    const baseVersion = await getVersionById(baseId as string, audioId as string);
    const compareVersion = await getVersionById(compareId as string, audioId as string);

    if (!baseVersion || !compareVersion) {
      return res.status(404).json({ success: false, error: '版本不存在' });
    }

    const diff = compareVersions(baseVersion, compareVersion);
    res.json({ success: true, data: diff });
  } catch (error) {
    console.error('版本对比失败:', error);
    res.status(500).json({ success: false, error: '版本对比失败' });
  }
});

router.delete('/:id', async (req: Request<{ id: string }, {}, { audioId: string }>, res: Response<ApiResponse<boolean>>) => {
  try {
    const { id } = req.params;
    const { audioId } = req.body;

    if (!audioId) {
      return res.status(400).json({ success: false, error: '缺少audioId参数' });
    }

    const deleted = await deleteVersion(id, audioId);

    if (!deleted) {
      return res.status(404).json({ success: false, error: '版本不存在' });
    }

    res.json({ success: true, data: true });
  } catch (error) {
    console.error('删除版本失败:', error);
    res.status(500).json({ success: false, error: '删除版本失败' });
  }
});

export default router;
