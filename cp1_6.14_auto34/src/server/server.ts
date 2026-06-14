import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import type { Assignment, Annotation, Submission, ScoringDimension } from '../types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'assignments.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const defaultScoringDimensions: Omit<ScoringDimension, 'score'>[] = [
  { id: 'completeness', name: '内容完整性', maxScore: 30 },
  { id: 'logic', name: '逻辑清晰度', maxScore: 25 },
  { id: 'grammar', name: '语法规范性', maxScore: 25 },
  { id: 'innovation', name: '创新性', maxScore: 20 }
];

const createInitialData = (): Assignment[] => {
  const sampleContent = `本文旨在探讨人工智能在教育领域的应用前景。
随着科技的飞速发展，AI技术已经深入到我们生活的方方面面。

在教育领域，人工智能可以帮助教师更高效地批改作业，
为学生提供个性化的学习方案。通过智能分析系统，
我们能够准确识别学生的薄弱环节，并有针对性地进行辅导。

未来的教育将更加注重因材施教，
让每个学生都能发挥自己的最大潜能。
人工智能将成为教育改革的重要推动力，
为构建更加公平、高效的教育体系贡献力量。

让我们共同期待这一天的到来，
用科技的力量点亮每一个孩子的未来。`;

  return [
    {
      id: uuidv4(),
      title: '人工智能与教育的未来',
      description: '撰写一篇关于AI在教育领域应用的议论文，不少于500字',
      dueDate: '2026-06-30',
      maxScore: 100,
      scoringDimensions: defaultScoringDimensions,
      createdAt: new Date().toISOString(),
      submissions: [
        {
          id: uuidv4(),
          assignmentId: '',
          studentId: 's001',
          studentName: '张三',
          content: sampleContent,
          submittedAt: new Date().toISOString(),
          scores: defaultScoringDimensions.map(d => ({ ...d, score: 0 })),
          annotations: [],
          status: 'submitted'
        },
        {
          id: uuidv4(),
          assignmentId: '',
          studentId: 's002',
          studentName: '李四',
          content: sampleContent + '\n\n这是我对AI教育的一些补充思考...',
          submittedAt: new Date().toISOString(),
          scores: defaultScoringDimensions.map(d => ({ ...d, score: 0 })),
          annotations: [],
          status: 'submitted'
        }
      ]
    }
  ].map(a => ({
    ...a,
    submissions: a.submissions.map(s => ({ ...s, assignmentId: a.id }))
  }));
};

const readData = (): Assignment[] => {
  if (!fs.existsSync(DATA_FILE)) {
    const initial = createInitialData();
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw) as Assignment[];
  } catch {
    const initial = createInitialData();
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
};

const writeData = (data: Assignment[]) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
};

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/api/assignments', (_req: Request, res: Response) => {
  const data = readData();
  res.json(data);
});

app.get('/api/assignments/:id', (req: Request, res: Response) => {
  const data = readData();
  const assignment = data.find(a => a.id === req.params.id);
  if (!assignment) {
    return res.status(404).json({ error: '作业不存在' });
  }
  res.json(assignment);
});

app.post('/api/assignments', (req: Request, res: Response) => {
  const { title, description, dueDate, maxScore } = req.body;
  if (!title || !dueDate) {
    return res.status(400).json({ error: '标题和截止日期是必填项' });
  }
  const data = readData();
  const newAssignment: Assignment = {
    id: uuidv4(),
    title,
    description: description || '',
    dueDate,
    maxScore: maxScore || 100,
    scoringDimensions: defaultScoringDimensions,
    submissions: [],
    createdAt: new Date().toISOString()
  };
  data.unshift(newAssignment);
  writeData(data);
  res.status(201).json(newAssignment);
});

app.get('/api/assignments/:assignmentId/submissions/:submissionId', (req: Request, res: Response) => {
  const data = readData();
  const assignment = data.find(a => a.id === req.params.assignmentId);
  if (!assignment) {
    return res.status(404).json({ error: '作业不存在' });
  }
  const submission = assignment.submissions.find(s => s.id === req.params.submissionId);
  if (!submission) {
    return res.status(404).json({ error: '提交不存在' });
  }
  res.json(submission);
});

app.post('/api/assignments/:assignmentId/submissions', (req: Request, res: Response) => {
  const { studentId, studentName, content } = req.body;
  if (!studentId || !studentName || !content) {
    return res.status(400).json({ error: '学生信息和内容是必填项' });
  }
  if (content.length > 5000) {
    return res.status(400).json({ error: '内容不能超过5000字' });
  }
  const data = readData();
  const assignmentIdx = data.findIndex(a => a.id === req.params.assignmentId);
  if (assignmentIdx === -1) {
    return res.status(404).json({ error: '作业不存在' });
  }
  const newSubmission: Submission = {
    id: uuidv4(),
    assignmentId: req.params.assignmentId,
    studentId,
    studentName,
    content,
    submittedAt: new Date().toISOString(),
    scores: data[assignmentIdx].scoringDimensions.map(d => ({ ...d, score: 0 })),
    annotations: [],
    status: 'submitted'
  };
  data[assignmentIdx].submissions.push(newSubmission);
  writeData(data);
  res.status(201).json(newSubmission);
});

app.post('/api/annotations', (req: Request, res: Response) => {
  const { assignmentId, submissionId, startIndex, endIndex, text, comment } = req.body;
  if (!assignmentId || !submissionId || startIndex === undefined || endIndex === undefined || !comment) {
    return res.status(400).json({ error: '批注信息不完整' });
  }
  const data = readData();
  const assignmentIdx = data.findIndex(a => a.id === assignmentId);
  if (assignmentIdx === -1) {
    return res.status(404).json({ error: '作业不存在' });
  }
  const submissionIdx = data[assignmentIdx].submissions.findIndex(s => s.id === submissionId);
  if (submissionIdx === -1) {
    return res.status(404).json({ error: '提交不存在' });
  }
  const newAnnotation: Annotation = {
    id: uuidv4(),
    assignmentId,
    submissionId,
    startIndex,
    endIndex,
    text: text || '',
    comment,
    createdAt: new Date().toISOString()
  };
  data[assignmentIdx].submissions[submissionIdx].annotations.push(newAnnotation);
  writeData(data);
  res.status(201).json(newAnnotation);
});

app.delete('/api/annotations/:id', (req: Request, res: Response) => {
  const data = readData();
  for (const assignment of data) {
    for (const submission of assignment.submissions) {
      const annIdx = submission.annotations.findIndex(a => a.id === req.params.id);
      if (annIdx !== -1) {
        submission.annotations.splice(annIdx, 1);
        writeData(data);
        return res.json({ success: true });
      }
    }
  }
  res.status(404).json({ error: '批注不存在' });
});

app.put('/api/submissions/:submissionId/scores', (req: Request, res: Response) => {
  const { scores } = req.body;
  if (!scores || !Array.isArray(scores)) {
    return res.status(400).json({ error: '评分数据无效' });
  }
  const data = readData();
  for (const assignment of data) {
    const subIdx = assignment.submissions.findIndex(s => s.id === req.params.submissionId);
    if (subIdx !== -1) {
      assignment.submissions[subIdx].scores = scores;
      const total = scores.reduce((sum: number, s: ScoringDimension) => sum + s.score, 0);
      if (total <= 100) {
        assignment.submissions[subIdx].status = 'graded';
      }
      writeData(data);
      return res.json({ submission: assignment.submissions[subIdx], total });
    }
  }
  res.status(404).json({ error: '提交不存在' });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Assignment grading API running on http://localhost:${PORT}`);
});
