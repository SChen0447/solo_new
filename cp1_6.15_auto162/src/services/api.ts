import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

export interface Work {
  id: string
  title: string
  artist: string
  cover_url: string
  media_url: string
  lyrics: string
  created_at: string
  updated_at: string
}

export interface Schedule {
  id: string
  title: string
  date: string
  time: string
  location: string
  notes: string
  created_at: string
  updated_at: string
}

export interface Comment {
  id: string
  work_id: string
  parent_id: string | null
  nickname: string
  content: string
  created_at: string
  replies?: Comment[]
}

export interface ApiResponse<T> {
  data: T
  total?: number
  page?: number
  limit?: number
}

export const worksApi = {
  getAll: (search?: string, page = 1, limit = 50) =>
    api.get<ApiResponse<Work[]>>('/works', { params: { search, page, limit } }),

  getById: (id: string) =>
    api.get<Work>(`/works/${id}`),

  create: (work: Omit<Work, 'id' | 'created_at' | 'updated_at'>) =>
    api.post<Work>('/works', work),

  update: (id: string, work: Partial<Work>) =>
    api.put<Work>(`/works/${id}`, work),

  delete: (id: string) =>
    api.delete(`/works/${id}`),
}

export const schedulesApi = {
  getAll: (params?: { date?: string; start_date?: string; end_date?: string }) =>
    api.get<ApiResponse<Schedule[]>>('/schedules', { params }),

  getById: (id: string) =>
    api.get<Schedule>(`/schedules/${id}`),

  create: (schedule: Omit<Schedule, 'id' | 'created_at' | 'updated_at'>) =>
    api.post<Schedule>('/schedules', schedule),

  update: (id: string, schedule: Partial<Schedule>) =>
    api.put<Schedule>(`/schedules/${id}`, schedule),

  delete: (id: string) =>
    api.delete(`/schedules/${id}`),
}

export const commentsApi = {
  getByWorkId: (workId: string, page = 1, limit = 10) =>
    api.get<ApiResponse<Comment[]>>(`/works/${workId}/comments`, { params: { page, limit } }),

  create: (workId: string, comment: { parent_id?: string; nickname?: string; content: string }) =>
    api.post<Comment>(`/works/${workId}/comments`, comment),

  delete: (id: string) =>
    api.delete(`/comments/${id}`),
}

export default api
