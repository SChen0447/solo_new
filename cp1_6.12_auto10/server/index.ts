import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import type {
  Exercise,
  ExerciseType,
  AttemptRecord,
  UserAnswer,
  GradingResult,
  ChoiceExercise,
  ChoiceOption,
  ShortExercise,
  CodeExercise,
} from '../src/types';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

type StoredExercise = Exercise;
type StoredAttempt = AttemptRecord;

const exercises: StoredExercise[] = [];
const attempts: StoredAttempt[] = [];

function seedIfEmpty() {
  if (exercises.length > 0) return;
  const now = Date.now();

  const optA: ChoiceOption = { id: uuidv4(), text: 'React', isCorrect: true };
  const optB: ChoiceOption = { id: uuidv4(), text: 'Vue', isCorrect: false };
  const optC: ChoiceOption = { id: uuidv4(), text: 'Angular', isCorrect: false };
  const optD: ChoiceOption = { id: uuidv4(), text: 'Svelte', isCorrect: false };

  exercises.push(
    {
      id: uuidv4(),
      title: 'React基础 - 单选',
      type: 'choice',
      isMultiple: false,
      content: '以下哪个框架是由Facebook（Meta）开发的？',
      options: [optA, optB, optC, optD],
      explanation: 'React 是由 Facebook（现 Meta）于2013年开源的UI库。',
      referenceAnswer: 'React',
      score: 10,
      createdAt: now - 86400000 * 3,
      updatedAt: now - 86400000 * 3,
    } as ChoiceExercise,
    {
      id: uuidv4(),
      title: 'HTTP状态码简述',
      type: 'short',
      content: '请简要说明 HTTP 状态码 404 和 500 分别代表什么含义？',
      referenceAnswer:
        '404 表示请求的资源未找到（Not Found）；500 表示服务器内部错误（Internal Server Error）。',
      score: 15,
      createdAt: now - 86400000 * 2,
      updatedAt: now - 86400000 * 2,
    } as ShortExercise,
    {
      id: uuidv4(),
      title: '数组去重函数',
      type: 'code',
      content:
        '请用 JavaScript/TypeScript 编写一个函数，对一个数字数组进行去重，返回新数组。',
      referenceSolution:
        'function unique(arr: number[]): number[] {\n  return Array.from(new Set(arr));\n}\n\n// 或使用 filter + indexOf\nfunction unique2(arr: number[]): number[] {\n  return arr.filter((v, i) => arr.indexOf(v) === i);\n}',
      language: 'typescript',
      score: 20,
      createdAt: now - 86400000,
      updatedAt: now - 86400000,
    } as CodeExercise
  );
}
seedIfEmpty();

app.get('/api/exercises', (req: Request, res: Response) => {
  const { type, sort = 'newest' } = req.query;
  let list = [...exercises];
  if (type && type !== 'all') {
    list = list.filter((e) => e.type === (type as ExerciseType));
  }
  list.sort((a, b) =>
    sort === 'newest' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt
  );
  res.json({ data: list });
});

app.get('/api/exercises/:id', (req: Request, res: Response) => {
  const ex = exercises.find((e) => e.id === req.params.id) ?? null;
  res.json({ data: ex });
});

app.post('/api/exercises', (req: Request, res: Response) => {
  const now = Date.now();
  const ex: Exercise = {
    ...(req.body as Omit<Exercise, 'id' | 'createdAt' | 'updatedAt'>),
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
  } as Exercise;
  exercises.push(ex);
  res.json({ data: ex });
});

app.put('/api/exercises/:id', (req: Request, res: Response) => {
  const idx = exercises.findIndex((e) => e.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ data: null });
    return;
  }
  exercises[idx] = {
    ...exercises[idx],
    ...(req.body as Partial<Exercise>),
    updatedAt: Date.now(),
  } as Exercise;
  res.json({ data: exercises[idx] });
});

app.delete('/api/exercises/:id', (req: Request, res: Response) => {
  const idx = exercises.findIndex((e) => e.id === req.params.id);
  if (idx >= 0) exercises.splice(idx, 1);
  const filtered = attempts.filter((a) => a.exerciseId !== req.params.id);
  attempts.length = 0;
  attempts.push(...filtered);
  res.json({ data: true });
});

