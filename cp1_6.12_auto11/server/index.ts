import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import type { Survey, Question, Answer, AnswerSubmission } from '../src/types';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

interface DataStore {
  surveys: Map<string, Survey>;
  answers: Map<string, Answer[]>;
}

const store: DataStore = {
  surveys: new Map(),
  answers: new Map(),
};

const initialSurveys: Survey[] = [
  {
    id: 'demo-1',
    title: '用户满意度调查',
    description: '感谢您参与本次调查，帮助我们改进产品体验',
    questions: [
      {
        id: 'q1',
        type: 'single',
        title: '您的性别是？',
        options: ['男', '女', '其他'],
        required: true,
        order: 0,
      },
      {
        id: 'q2',
        type: 'rating',
        title: '您对产品的整体满意度评分',
        required: true,
        order: 1,
      },
      {
        id: 'q3',
        type: 'multiple',
        title: '您使用过我们的哪些功能？（可多选）',
        options: ['问卷设计', '数据收集', '统计分析', '数据导出'],
        required: false,
        order: 2,
      },
      {
        id: 'q4',
        type: 'text',
        title: '您对我们有什么建议？',
        required: false,
        order: 3,
      },
    ],
    createdAt: Date.now(),
  },
];

initialSurveys.forEach((survey) => {
  store.surveys.set(survey.id, survey);
  store.answers.set(survey.id, []);
});

const sampleAnswers: Answer[] = [
  { id: 'a1', surveyId: 'demo-1', questionId: 'q1', value: '男', submittedAt: Date.now() },
  { id: 'a2', surveyId: 'demo-1', questionId: 'q2', value: 5, submittedAt: Date.now() },
  { id: 'a3', surveyId: 'demo-1', questionId: 'q3', value: ['问卷设计', '数据收集'], submittedAt: Date.now() },
  { id: 'a4', surveyId: 'demo-1', questionId: 'q4', value: '界面很友好，继续加油！', submittedAt: Date.now() },
  { id: 'a5', surveyId: 'demo-1', questionId: 'q1', value: '女', submittedAt: Date.now() },
  { id: 'a6', surveyId: 'demo-1', questionId: 'q2', value: 4, submittedAt: Date.now() },
  { id: 'a7', surveyId: 'demo-1', questionId: 'q3', value: ['统计分析'], submittedAt: Date.now() },
  { id: 'a8', surveyId: 'demo-1', questionId: 'q1', value: '男', submittedAt: Date.now() },
  { id: 'a9', surveyId: 'demo-1', questionId: 'q2', value: 5, submittedAt: Date.now() },
  { id: 'a10', surveyId: 'demo-1', questionId: 'q3', value: ['问卷设计', '统计分析', '数据导出'], submittedAt: Date.now() },
];

store.answers.set('demo-1', sampleAnswers);

app.get('/api/surveys', (_req: Request, res: Response) => {
  const surveys = Array.from(store.surveys.values());
  res.json(surveys);
});

app.get('/api/surveys/:id', (req: Request, res: Response) => {
  const survey = store.surveys.get(req.params.id);
  if (!survey) {
    return res.status(404).json({ error: '问卷不存在' });
  }
  res.json(survey);
});

app.post('/api/surveys', (req: Request, res: Response) => {
  const { title, description } = req.body;
  if (!title) {
    return res.status(400).json({ error: '问卷标题不能为空' });
  }
  const survey: Survey = {
    id: uuidv4(),
    title,
    description: description || '',
    questions: [],
    createdAt: Date.now(),
  };
  store.surveys.set(survey.id, survey);
  store.answers.set(survey.id, []);
  res.status(201).json(survey);
});

app.put('/api/surveys/:id', (req: Request, res: Response) => {
  const existing = store.surveys.get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: '问卷不存在' });
  }
  const updated: Survey = {
    ...existing,
    ...req.body,
    id: req.params.id,
    questions: (req.body.questions || existing.questions).map((q: Question, idx: number) => ({
      ...q,
      order: idx,
    })),
  };
  store.surveys.set(req.params.id, updated);
  res.json(updated);
});

app.delete('/api/surveys/:id', (req: Request, res: Response) => {
  const deleted = store.surveys.delete(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: '问卷不存在' });
  }
  store.answers.delete(req.params.id);
  res.json({ success: true });
});

app.post('/api/answers', (req: Request, res: Response) => {
  const submission: AnswerSubmission = req.body;
  const survey = store.surveys.get(submission.surveyId);
  if (!survey) {
    return res.status(404).json({ error: '问卷不存在' });
  }
  const now = Date.now();
  const newAnswers: Answer[] = submission.answers.map((a) => ({
    id: uuidv4(),
    surveyId: submission.surveyId,
    questionId: a.questionId,
    value: a.value,
    submittedAt: now,
  }));
  const existing = store.answers.get(submission.surveyId) || [];
  store.answers.set(submission.surveyId, [...existing, ...newAnswers]);
  res.status(201).json({ success: true });
});

app.get('/api/answers/:surveyId', (req: Request, res: Response) => {
  const answers = store.answers.get(req.params.surveyId) || [];
  res.json(answers);
});

app.get('/api/export/:surveyId', (req: Request, res: Response) => {
  const survey = store.surveys.get(req.params.surveyId);
  if (!survey) {
    return res.status(404).json({ error: '问卷不存在' });
  }
  const answers = store.answers.get(req.params.surveyId) || [];
  const exportData = {
    survey,
    answers,
    exportedAt: Date.now(),
  };
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${survey.title}-export.json"`);
  res.json(exportData);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
