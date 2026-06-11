const BASE_URL = 'http://localhost:3002/api';

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
  shareLinkGeneratedMs?: number;
}

export interface SurveyListResponse {
  total: number;
  page: number;
  pageSize: number;
  data: Survey[];
}

export interface StatisticsResult {
  questionId: string;
  type: QuestionType;
  title: string;
  optionCounts?: Record<string, number>;
  textAnswers?: string[];
}

export interface StatisticsResponse {
  survey: Survey;
  statistics: StatisticsResult[];
  totalResponses: number;
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
  if (!res.ok) {
    let message = `请求失败 (${res.status})`;
    try {
      const err = await res.json();
      message = err.error || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return res.json();
}

export function getSurveys(page = 1, pageSize = 50): Promise<SurveyListResponse> {
  return request<SurveyListResponse>(`/surveys?page=${page}&pageSize=${pageSize}`);
}

export function getSurveyById(id: string): Promise<Survey> {
  return request<Survey>(`/surveys/${id}`);
}

export function getSurveyByShareToken(token: string): Promise<Survey> {
  return request<Survey>(`/share/${token}`);
}

export interface CreateSurveyData {
  title: string;
  questions: Omit<Question, 'id'>[];
}

export function createSurvey(data: CreateSurveyData): Promise<Survey> {
  return request<Survey>('/surveys', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateSurvey(id: string, data: Partial<Pick<Survey, 'title' | 'questions'>>): Promise<Survey> {
  return request<Survey>(`/surveys/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteSurvey(id: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/surveys/${id}`, {
    method: 'DELETE',
  });
}

export interface AnswerItem {
  questionId: string;
  value: string | string[];
}

export function submitResponse(surveyId: string, answers: AnswerItem[]): Promise<{ success: boolean; responseId: string }> {
  return request<{ success: boolean; responseId: string }>(`/surveys/${surveyId}/responses`, {
    method: 'POST',
    body: JSON.stringify({ answers }),
  });
}

export function getStatistics(surveyId: string): Promise<StatisticsResponse> {
  return request<StatisticsResponse>(`/surveys/${surveyId}/statistics`);
}
