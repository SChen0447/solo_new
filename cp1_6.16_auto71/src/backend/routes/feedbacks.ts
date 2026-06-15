import { Router, Request, Response } from 'express';
import {
  getFeedbacks,
  createFeedback,
  voteFeedback,
  updateFeedbackStatus,
  getCategoryStats,
  getDailyTrendStats,
  Category,
  Status
} from '../db';

const router = Router();

interface GetFeedbacksQuery {
  category?: string;
  status?: string;
  page?: string;
  pageSize?: string;
}

interface CreateFeedbackBody {
  title: string;
  description: string;
  category: Category;
}

router.get('/feedbacks', (req: Request<{}, {}, {}, GetFeedbacksQuery>, res: Response) => {
  const { category, status, page, pageSize } = req.query;
  
  const validCategories: Category[] = ['feature', 'bug', 'ux', 'other'];
  const validStatuses: Status[] = ['pending', 'processing', 'completed'];

  const parsedCategory = (category === 'all' || !category) ? 'all' : 
    (validCategories.includes(category as Category) ? category as Category : 'all');
  const parsedStatus = (status === 'all' || !status) ? 'all' : 
    (validStatuses.includes(status as Status) ? status as Status : 'all');

  const result = getFeedbacks({
    category: parsedCategory as Category | 'all',
    status: parsedStatus as Status | 'all',
    page: page ? parseInt(page, 10) : 1,
    pageSize: pageSize ? parseInt(pageSize, 10) : 10
  });

  res.json(result);
});

router.post('/feedbacks', (req: Request<{}, {}, CreateFeedbackBody>, res: Response) => {
  const { title, description, category } = req.body;

  if (!title || typeof title !== 'string' || title.length > 50) {
    return res.status(400).json({ error: '标题不能为空且不能超过50字符' });
  }
  if (!description || typeof description !== 'string' || description.length > 500) {
    return res.status(400).json({ error: '描述不能为空且不能超过500字符' });
  }

  const validCategories: Category[] = ['feature', 'bug', 'ux', 'other'];
  if (!validCategories.includes(category)) {
    return res.status(400).json({ error: '无效的类别' });
  }

  const feedback = createFeedback({ title, description, category });
  res.status(201).json(feedback);
});

router.post('/feedbacks/:id/vote', (req, res) => {
  const { id } = req.params;
  let voterId = req.headers['x-forwarded-for'] as string || req.ip || 'unknown';
  if (Array.isArray(voterId)) {
    voterId = voterId[0];
  }
  voterId = voterId.split(',')[0].trim();

  const result = voteFeedback(id, voterId);
  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }
  res.json({ votes: result.votes });
});

router.patch('/feedbacks/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body as { status: Status };

  const validStatuses: Status[] = ['pending', 'processing', 'completed'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: '无效的状态' });
  }

  const feedback = updateFeedbackStatus(id, status);
  if (!feedback) {
    return res.status(404).json({ error: '反馈不存在' });
  }
  res.json(feedback);
});

router.get('/stats/category', (_req, res) => {
  const stats = getCategoryStats();
  res.json(stats);
});

router.get('/stats/daily-trend', (req, res) => {
  const days = req.query.days ? parseInt(req.query.days as string, 10) : 7;
  const stats = getDailyTrendStats(days);
  res.json(stats);
});

export default router;
