import type { Survey, Answer, AnswerSubmission } from './types';

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

export const dataStore = {
  async getAllSurveys(): Promise<Survey[]> {
    return request<Survey[]>('/surveys');
  },

  async getSurvey(id: string): Promise<Survey> {
    return request<Survey>(`/surveys/${id}`);
  },

  async createSurvey(title: string, description: string): Promise<Survey> {
    return request<Survey>('/surveys', {
      method: 'POST',
      body: JSON.stringify({ title, description }),
    });
  },

  async updateSurvey(survey: Survey): Promise<Survey> {
    return request<Survey>(`/surveys/${survey.id}`, {
      method: 'PUT',
      body: JSON.stringify(survey),
    });
  },

  async deleteSurvey(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/surveys/${id}`, {
      method: 'DELETE',
    });
  },

  async submitAnswers(submission: AnswerSubmission): Promise<{ success: boolean }> {
    return request<{ success: boolean }>('/answers', {
      method: 'POST',
      body: JSON.stringify(submission),
    });
  },

  async getAnswers(surveyId: string): Promise<Answer[]> {
    return request<Answer[]>(`/answers/${surveyId}`);
  },

  async exportSurvey(surveyId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/export/${surveyId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const contentDisposition = response.headers.get('Content-Disposition');
    const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || 'survey-export.json';
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },
};
