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

interface DataStore {
  surveys: Map<string, Survey>;
  responses: Map<string, SurveyResponse[]>;
}

const store: DataStore = {
  surveys: new Map(),
  responses: new Map(),
};

export function generateId(): string {
  return uuidv4();
}

export function generateShareToken(): string {
  return uuidv4().replace(/-/g, '').substring(0, 12);
}

export function createSurvey(surveyData: { title: string; questions: Omit<Question, 'id'>[] }): Survey {
  const id = generateId();
  const shareToken = generateShareToken();
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
  store.surveys.set(id, survey);
  store.responses.set(id, []);
  return survey;
}

export function getSurveyById(id: string): Survey | undefined {
  return store.surveys.get(id);
}

export function getSurveyByShareToken(token: string): Survey | undefined {
  for (const survey of store.surveys.values()) {
    if (survey.shareToken === token) {
      return survey;
    }
  }
  return undefined;
}

export function getAllSurveys(): Survey[] {
  return Array.from(store.surveys.values()).sort((a, b) => b.createdAt - a.createdAt);
}

export function updateSurvey(id: string, updates: Partial<Omit<Survey, 'id' | 'shareToken' | 'createdAt'>>): Survey | undefined {
  const survey = store.surveys.get(id);
  if (!survey) return undefined;
  const updated: Survey = { ...survey, ...updates };
  store.surveys.set(id, updated);
  return updated;
}

export function deleteSurvey(id: string): boolean {
  if (!store.surveys.has(id)) return false;
  store.surveys.delete(id);
  store.responses.delete(id);
  return true;
}

export function submitResponse(surveyId: string, answers: { questionId: string; value: string | string[] }[]): SurveyResponse | null {
  const survey = store.surveys.get(surveyId);
  if (!survey) return null;
  const response: SurveyResponse = {
    id: generateId(),
    surveyId,
    answers,
    submittedAt: Date.now(),
  };
  const responses = store.responses.get(surveyId) || [];
  responses.push(response);
  store.responses.set(surveyId, responses);
  survey.responseCount = responses.length;
  return response;
}

export function getResponsesBySurveyId(surveyId: string): SurveyResponse[] {
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

const demoQuestions: Omit<Question, 'id'>[] = [
  { type: 'single', title: '您的年龄范围是？', options: ['18岁以下', '18-25岁', '26-35岁', '36-50岁', '50岁以上'], required: true },
  { type: 'single', title: '您的职业是？', options: ['学生', '工程师', '设计师', '产品经理', '其他'], required: true },
  { type: 'multiple', title: '您常用的前端框架有哪些？', options: ['React', 'Vue', 'Angular', 'Svelte', 'Next.js'], required: false },
  { type: 'single', title: '您使用TypeScript的频率？', options: ['每天', '经常', '偶尔', '很少', '从不'], required: true },
  { type: 'text', title: '对我们产品的建议？', required: false },
  { type: 'multiple', title: '您主要通过哪些设备访问网站？', options: ['桌面电脑', '笔记本', '平板', '手机', '智能电视'], required: false },
  { type: 'text', title: '您最喜欢的编程语言是什么？为什么？', required: false },
];

for (let i = 1; i <= 15; i++) {
  createSurvey({
    title: `示例问卷 ${i} - 关于开发工具使用习惯调查`,
    questions: demoQuestions,
  });
}
