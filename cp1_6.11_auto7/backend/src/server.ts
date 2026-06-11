import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import {
  createSurvey,
  getSurveyById,
  getSurveyByShareToken,
  getAllSurveys,
  getSurveyCount,
  updateSurvey,
  deleteSurvey,
  submitResponse,
  getResponsesBySurveyId,
  getSurveyStatistics,
  getPerfStats,
  Question,
} from './dataStore';

const app = express();
const PORT = 3002;
const SHARE_LINK_SLA_MS = 200;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 200) {
      console.warn(`[SLOW] ${req.method} ${req.path} - ${duration}ms`);
    }
  });
  next();
});

function withTimeout<T>(promise: Promise<T>, ms: number, operation: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`${operation} 超时 (${ms}ms)`));
    }, ms);
    promise
      .then((result) => {
        clearTimeout(timeout);
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timeout);
        reject(err);
      });
  });
}

app.get('/api/surveys', (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 50;
  const all = getAllSurveys();
  const start = (page - 1) * pageSize;
  const paged = all.slice(start, start + pageSize);
  res.json({
    total: all.length,
    page,
    pageSize,
    data: paged,
  });
});

app.post('/api/surveys', (req: Request, res: Response) => {
  const { title, questions } = req.body;

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({ error: '问卷标题不能为空' });
  }

  if (!Array.isArray(questions) || questions.length < 5) {
    return res.status(400).json({ error: '问卷至少需要5个问题' });
  }

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q.type || !['single', 'multiple', 'text'].includes(q.type)) {
      return res.status(400).json({ error: `第 ${i + 1} 个问题类型无效` });
    }
    if (!q.title || typeof q.title !== 'string' || q.title.trim().length === 0) {
      return res.status(400).json({ error: `第 ${i + 1} 个问题标题不能为空` });
    }
    if ((q.type === 'single' || q.type === 'multiple') && (!Array.isArray(q.options) || q.options.length < 2)) {
      return res.status(400).json({ error: `第 ${i + 1} 个问题至少需要2个选项` });
    }
  }

  const startTime = Date.now();

  try {
    const result = createSurvey({
      title: title.trim(),
      questions: questions.map((q: Omit<Question, 'id'>) => ({
        type: q.type,
        title: q.title.trim(),
        options: q.options,
        required: q.required,
      })),
    });

    const elapsed = Date.now() - startTime;

    if (elapsed > SHARE_LINK_SLA_MS) {
      console.warn(`[PERF] 分享链接生成超出 SLA: ${elapsed}ms (目标: ${SHARE_LINK_SLA_MS}ms)`);
    }

    res.json({
      ...result.survey,
      shareLinkGeneratedMs: elapsed,
      tokenGenerateMs: result.perf.generateTokenMs,
      meetsSla: elapsed <= SHARE_LINK_SLA_MS,
      slaTarget: SHARE_LINK_SLA_MS,
    });
  } catch (error) {
    res.status(500).json({ error: '创建问卷失败' });
  }
});

app.get('/api/surveys/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const survey = getSurveyById(id);
  if (!survey) {
    return res.status(404).json({ error: '问卷不存在' });
  }
  res.json(survey);
});

