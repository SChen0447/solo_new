import type {
  Exercise,
  ExerciseType,
  AttemptRecord,
  UserAnswer,
  GradingResult,
  Statistics,
  ChoiceExercise,
  ShortExercise,
  CodeExercise,
  ChoiceOption,
} from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Performance notes:
 * - All data operations use localStorage for persistence (no server needed).
 * - Simulated async delay is kept minimal (50ms) to approximate real API latency.
 * - For lists < 100 items (typical exercise book size), rendering should complete
 *   well under 100ms since the data is read synchronously from localStorage and
 *   filtering/sorting is done in-memory with O(n log n) complexity.
 * - If the dataset grows beyond ~500 items, consider:
 *   1. Implementing pagination in getExercises()
 *   2. Using a virtual list (e.g., react-window) for ExerciseList rendering
 *   3. Debouncing filter/sort changes to avoid redundant re-renders
 *   4. Caching parsed localStorage data in a module-level variable with TTL
 */

const EXERCISES_KEY = 'exercise_book_exercises';
const ATTEMPTS_KEY = 'exercise_book_attempts';

function delay<T>(data: T, ms = 50): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}

function readExercises(): Exercise[] {
  try {
    const raw = localStorage.getItem(EXERCISES_KEY);
    return raw ? (JSON.parse(raw) as Exercise[]) : [];
  } catch {
    return [];
  }
}

function writeExercises(list: Exercise[]): void {
  localStorage.setItem(EXERCISES_KEY, JSON.stringify(list));
}

function readAttempts(): AttemptRecord[] {
  try {
    const raw = localStorage.getItem(ATTEMPTS_KEY);
    return raw ? (JSON.parse(raw) as AttemptRecord[]) : [];
  } catch {
    return [];
  }
}

function writeAttempts(list: AttemptRecord[]): void {
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(list));
}

export function seedSampleDataIfEmpty(): void {
  const exercises = readExercises();
  if (exercises.length > 0) return;

  const now = Date.now();

  const optA: ChoiceOption = { id: uuidv4(), text: 'React', isCorrect: true };
  const optB: ChoiceOption = { id: uuidv4(), text: 'Vue', isCorrect: false };
  const optC: ChoiceOption = { id: uuidv4(), text: 'Angular', isCorrect: false };
  const optD: ChoiceOption = { id: uuidv4(), text: 'Svelte', isCorrect: false };

  const samples: Exercise[] = [
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
      referenceAnswer: '404 表示请求的资源未找到（Not Found）；500 表示服务器内部错误（Internal Server Error）。',
      score: 15,
      createdAt: now - 86400000 * 2,
      updatedAt: now - 86400000 * 2,
    } as ShortExercise,
    {
      id: uuidv4(),
      title: '数组去重函数',
      type: 'code',
      content: '请用 JavaScript/TypeScript 编写一个函数，对一个数字数组进行去重，返回新数组。',
      referenceSolution:
        'function unique(arr: number[]): number[] {\n  return Array.from(new Set(arr));\n}\n\n// 或使用 filter + indexOf\nfunction unique2(arr: number[]): number[] {\n  return arr.filter((v, i) => arr.indexOf(v) === i);\n}',
      language: 'typescript',
      score: 20,
      createdAt: now - 86400000,
      updatedAt: now - 86400000,
    } as CodeExercise,
  ];

  writeExercises(samples);
}

export async function getExercises(params?: {
  type?: ExerciseType | 'all';
  sort?: 'newest' | 'oldest';
}): Promise<Exercise[]> {
  let list = readExercises();
  if (params?.type && params.type !== 'all') {
    list = list.filter((e) => e.type === params.type);
  }
  const sort = params?.sort ?? 'newest';
  list.sort((a, b) =>
    sort === 'newest' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt
  );
  return delay(list);
}

export async function getExercise(id: string): Promise<Exercise | null> {
  const list = readExercises();
  const ex = list.find((e) => e.id === id) ?? null;
  return delay(ex);
}

