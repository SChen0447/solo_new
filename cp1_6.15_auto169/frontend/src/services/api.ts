import axios from 'axios';
import type { Tool, TimeSlot, Reservation, BorrowRecord, Stats, User } from '@/types';

const api = axios.create({
  baseURL: '/api',
  timeout: 5000
});

export const toolApi = {
  getAll: (category?: string, search?: string) =>
    api.get<Tool[]>('/tools', { params: { category, search } }).then(res => res.data),
  
  getById: (id: string) =>
    api.get<Tool>(`/tools/${id}`).then(res => res.data),
  
  getAvailability: (id: string, date: string) =>
    api.get<TimeSlot[]>(`/tools/${id}/availability`, { params: { date } }).then(res => res.data),
  
  create: (data: Partial<Tool>) =>
    api.post<Tool>('/tools', data).then(res => res.data),
  
  update: (id: string, data: Partial<Tool>) =>
    api.put<Tool>(`/tools/${id}`, data).then(res => res.data),
  
  delete: (id: string) =>
    api.delete(`/tools/${id}`).then(res => res.data)
};

export const reservationApi = {
  getAll: (status?: string, userName?: string) =>
    api.get<Reservation[]>('/reservations', { params: { status, user_name: userName } }).then(res => res.data),
  
  getUpcoming: (userName: string) =>
    api.get<Reservation[]>('/reservations/upcoming', { params: { user_name: userName } }).then(res => res.data),
  
  create: (data: { tool_id: string; user_name: string; date: string; time_slot: string }) =>
    api.post<Reservation>('/reservations', data).then(res => res.data),
  
  updateStatus: (id: string, status: string) =>
    api.put(`/reservations/${id}/status`, { status }).then(res => res.data)
};

export const borrowApi = {
  borrow: (data: { tool_id: string; user_name: string }) =>
    api.post<BorrowRecord>('/borrow', data).then(res => res.data),
  
  returnTool: (tool_id: string) =>
    api.post('/return', { tool_id }).then(res => res.data),
  
  getRecords: () =>
    api.get<BorrowRecord[]>('/borrow-records').then(res => res.data)
};

export const adminApi = {
  login: (username: string, password: string) =>
    api.post<User>('/login', { username, password }).then(res => res.data),
  
  getStats: () =>
    api.get<Stats>('/stats').then(res => res.data)
};