app.post('/api/exercises/:id/grade', (req: Request, res: Response) => {
  const ex = exercises.find((e) => e.id === req.params.id);
  if (!ex) {
    res.status(404).json({ data: null });
    return;
  }
  const answer = req.body as UserAnswer;
  let result: GradingResult;

  if (ex.type === 'choice') {
    const choice = ex as ChoiceExercise;
    const userAns = answer as { selectedOptionIds: string[] };
    const selected = new Set(userAns.selectedOptionIds);
    const correctIds = new Set(
      choice.options.filter((o) => o.isCorrect).map((o) => o.id)
    );
    let isCorrect = false;
    if (selected.size === correctIds.size) {
      isCorrect = [...selected].every((id) => correctIds.has(id));
    }
    result = {
      score: isCorrect ? choice.score : 0,
      maxScore: choice.score,
      isCorrect,
      explanation: choice.explanation,
      referenceAnswer: choice.referenceAnswer,
    };
  } else if (ex.type === 'short') {
    const short = ex as ShortExercise;
    result = {
      score: 0,
      maxScore: short.score,
      referenceAnswer: short.referenceAnswer,
      needsSelfRating: true,
    };
  } else {
    const code = ex as CodeExercise;
    result = {
      score: 0,
      maxScore: code.score,
      referenceAnswer: code.referenceSolution,
      needsMasteryCheck: true,
    };
  }
  res.json({ data: result });
});

app.post('/api/attempts', (req: Request, res: Response) => {
  const body = req.body as Omit<AttemptRecord, 'id' | 'submittedAt'>;
  const record: AttemptRecord = {
    ...body,
    id: uuidv4(),
    submittedAt: Date.now(),
  };
  attempts.push(record);
  res.json({ data: record });
});

app.get('/api/attempts', (req: Request, res: Response) => {
  const { exerciseId } = req.query;
  let list = [...attempts];
  if (exerciseId) list = list.filter((a) => a.exerciseId === exerciseId);
  list.sort((a, b) => b.submittedAt - a.submittedAt);
  res.json({ data: list });
});

app.get('/api/statistics', (_req: Request, res: Response) => {
  let correctCount = 0;
  let totalScore = 0;

  attempts.forEach((a) => {
    totalScore += a.score;
    if (a.type === 'choice' && typeof a.isCorrect === 'boolean') {
      if (a.isCorrect) correctCount++;
    } else if (a.type === 'short' && typeof a.selfScore === 'number') {
      if (a.selfScore >= 4) correctCount++;
    } else if (a.type === 'code' && a.masteryLevel) {
      if (a.masteryLevel === 'familiar') correctCount++;
    }
  });

  const overallAccuracy =
    attempts.length > 0 ? Math.round((correctCount / attempts.length) * 100) : 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dailyMap = new Map<string, number>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dailyMap.set(key, 0);
  }
  attempts.forEach((a) => {
    const key = new Date(a.submittedAt).toISOString().slice(0, 10);
    if (dailyMap.has(key)) {
      dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1);
    }
  });
  const dailyHeatmap = [...dailyMap.entries()].map(([date, count]) => ({
    date,
    count,
  }));

  const typeMap = new Map<
    ExerciseType,
    { totalScore: number; count: number; attempts: number }
  >();
  (['choice', 'short', 'code'] as ExerciseType[]).forEach((t) => {
    typeMap.set(t, { totalScore: 0, count: 0, attempts: 0 });
  });
  exercises.forEach((e) => {
    const info = typeMap.get(e.type)!;
    info.count++;
  });
  attempts.forEach((a) => {
    const info = typeMap.get(a.type)!;
    info.totalScore += a.score;
    info.attempts++;
  });
  const typeAverages = [...typeMap.entries()].map(([type, info]) => ({
    type,
    averageScore:
      info.attempts > 0
        ? Math.round((info.totalScore / info.attempts) * 10) / 10
        : 0,
    totalAttempts: info.attempts,
  }));

  res.json({
    data: {
      totalExercises: exercises.length,
      totalAttempts: attempts.length,
      overallAccuracy,
      dailyHeatmap,
      typeAverages,
    },
  });
});

app.listen(PORT, () => {
  console.log(`Exercise API server running at http://localhost:${PORT}`);
});
