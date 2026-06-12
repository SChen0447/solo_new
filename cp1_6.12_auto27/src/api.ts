export interface Activity {
  id: string;
  name: string;
  description: string;
  role: 'visitor' | 'registered' | 'admin';
  emoji: string;
  color: string;
  position: { x: number; y: number };
  order: number;
  createdAt: number;
}

export interface Iteration {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  activityIds: string[];
  order: number;
}

export interface AppState {
  version: number;
  timestamp: number;
  activities: Activity[];
  iterations: Iteration[];
}

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  getState: () => request<AppState>('/state'),

  createActivity: (data: Partial<Activity>) =>
    request<Activity>('/activities', { method: 'POST', body: JSON.stringify(data) }),

  updateActivity: (id: string, data: Partial<Activity>) =>
    request<Activity>(`/activities/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteActivity: (id: string) =>
    request<{ success: boolean }>(`/activities/${id}`, { method: 'DELETE' }),

  reorderActivities: (ids: string[], role?: string) =>
    request<{ success: boolean }>('/activities/reorder', {
      method: 'PUT',
      body: JSON.stringify({ ids, role }),
    }),

  createIteration: (data: Partial<Iteration>) =>
    request<Iteration>('/iterations', { method: 'POST', body: JSON.stringify(data) }),

  updateIteration: (id: string, data: Partial<Iteration>) =>
    request<Iteration>(`/iterations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteIteration: (id: string) =>
    request<{ success: boolean }>(`/iterations/${id}`, { method: 'DELETE' }),

  reorderIteration: (iterationId: string, activityIds: string[]) =>
    request<{ success: boolean }>('/iterations/reorder', {
      method: 'PUT',
      body: JSON.stringify({ iterationId, activityIds }),
    }),

  restoreState: (state: AppState) =>
    request<{ success: boolean }>('/state/restore', {
      method: 'POST',
      body: JSON.stringify(state),
    }),
};
