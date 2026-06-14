import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const dataDir = join(__dirname, '..', 'src', 'data');
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const classesPath = join(dataDir, 'classes.json');
const submissionsPath = join(dataDir, 'submissions.json');

const readJSON = (path) => {
  try {
    const raw = readFileSync(path, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

const writeJSON = (path, data) => {
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
};

app.get('/api/classes', (_req, res) => {
  const classes = readJSON(classesPath);
  res.json(classes);
});

app.post('/api/classes', (req, res) => {
  const { name, grade, subject } = req.body;
  if (!name || !grade || !subject) {
    return res.status(400).json({ error: '班级名称、年级、科目不能为空' });
  }
  const classes = readJSON(classesPath);
  const newClass = {
    id: uuidv4(),
    name,
    grade,
    subject,
    studentCount: 30,
    homeworkIds: [],
    createdAt: new Date().toISOString()
  };
  classes.push(newClass);
  writeJSON(classesPath, classes);
  res.status(201).json(newClass);
});

app.get('/api/classes/:id/homework', (req, res) => {
  const { id } = req.params;
  const classes = readJSON(classesPath);
  const targetClass = classes.find((c) => c.id === id);
  if (!targetClass) {
    return res.status(404).json({ error: '班级不存在' });
  }
  const allHomework = classes.flatMap((c) => c.homework || []);
  const classHomework = allHomework.filter(
    (hw) => targetClass.homeworkIds.includes(hw.id)
  );
  res.json(classHomework);
});

app.post('/api/homework', (req, res) => {
  const { classId, name, deadline, totalScore, questions } = req.body;
  if (!classId || !name || !questions || questions.length === 0) {
    return res.status(400).json({ error: '作业信息不完整' });
  }
  const classes = readJSON(classesPath);
  const targetClass = classes.find((c) => c.id === classId);
  if (!targetClass) {
    return res.status(404).json({ error: '班级不存在' });
  }
  const newHomework = {
    id: uuidv4(),
    classId,
    name,
    deadline,
    totalScore: totalScore || questions.reduce((acc, q) => acc + (q.score || 0), 0),
    questions: questions.map((q) => ({
      id: uuidv4(),
      ...q
    })),
    createdAt: new Date().toISOString()
  };
  targetClass.homework = targetClass.homework || [];
  targetClass.homework.push(newHomework);
  targetClass.homeworkIds.push(newHomework.id);
  writeJSON(classesPath, classes);
  res.status(201).json(newHomework);
});

app.post('/api/homework/:id/submit', (req, res) => {
  const { id } = req.params;
  const { answers, studentName } = req.body;
  if (!answers) {
    return res.status(400).json({ error: '答案不能为空' });
  }

  const classes = readJSON(classesPath);
  let targetHomework = null;
  for (const c of classes) {
    const hw = (c.homework || []).find((h) => h.id === id);
    if (hw) {
      targetHomework = hw;
      break;
    }
  }
  if (!targetHomework) {
    return res.status(404).json({ error: '作业不存在' });
  }

  const gradedAnswers = {};
  let autoScore = 0;

  targetHomework.questions.forEach((q) => {
    const userAnswer = answers[q.id];
    if (q.type === 'single' || q.type === 'multiple') {
      const correct =
        q.type === 'single'
          ? userAnswer === q.correctAnswer
          : JSON.stringify([...(userAnswer || [])].sort()) ===
            JSON.stringify([...q.correctAnswer].sort());
      gradedAnswers[q.id] = {
        userAnswer,
        correct,
        score: correct ? q.score : 0,
        status: 'graded'
      };
      if (correct) autoScore += q.score;
    } else {
      gradedAnswers[q.id] = {
        userAnswer,
        correct: null,
        score: null,
        status: 'pending'
      };
    }
  });

  const submissions = readJSON(submissionsPath);
  const submission = {
    id: uuidv4(),
    homeworkId: id,
    studentName: studentName || '匿名学生',
    answers: gradedAnswers,
    autoScore,
    finalScore: null,
    submittedAt: new Date().toISOString()
  };
  submissions.push(submission);
  writeJSON(submissionsPath, submissions);

  res.status(201).json(submission);
});

app.get('/api/homework/:id/result', (req, res) => {
  const { id } = req.params;
  const submissions = readJSON(submissionsPath);
  const hwSubmissions = submissions.filter((s) => s.homeworkId === id);
  res.json(hwSubmissions);
});

app.get('/api/homework/:id', (req, res) => {
  const { id } = req.params;
  const classes = readJSON(classesPath);
  for (const c of classes) {
    const hw = (c.homework || []).find((h) => h.id === id);
    if (hw) {
      return res.json({ ...hw, className: c.name, classId: c.id });
    }
  }
  res.status(404).json({ error: '作业不存在' });
});

app.listen(PORT, () => {
  console.log(`后端服务器运行在 http://localhost:${PORT}`);
});
