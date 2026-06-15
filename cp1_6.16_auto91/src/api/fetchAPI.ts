import type {
  GenerateParams,
  GenerateResponse,
  CommentParams,
  CommentResponse,
  LikeParams,
  LikeResponse,
  VoteParams,
  VoteResponse,
  Round2Response,
  FinishResponse,
  HistoryResponse,
  HistoryDetailResponse
} from '../types';

const API_BASE = '/api';

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const fetchAPI = {
  generate: (params: GenerateParams): Promise<GenerateResponse> =>
    request('/generate', {
      method: 'POST',
      body: JSON.stringify(params)
    }),

  comment: (params: CommentParams): Promise<CommentResponse> =>
    request('/comment', {
      method: 'POST',
      body: JSON.stringify(params)
    }),

  getRound2: (sessionId: string): Promise<Round2Response> =>
    request(`/round2/${sessionId}`),

  like: (params: LikeParams): Promise<LikeResponse> =>
    request('/like', {
      method: 'POST',
      body: JSON.stringify(params)
    }),

  vote: (params: VoteParams): Promise<VoteResponse> =>
    request('/vote', {
      method: 'POST',
      body: JSON.stringify(params)
    }),

  finish: (sessionId: string): Promise<FinishResponse> =>
    request(`/finish/${sessionId}`, {
      method: 'POST'
    }),

  getHistory: (): Promise<HistoryResponse> =>
    request('/history'),

  getHistoryDetail: (id: string): Promise<HistoryDetailResponse> =>
    request(`/history/${id}`)
};
