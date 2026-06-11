import type { User, Meeting, TodoItem, Report, LoginResponse } from './types';

const BASE = '/api';

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(BASE + url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: '请求失败' }));
    throw new Error(data.error || '请求失败');
  }
  return res.json();
}

export function login(username: string, password: string): Promise<LoginResponse> {
  return request<LoginResponse>('/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
}

export function searchUsers(query: string): Promise<User[]> {
  return request<User[]>(`/users?q=${encodeURIComponent(query)}`);
}

export function createMeeting(data: {
  title: string;
  dateTime: string;
  participantIds: string[];
  agendas: { title: string; estimatedDuration: number }[];
  createdBy: string;
}): Promise<Meeting> {
  return request<Meeting>('/meetings', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export function getMeetings(): Promise<Meeting[]> {
  return request<Meeting[]>('/meetings');
}

export function getMeeting(id: string): Promise<Meeting> {
  return request<Meeting>(`/meetings/${id}`);
}

export function updateMeeting(id: string, data: Partial<Meeting>): Promise<Meeting> {
  return request<Meeting>(`/meetings/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

export function generateReport(meetingId: string): Promise<{ report: Report; todos: TodoItem[] }> {
  return request<{ report: Report; todos: TodoItem[] }>(`/meetings/${meetingId}/report`, {
    method: 'POST'
  });
}

export function getReport(meetingId: string): Promise<{ report: Report | null; todos: TodoItem[]; meeting: Meeting }> {
  return request<{ report: Report | null; todos: TodoItem[]; meeting: Meeting }>(`/meetings/${meetingId}/report`);
}

export function createTodo(data: {
  meetingId: string;
  description: string;
  assigneeId: string;
  dueDate: string;
}): Promise<TodoItem> {
  return request<TodoItem>('/todos', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export function updateTodo(id: string, data: Partial<TodoItem>): Promise<TodoItem> {
  return request<TodoItem>(`/todos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

export function deleteTodo(id: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/todos/${id}`, {
    method: 'DELETE'
  });
}
