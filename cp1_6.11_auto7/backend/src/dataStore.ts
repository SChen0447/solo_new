import { v4 as uuidv4 } from 'uuid';

export type QuestionType = 'single' | 'multiple' | 'text';

export interface Question {
  id: string;
  type: QuestionType;
  title: string;
  options?: string[];
  required?: boolean;
}

export interface Survey {
  id: string;
  title: string;
  shareToken: string;
  questions: Question[];
  createdAt: number;
  responseCount: number;
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  answers: { questionId: string; value: string | string[] }[];
  submittedAt: number;
}

const MAX_SURVEYS = 100;
const MAX_RESPONSES_PER_SURVEY = 1000;
const DEMO_COUNT = 15;
const CLEANUP_RATIO = 0.1;

interface DataStore {
  surveys: Map<string, Survey>;
  responses: Map<string, SurveyResponse[]>;
  tokenIndex: Map<string, string>;
  pendingDeletes: Set<string>;
}

const store: DataStore = {
  surveys: new Map(),
  responses: new Map(),
  tokenIndex: new Map(),
  pendingDeletes: new Set(),
};

let writeLock = Promise.resolve();
let idCounter = 0;
let perfStats = {
  totalCreates: 0,
  totalShareTokenLookups: 0,
  slowCreates: 0,
  slowTokenLookups: 0,
  lockWaits: 0,
  totalLockWaitMs: 0,
};

export function generateId(): string {
  idCounter++;
  return `${Date.now().toString(36)}-${idCounter.toString(36)}-${uuidv4().slice(0, 8)}`;
}

export function generateShareToken(): string {
  return uuidv4().replace(/-/g, '').substring(0, 12);
}

async function acquireWriteLock(): Promise<() => void> {
  const t0 = Date.now();
  let release: () => void = () => {};
  const myLock = new Promise<void>((r) => { release = r; });
  const prevLock = writeLock;
  writeLock = writeLock.then(() => myLock);
  await prevLock;
  const waited = Date.now() - t0;
  if (waited > 0) {
    perfStats.lockWaits++;
    perfStats.totalLockWaitMs += waited;
  }
  return release;
}

function enforceSurveyLimitLocked() {
  if (store.surveys.size < MAX_SURVEYS) return;
  const sorted = Array.from(store.surveys.values())
    .filter((s) => !store.pendingDeletes.has(s.id))
    .sort((a, b) => a.createdAt - b.createdAt);
  const toRemove = sorted.slice(0, Math.ceil(MAX_SURVEYS * CLEANUP_RATIO));
  for (const s of toRemove) {
    store.pendingDeletes.add(s.id);
    store.surveys.delete(s.id);
    store.responses.delete(s.id);
    store.tokenIndex.delete(s.shareToken);
    store.pendingDeletes.delete(s.id);
  }
}

export interface CreatePerfInfo {
  generateTokenMs: number;
  totalMs: number;
  lockWaitMs: number;
}

export async function createSurvey(
  surveyData: { title: string; questions: Omit<Question, 'id'>[] },
  signal?: AbortSignal
): Promise<{ survey: Survey; perf: CreatePerfInfo }> {
  const totalStart = Date.now();
  const t0 = process.hrtime.bigint();

  const release = await acquireWriteLock();
  const lockWaitMs = Date.now() - totalStart;

  try {
    if (signal?.aborted) {
      throw new Error('创建已取消');
    }

    enforceSurveyLimitLocked();

    const id = generateId();
    store.pendingDeletes.delete(id);

    const tokenStart = Date.now();
    let shareToken = generateShareToken();
    let retries = 0;
    while (store.tokenIndex.has(shareToken) && retries < 5) {
      if (signal?.aborted) throw new Error('创建已取消');
      shareToken = generateShareToken();
      retries++;
    }
    const generateTokenMs = Date.now() - tokenStart;

    const questions: Question[] = surveyData.questions.map((q) => ({
      ...q,
      id: generateId(),
    }));

    const survey: Survey = {
      id,
      title: surveyData.title,
      shareToken,
      questions,
      createdAt: Date.now(),
      responseCount: 0,
    };

    if (signal?.aborted) throw new Error('创建已取消');

    store.surveys.set(id, survey);
    store.responses.set(id, []);
    store.tokenIndex.set(shareToken, id);

    const totalMs = Date.now() - totalStart;
    perfStats.totalCreates++;
    if (totalMs > 20) perfStats.slowCreates++;

    return {
      survey,
      perf: { generateTokenMs, totalMs, lockWaitMs },
    };
  } finally {
    release();
  }
}

export function getSurveyById(id: string): Survey | undefined {
  if (store.pendingDeletes.has(id)) return undefined;
  return store.surveys.get(id);
}

export function getSurveyByShareToken(token: string): Survey | undefined {
  const t0 = Date.now();
  const surveyId = store.tokenIndex.get(token);
  perfStats.totalShareTokenLookups++;
  if (Date.now() - t0 > 5) perfStats.slowTokenLookups++;
  if (!surveyId) return undefined;
  if (store.pendingDeletes.has(surveyId)) return undefined;
  return store.surveys.get(surveyId);
}

