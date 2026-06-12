import express, { Request, Response } from 'express';
import { store } from './data';
import { FormTemplate, ReportData, QuestionStats } from '../shared/types';

const app = express();
const PORT = 3001;

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.post('/api/templates', (req: Request, res: Response) => {
  try {
    const { title, description, questions } = req.body;
    if (!title || !questions) {
      return res.status(400).json({ error: '标题和问题列表是必需的' });
    }
    const template = store.createTemplate({ title, description, questions });
    res.status(201).json(template);
  } catch (error) {
    res.status(500).json({ error: '创建模板失败' });
  }
});

app.get('/api/templates', (req: Request, res: Response) => {
  try {
    const templates = store.getAllTemplates();
    const templatesWithCount = templates.map((t) => ({
      ...t,
      responseCount: store.getResponseCount(t.id),
    }));
    res.json(templatesWithCount);
  } catch (error) {
    res.status(500).json({ error: '获取模板列表失败' });
  }
});

app.get('/api/templates/:id', (req: Request, res: Response) => {
  try {
    const template = store.getTemplate(req.params.id);
    if (!template) {
      return res.status(404).json({ error: '模板不存在' });
    }
    res.json(template);
  } catch (error) {
    res.status(500).json({ error: '获取模板失败' });
  }
});

app.put('/api/templates/:id', (req: Request, res: Response) => {
  try {
    const updated = store.updateTemplate(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: '模板不存在' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: '更新模板失败' });
  }
});

app.post('/api/responses', (req: Request, res: Response) => {
  try {
    const { templateId, answers } = req.body;
    if (!templateId || !answers) {
      return res.status(400).json({ error: '模板ID和答案是必需的' });
    }
    const response = store.addResponse(templateId, answers);
    if (!response) {
      return res.status(404).json({ error: '模板不存在' });
    }
    res.status(201).json(response);
  } catch (error) {
    res.status(500).json({ error: '提交响应失败' });
  }
});

app.get('/api/responses/:templateId', (req: Request, res: Response) => {
  try {
    const responses = store.getResponses(req.params.templateId);
    res.json(responses);
  } catch (error) {
    res.status(500).json({ error: '获取响应数据失败' });
  }
});

app.get('/api/reports/:templateId', (req: Request, res: Response) => {
  try {
    const templateId = req.params.templateId;
    const template = store.getTemplate(templateId);
    if (!template) {
      return res.status(404).json({ error: '模板不存在' });
    }
    const responses = store.getResponses(templateId);
    const stats: QuestionStats[] = template.questions.map((q) => {
      const stat: QuestionStats = {
        questionId: q.id,
        questionTitle: q.title,
        questionType: q.type,
        data: {},
      };

      switch (q.type) {
        case 'radio':
        case 'dropdown': {
          const counts: Record<string, number> = {};
          q.options?.forEach((o) => (counts[o.id] = 0));
          responses.forEach((r) => {
            const val = r.answers[q.id];
            if (val && counts[val] !== undefined) counts[val]++;
          });
          stat.data = {
            options: q.options?.map((o) => ({
              id: o.id,
              label: o.label,
              count: counts[o.id] || 0,
            })),
            total: responses.length,
          };
          break;
        }
        case 'checkbox': {
          const counts: Record<string, number> = {};
          q.options?.forEach((o) => (counts[o.id] = 0));
          responses.forEach((r) => {
            const vals: string[] = r.answers[q.id] || [];
            vals.forEach((v) => {
              if (counts[v] !== undefined) counts[v]++;
            });
          });
          stat.data = {
            options: q.options?.map((o) => ({
              id: o.id,
              label: o.label,
              count: counts[o.id] || 0,
            })),
            totalResponses: responses.length,
          };
          break;
        }
        case 'rating': {
          const max = q.ratingMax || 5;
          const distribution: number[] = new Array(max).fill(0);
          let sum = 0;
          let ratingCount = 0;
          responses.forEach((r) => {
            const val = r.answers[q.id];
            if (typeof val === 'number' && val >= 1 && val <= max) {
              distribution[val - 1]++;
              sum += val;
              ratingCount++;
            }
          });
          stat.data = {
            distribution: distribution.map((c, i) => ({
              rating: i + 1,
              count: c,
            })),
            average: ratingCount > 0 ? parseFloat((sum / ratingCount).toFixed(2)) : 0,
            total: ratingCount,
          };
          break;
        }
        case 'text': {
          stat.data = {
            answers: responses
              .map((r) => r.answers[q.id])
              .filter((a) => a && a.trim()),
            total: responses.length,
          };
          break;
        }
        case 'date': {
          const counts: Record<string, number> = {};
          responses.forEach((r) => {
            const val = r.answers[q.id];
            if (val) counts[val] = (counts[val] || 0) + 1;
          });
          stat.data = {
            dates: Object.entries(counts).map(([date, count]) => ({ date, count })),
            total: responses.length,
          };
          break;
        }
      }
      return stat;
    });

    const report: ReportData = {
      templateId,
      templateTitle: template.title,
      totalResponses: responses.length,
      stats,
    };
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: '生成报告失败' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
