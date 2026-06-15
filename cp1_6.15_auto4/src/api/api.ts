import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 5000
});

export interface Inspiration {
  id: string;
  emoji: string;
  text: string;
  gradientIndex: number;
  gradient: string[];
}

export interface CanvasCard {
  id: string;
  inspirationId: string;
  emoji: string;
  text: string;
  gradientIndex: number;
  gradient: string[];
  x: number;
  y: number;
}

export interface CanvasText {
  id: string;
  content: string;
  x: number;
  y: number;
  bold: boolean;
  italic: boolean;
  color: string;
}

export interface Connection {
  id: string;
  fromId: string;
  toId: string;
}

export interface GeneratedIdea {
  title: string;
  summary: string;
}

export interface Task {
  id: string;
  name: string;
  status: 'todo' | 'in-progress' | 'done';
  assignee: string;
  avatar: string;
  dueDate: string;
  colorIndex: number;
}

export interface Project {
  id: string;
  title: string;
  summary: string;
  tasks: Task[];
  createdAt: string;
}

export const inspirationApi = {
  getRandom: () => api.get<Inspiration[]>('/inspirations').then(r => r.data),
  getAll: () => api.get<Inspiration[]>('/inspirations/all').then(r => r.data)
};

export const ideaApi = {
  save: (data: { cards: CanvasCard[]; texts: CanvasText[]; connections: Connection[] }) =>
    api.post<{ success: boolean; id: string }>('/save-ideas', data).then(r => r.data),
  load: () => api.get<{ id: string; cards: CanvasCard[]; texts: CanvasText[]; connections: Connection[] } | null>('/load-ideas').then(r => r.data),
  generate: (data: { cards: CanvasCard[]; texts: CanvasText[] }) =>
    api.post<GeneratedIdea>('/generate-idea', data).then(r => r.data)
};

export const projectApi = {
  create: (data: { id?: string; title: string; summary: string; tasks?: Task[] }) =>
    api.post<{ success: boolean; project: Project }>('/projects', data).then(r => r.data),
  update: (id: string, tasks: Task[]) =>
    api.put<{ success: boolean; project: Project }>(`/projects/${id}`, { tasks }).then(r => r.data),
  getById: (id: string) => api.get<Project>(`/projects/${id}`).then(r => r.data),
  getAll: () => api.get<Project[]>('/projects').then(r => r.data)
};