export async function createExercise(
  data: Omit<Exercise, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Exercise> {
  const list = readExercises();
  const now = Date.now();
  const ex = {
    ...data,
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
  } as Exercise;
  list.push(ex);
  writeExercises(list);
  return delay(ex);
}

export async function updateExercise(
  id: string,
  data: Partial<Omit<Exercise, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<Exercise | null> {
  const list = readExercises();
  const idx = list.findIndex((e) => e.id === id);
  if (idx === -1) return delay(null);
  list[idx] = { ...list[idx], ...data, updatedAt: Date.now() } as Exercise;
  writeExercises(list);
  return delay(list[idx]);
}

export async function deleteExercise(id: string): Promise<boolean> {
  const list = readExercises();
  const next = list.filter((e) => e.id !== id);
  writeExercises(next);
  const attempts = readAttempts().filter((a) => a.exerciseId !== id);
  writeAttempts(attempts);
  return delay(true);
}

export async function gradeExercise(
  exercise: Exercise,
  answer: UserAnswer
): Promise<GradingResult> {
  if (exercise.type === 'choice') {
    const choice = exercise as ChoiceExercise;
    const userAns = answer as { selectedOptionIds: string[] };
    const selected = new Set(userAns.selectedOptionIds);
    const correctIds = new Set(choice.options.filter((o) => o.isCorrect).map((o) => o.id));

    let isCorrect = false;
    if (selected.size === correctIds.size) {
      isCorrect = [...selected].every((id) => correctIds.has(id));
    }

    const score = isCorrect ? choice.score : 0;
    return delay({
      score,
      maxScore: choice.score,
      isCorrect,
      explanation: choice.explanation,
      referenceAnswer: choice.referenceAnswer,
    });
  }

  if (exercise.type === 'short') {
    const short = exercise as ShortExercise;
    return delay({
      score: 0,
      maxScore: short.score,
      referenceAnswer: short.referenceAnswer,
      needsSelfRating: true,
    });
  }

  const code = exercise as CodeExercise;
  return delay({
    score: 0,
    maxScore: code.score,
    referenceAnswer: code.referenceSolution,
    needsMasteryCheck: true,
  });
}

export async function submitAttempt(
  record: Omit<AttemptRecord, 'id' | 'submittedAt'>
): Promise<AttemptRecord> {
  const list = readAttempts();
  const full: AttemptRecord = {
    ...record,
    id: uuidv4(),
    submittedAt: Date.now(),
  };
  list.push(full);
  writeAttempts(list);
  return delay(full);
}

export async function getAttempts(exerciseId?: string): Promise<AttemptRecord[]> {
  let list = readAttempts();
  if (exerciseId) list = list.filter((a) => a.exerciseId === exerciseId);
  list.sort((a, b) => b.submittedAt - a.submittedAt);
  return delay(list);
}

function toLocalDateKey(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getLocalDaysAgoKey(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function getStatistics(): Promise<Statistics> {
  const exercises = readExercises();
  const attempts = readAttempts();

  let correctCount = 0;

  const typeCorrectMap: Record<ExerciseType, number> = { choice: 0, short: 0, code: 0 };
  const typeTotalMap: Record<ExerciseType, number> = { choice: 0, short: 0, code: 0 };

  attempts.forEach((a) => {
    typeTotalMap[a.type]++;

    let isTypeCorrect = false;
    if (a.type === 'choice' && typeof a.isCorrect === 'boolean') {
      isTypeCorrect = a.isCorrect;
    } else if (a.type === 'short' && typeof a.selfScore === 'number') {
      isTypeCorrect = a.selfScore >= 4;
    } else if (a.type === 'code' && a.masteryLevel) {
      isTypeCorrect = a.masteryLevel === 'familiar';
    }

    if (isTypeCorrect) {
      correctCount++;
      typeCorrectMap[a.type]++;
    }
  });

  const overallAccuracy =
    attempts.length > 0 ? Math.round((correctCount / attempts.length) * 100) : 0;

  const choiceAccuracy =
    typeTotalMap.choice > 0
      ? Math.round((typeCorrectMap.choice / typeTotalMap.choice) * 100)
      : 0;
  const shortAccuracy =
    typeTotalMap.short > 0
      ? Math.round((typeCorrectMap.short / typeTotalMap.short) * 100)
      : 0;
  const codeAccuracy =
    typeTotalMap.code > 0
      ? Math.round((typeCorrectMap.code / typeTotalMap.code) * 100)
      : 0;

  const dailyMap = new Map<string, number>();
  for (let i = 6; i >= 0; i--) {
    const key = getLocalDaysAgoKey(i);
    dailyMap.set(key, 0);
  }
  attempts.forEach((a) => {
    const key = toLocalDateKey(a.submittedAt);
    if (dailyMap.has(key)) {
      dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1);
    }
  });
  const dailyHeatmap = [...dailyMap.entries()].map(([date, count]) => ({ date, count }));

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
    accuracy:
      typeTotalMap[type] > 0
        ? Math.round((typeCorrectMap[type] / typeTotalMap[type]) * 100)
        : 0,
    correctCount: typeCorrectMap[type],
  }));

  return delay({
    totalExercises: exercises.length,
    totalAttempts: attempts.length,
    overallAccuracy,
    choiceAccuracy,
    shortAccuracy,
    codeAccuracy,
    dailyHeatmap,
    typeAverages,
  });
}
