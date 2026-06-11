import { create } from 'zustand';
import type { Task, Dependency, TimeEntry, DailySummary, ComparisonItem, CumulativePoint, ZoomLevel } from '@/types';
import * as api from '@/utils/api';

interface AppStore {
  tasks: Task[];
  dependencies: Dependency[];
  timeEntries: TimeEntry[];
  distribution: DailySummary[];
  comparison: ComparisonItem[];
  cumulative: CumulativePoint[];
  zoomLevel: ZoomLevel;
  selectedTaskId: string | null;
  loading: boolean;

  setZoomLevel: (level: ZoomLevel) => void;
  setSelectedTaskId: (id: string | null) => void;
  loadTasks: () => Promise<void>;
  loadDependencies: () => Promise<void>;
  loadTimeEntries: (params?: { taskId?: string; date?: string }) => Promise<void>;
  loadDistribution: () => Promise<void>;
  loadComparison: () => Promise<void>;
  loadCumulative: () => Promise<void>;

  addTask: (task: Partial<Task>) => Promise<void>;
  editTask: (id: string, task: Partial<Task>) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  addDependency: (dep: Partial<Dependency>) => Promise<void>;
  removeDependency: (id: string) => Promise<void>;
  submitTimeEntries: (entries: Partial<TimeEntry>[]) => Promise<void>;
}

export const useAppStore = create<AppStore>((set, get) => ({
  tasks: [],
  dependencies: [],
  timeEntries: [],
  distribution: [],
  comparison: [],
  cumulative: [],
  zoomLevel: 'week',
  selectedTaskId: null,
  loading: false,

  setZoomLevel: (level) => set({ zoomLevel: level }),
  setSelectedTaskId: (id) => set({ selectedTaskId: id }),

  loadTasks: async () => {
    const tasks = await api.fetchTasks();
    set({ tasks });
  },

  loadDependencies: async () => {
    const dependencies = await api.fetchDependencies();
    set({ dependencies });
  },

  loadTimeEntries: async (params) => {
    const timeEntries = await api.fetchTimeEntries(params);
    set({ timeEntries });
  },

  loadDistribution: async () => {
    const distribution = await api.fetchDistribution();
    set({ distribution });
  },

  loadComparison: async () => {
    const comparison = await api.fetchComparison();
    set({ comparison });
  },

  loadCumulative: async () => {
    const cumulative = await api.fetchCumulative();
    set({ cumulative });
  },

  addTask: async (task) => {
    const created = await api.createTask(task);
    set((s) => ({ tasks: [...s.tasks, created] }));
  },

  editTask: async (id, task) => {
    const updated = await api.updateTask(id, task);
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? updated : t)),
    }));
  },

  removeTask: async (id) => {
    await api.deleteTask(id);
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
  },

  addDependency: async (dep) => {
    const created = await api.createDependency(dep);
    set((s) => ({ dependencies: [...s.dependencies, created] }));
  },

  removeDependency: async (id) => {
    await api.deleteDependency(id);
    set((s) => ({ dependencies: s.dependencies.filter((d) => d.id !== id) }));
  },

  submitTimeEntries: async (entries) => {
    const created = await api.batchCreateTimeEntries(entries);
    set((s) => ({ timeEntries: [...s.timeEntries, ...created] }));
    await get().loadTasks();
  },
}));