app.put('/api/surveys/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, questions } = req.body;

  const existing = getSurveyById(id);
  if (!existing) {
    return res.status(404).json({ error: '问卷不存在' });
  }

  if (title !== undefined && (typeof title !== 'string' || title.trim().length === 0)) {
    return res.status(400).json({ error: '问卷标题不能为空' });
  }

  if (questions !== undefined) {
    if (!Array.isArray(questions) || questions.length < 5) {
      return res.status(400).json({ error: '问卷至少需要5个问题' });
    }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.type || !['single', 'multiple', 'text'].includes(q.type)) {
        return res.status(400).json({ error: `第 ${i + 1} 个问题类型无效` });
      }
      if (!q.title || typeof q.title !== 'string' || q.title.trim().length === 0) {
        return res.status(400).json({ error: `第 ${i + 1} 个问题标题不能为空` });
      }
      if ((q.type === 'single' || q.type === 'multiple') && (!Array.isArray(q.options) || q.options.length < 2)) {
        return res.status(400).json({ error: `第 ${i + 1} 个问题至少需要2个选项` });
      }
    }
  }

  const updates: Partial<{ title: string; questions: Question[]; responseCount: number }> = {};
  if (title) updates.title = title.trim();
  if (questions) {
    updates.questions = questions.map((q: Question) => ({
      id: q.id || Date.now().toString() + Math.random().toString(36).slice(2, 8),
      type: q.type,
      title: q.title.trim(),
      options: q.options,
      required: q.required,
    }));
  }

  const updated = updateSurvey(id, updates);
  if (!updated) {
    return res.status(500).json({ error: '更新问卷失败' });
  }
  res.json(updated);
});

app.delete('/api/surveys/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const deleted = deleteSurvey(id);
  if (!deleted) {
    return res.status(404).json({ error: '问卷不存在' });
  }
  res.json({ success: true });
});

app.get('/api/share/:token', (req: Request, res: Response) => {
  const startTime = Date.now();
  const { token } = req.params;
  const survey = getSurveyByShareToken(token);

  const elapsed = Date.now() - startTime;
  if (elapsed > 50) {
    console.warn(`[PERF] 分享 token 查找较慢: ${elapsed}ms`);
  }

  if (!survey) {
    return res.status(404).json({ error: '问卷不存在或已被删除' });
  }
  res.json(survey);
});

app.post('/api/surveys/:id/responses', (req: Request, res: Response) => {
  const { id } = req.params;
  const { answers } = req.body;

  const survey = getSurveyById(id);
  if (!survey) {
    return res.status(404).json({ error: '问卷不存在' });
  }

  if (!Array.isArray(answers)) {
    return res.status(400).json({ error: '答案格式无效' });
  }

  for (const question of survey.questions) {
    if (question.required) {
      const answer = answers.find((a: any) => a.questionId === question.id);
      if (!answer) {
        return res.status(400).json({ error: `必填问题未回答: ${question.title}` });
      }
      const value = answer.value;
      if (question.type === 'text') {
        if (typeof value !== 'string' || value.trim().length === 0) {
          return res.status(400).json({ error: `必填问题未回答: ${question.title}` });
        }
      } else {
        if (Array.isArray(value) ? value.length === 0 : !value) {
          return res.status(400).json({ error: `必填问题未回答: ${question.title}` });
        }
      }
    }
  }

  const response = submitResponse(id, answers);
  if (!response) {
    return res.status(500).json({ error: '提交回复失败，可能已达到回复上限' });
  }
  res.json({ success: true, responseId: response.id });
});

app.get('/api/surveys/:id/responses', (req: Request, res: Response) => {
  const { id } = req.params;
  const survey = getSurveyById(id);
  if (!survey) {
    return res.status(404).json({ error: '问卷不存在' });
  }
  const responses = getResponsesBySurveyId(id);
  res.json({
    survey,
    responses,
  });
});

app.get('/api/surveys/:id/statistics', (req: Request, res: Response) => {
  const { id } = req.params;
  const survey = getSurveyById(id);
  if (!survey) {
    return res.status(404).json({ error: '问卷不存在' });
  }
  const stats = getSurveyStatistics(id);
  res.json({
    survey,
    statistics: stats,
    totalResponses: survey.responseCount,
  });
});

app.get('/api/perf/stats', (_req: Request, res: Response) => {
  res.json(getPerfStats());
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    surveyCount: getSurveyCount(),
  });
});

app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
  console.log(`API base: http://localhost:${PORT}/api`);
  console.log(`Share link SLA: ${SHARE_LINK_SLA_MS}ms`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
