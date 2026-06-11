import type { Survey, Answer, AnswerSubmission } from './types';

const API_BASE = '/api';

function showError(message: string) {
  if (typeof window !== 'undefined') {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #EF4444;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 9999;
      font-size: 14px;
      animation: slideIn 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
  console.error('[DataStore Error]', message);
}

function ensureToastStyle() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('toast-style')) return;
  const style = document.createElement('style');
  style.id = 'toast-style';
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

ensureToastStyle();

async function request<T>(url: string, options?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE}${url}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    });
    
    if (!response.ok) {
      let errorMsg = `请求失败 (${response.status})`;
      try {
        const data = await response.json();
        if (data.error) {
          errorMsg = data.error;
        }
      } catch {
        // 忽略解析错误
      }
      throw new Error(errorMsg);
    }
    
    return await response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    showError(`操作失败：${message}`);
    return null;
  }
}

export const dataStore = {
  async getAllSurveys(): Promise<Survey[]> {
    const result = await request<Survey[]>('/surveys');
    return result || [];
  },

  async getSurvey(id: string): Promise<Survey | null> {
    return await request<Survey>(`/surveys/${id}`);
  },

  async createSurvey(title: string, description: string): Promise<Survey | null> {
    return await request<Survey>('/surveys', {
      method: 'POST',
      body: JSON.stringify({ title, description }),
    });
  },

  async updateSurvey(survey: Survey): Promise<Survey | null> {
    return await request<Survey>(`/surveys/${survey.id}`, {
      method: 'PUT',
      body: JSON.stringify(survey),
    });
  },

  async deleteSurvey(id: string): Promise<boolean> {
    const result = await request<{ success: boolean }>(`/surveys/${id}`, {
      method: 'DELETE',
    });
    return result?.success || false;
  },

  async submitAnswers(submission: AnswerSubmission): Promise<boolean> {
    const result = await request<{ success: boolean }>('/answers', {
      method: 'POST',
      body: JSON.stringify(submission),
    });
    return result?.success || false;
  },

  async getAnswers(surveyId: string): Promise<Answer[]> {
    const result = await request<Answer[]>(`/answers/${surveyId}`);
    return result || [];
  },

  async exportSurvey(surveyId: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/export/${surveyId}`);
      if (!response.ok) {
        let errorMsg = `导出失败 (${response.status})`;
        try {
          const data = await response.json();
          if (data.error) {
            errorMsg = data.error;
          }
        } catch {
          // 忽略
        }
        throw new Error(errorMsg);
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
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      showError(`导出失败：${message}`);
      return false;
    }
  },
};
