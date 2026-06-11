import axios from 'axios';
import type { Task, Dependency, TimeEntry, DailySummary, ComparisonItem, CumulativePoint } from '@/types';

const api = axios.create({ baseURL: '/api' });

export async function fetchTasks(): Promise<Task[]> {
  const res = await api.get<Task[]>('/tasks');
  return res.data;
}

export async function createTask(task: Partial<Task>): Promise<Task> {
  const res = await api.post<Task>('/tasks', task);
  return res.data;
}

export async function updateTask(id: string, task: Partial<Task>): Promise<Task> {
  const res = await api.put<Task>(`/tasks/${id}`, task);
  return res.data;
}

export async function deleteTask(id: string): Promise<void> {
  await api.delete(`/tasks/${id}`);
}

export async function fetchDependencies(): Promise<Dependency[]> {
  const res = await api.get<Dependency[]>('/dependencies');
  return res.data;
}

export async function createDependency(dep: Partial<Dependency>): Promise<Dependency> {
  const res = await api.post<Dependency>('/dependencies', dep);
  return res.data;
}

export async function deleteDependency(id: string): Promise<void> {
  await api.delete(`/dependencies/${id}`);
}

export async function batchCreateTimeEntries(entries: Partial<TimeEntry>[]): Promise<TimeEntry[]> {
  const res = await api.post<TimeEntry[]>('/time-entries/batch', entries);
  return res.data;
}

export async function fetchTimeEntries(params?: { taskId?: string; date?: string }): Promise<TimeEntry[]> {
  const res = await api.get<TimeEntry[]>('/time-entries', { params });
  return res.data;
}

export async function fetchDistribution(): Promise<DailySummary[]> {
  const res = await api.get<DailySummary[]>('/stats/distribution');
  return res.data;
}

export async function fetchComparison(): Promise<ComparisonItem[]> {
  const res = await api.get<ComparisonItem[]>('/stats/comparison');
  return res.data;
}

export async function fetchCumulative(): Promise<CumulativePoint[]> {
  const res = await api.get<CumulativePoint[]>('/stats/cumulative');
  return res.data;
}
