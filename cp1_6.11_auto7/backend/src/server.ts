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

function withTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  ms: number,
  operation: string
): Promise<T> {
  const controller = new AbortController();
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      controller.abort();
      reject(new Error(`${operation} 超时 (${ms}ms)`));
    }, ms);
    fn(controller.signal)
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

app.post('/api/surveys', async (req: Request, res: Response) => {
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
    const result = await withTimeout(
      (signal) =>
        createSurvey(
          {
            title: title.trim(),
            questions: questions.map((q: Omit<Question, 'id'>) => ({
              type: q.type,
              title: q.title.trim(),
              options: q.options,
              required: q.required,
            })),
          },
          signal
        ),
      SHARE_LINK_SLA_MS,
      '创建问卷'
    );

    const elapsed = Date.now() - startTime;

    if (elapsed > SHARE_LINK_SLA_MS) {
      console.warn(`[PERF] 分享链接生成超出 SLA: ${elapsed}ms (目标: ${SHARE_LINK_SLA_MS}ms)`);
    }

    res.json({
      ...result.survey,
      shareLinkGeneratedMs: elapsed,
      tokenGenerateMs: result.perf.generateTokenMs,
      lockWaitMs: result.perf.lockWaitMs,
      meetsSla: elapsed <= SHARE_LINK_SLA_MS,
      slaTarget: SHARE_LINK_SLA_MS,
    });
  } catch (error: any) {
    if (error.message && error.message.includes('超时')) {
      return res.status(504).json({ error: error.message, slaTarget: SHARE_LINK_SLA_MS });
    }
    res.status(500).json({ error: error.message || '创建问卷失败' });
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

app.put('/api/surveys/:id', async (req: Request, res: Response) => {
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

  try {
    const updated = await withTimeout(
      (signal) => updateSurvey(id, updates, signal),
      300,
      '更新问卷'
    );
    if (!updated) {
      return res.status(404).json({ error: '问卷不存在或已被删除' });
    }
    res.json(updated);
  } catch (error: any) {
    if (error.message && error.message.includes('超时')) {
      return res.status(504).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || '更新问卷失败' });
  }
});

app.delete('/api/surveys/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const deleted = await withTimeout(
      (signal) => deleteSurvey(id, signal),
      300,
      '删除问卷'
    );
    if (!deleted) {
      return res.status(404).json({ error: '问卷不存在' });
    }
    res.json({ success: true });
  } catch (error: any) {
    if (error.message && error.message.includes('超时')) {
      return res.status(504).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || '删除失败' });
  }
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

app.post('/api/surveys/:id/responses', async (req: Request, res: Response) => {
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

  try {
    const response = await withTimeout(
      (signal) => submitResponse(id, answers, signal),
      300,
      '提交回复'
    );
    if (!response) {
      return res.status(500).json({ error: '提交回复失败，可能已达到回复上限' });
    }
    res.json({ success: true, responseId: response.id });
  } catch (error: any) {
    if (error.message && error.message.includes('超时')) {
      return res.status(504).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || '提交失败' });
  }
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