export function getAllSurveys(): Survey[] {
  return Array.from(store.surveys.values())
    .filter((s) => !store.pendingDeletes.has(s.id))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function getSurveyCount(): number {
  return store.surveys.size - store.pendingDeletes.size;
}

export async function updateSurvey(
  id: string,
  updates: Partial<Omit<Survey, 'id' | 'shareToken' | 'createdAt'>>,
  signal?: AbortSignal
): Promise<Survey | undefined> {
  const release = await acquireWriteLock();
  try {
    if (signal?.aborted) throw new Error('更新已取消');
    const survey = store.surveys.get(id);
    if (!survey || store.pendingDeletes.has(id)) return undefined;
    const updated: Survey = { ...survey, ...updates };
    store.surveys.set(id, updated);
    return updated;
  } finally {
    release();
  }
}

export async function deleteSurvey(id: string, signal?: AbortSignal): Promise<boolean> {
  const release = await acquireWriteLock();
  try {
    if (signal?.aborted) throw new Error('删除已取消');
    const survey = store.surveys.get(id);
    if (!survey || store.pendingDeletes.has(id)) return false;
    store.pendingDeletes.add(id);
    store.surveys.delete(id);
    store.responses.delete(id);
    store.tokenIndex.delete(survey.shareToken);
    store.pendingDeletes.delete(id);
    return true;
  } finally {
    release();
  }
}

export async function submitResponse(
  surveyId: string,
  answers: { questionId: string; value: string | string[] }[],
  signal?: AbortSignal
): Promise<SurveyResponse | null> {
  const release = await acquireWriteLock();
  try {
    if (signal?.aborted) throw new Error('提交已取消');
    if (store.pendingDeletes.has(surveyId)) return null;
    const survey = store.surveys.get(surveyId);
    if (!survey) return null;

    const responses = store.responses.get(surveyId) || [];
    if (responses.length >= MAX_RESPONSES_PER_SURVEY) {
      return null;
    }

    const response: SurveyResponse = {
      id: generateId(),
      surveyId,
      answers,
      submittedAt: Date.now(),
    };
    responses.push(response);
    store.responses.set(surveyId, responses);
    survey.responseCount = responses.length;
    return response;
  } finally {
    release();
  }
}

export function getResponsesBySurveyId(surveyId: string): SurveyResponse[] {
  if (store.pendingDeletes.has(surveyId)) return [];
  return store.responses.get(surveyId) || [];
}

export interface StatisticsResult {
  questionId: string;
  type: QuestionType;
  title: string;
  optionCounts?: Record<string, number>;
  textAnswers?: string[];
}

export function getSurveyStatistics(surveyId: string): StatisticsResult[] {
  if (store.pendingDeletes.has(surveyId)) return [];
  const survey = store.surveys.get(surveyId);
  const responses = store.responses.get(surveyId) || [];
  if (!survey) return [];

  return survey.questions.map((question) => {
    const result: StatisticsResult = {
      questionId: question.id,
      type: question.type,
      title: question.title,
    };

    if (question.type === 'single' || question.type === 'multiple') {
      const counts: Record<string, number> = {};
      if (question.options) {
        question.options.forEach((opt) => (counts[opt] = 0));
      }
      for (const res of responses) {
        const answer = res.answers.find((a) => a.questionId === question.id);
        if (answer) {
          const values = Array.isArray(answer.value) ? answer.value : [answer.value];
          values.forEach((v) => {
            if (counts[v] !== undefined) {
              counts[v]++;
            }
          });
        }
      }
      result.optionCounts = counts;
    } else {
      const textAnswers: string[] = [];
      for (const res of responses) {
        const answer = res.answers.find((a) => a.questionId === question.id);
        if (answer && typeof answer.value === 'string' && answer.value.trim()) {
          textAnswers.push(answer.value);
        }
      }
      result.textAnswers = textAnswers;
    }

    return result;
  });
}

export function getPerfStats() {
  return {
    ...perfStats,
    surveyCount: store.surveys.size,
    pendingDeletes: store.pendingDeletes.size,
    maxSurveys: MAX_SURVEYS,
    maxResponsesPerSurvey: MAX_RESPONSES_PER_SURVEY,
    avgLockWaitMs: perfStats.lockWaits > 0 ? Math.round(perfStats.totalLockWaitMs / perfStats.lockWaits) : 0,
  };
}

const demoQuestions: Omit<Question, 'id'>[] = [
  { type: 'single', title: '您的年龄范围是？', options: ['18岁以下', '18-25岁', '26-35岁', '36-50岁', '50岁以上'], required: true },
  { type: 'single', title: '您的职业是？', options: ['学生', '工程师', '设计师', '产品经理', '其他'], required: true },
  { type: 'multiple', title: '您常用的前端框架有哪些？', options: ['React', 'Vue', 'Angular', 'Svelte', 'Next.js'], required: false },
  { type: 'single', title: '您使用TypeScript的频率？', options: ['每天', '经常', '偶尔', '很少', '从不'], required: true },
  { type: 'text', title: '对我们产品的建议？', required: false },
  { type: 'multiple', title: '您主要通过哪些设备访问网站？', options: ['桌面电脑', '笔记本', '平板', '手机', '智能电视'], required: false },
  { type: 'text', title: '您最喜欢的编程语言是什么？为什么？', required: false },
];

(async () => {
  for (let i = 1; i <= DEMO_COUNT; i++) {
    await createSurvey({
      title: `示例问卷 ${i} - 关于开发工具使用习惯调查`,
      questions: demoQuestions,
    });
  }
})();
