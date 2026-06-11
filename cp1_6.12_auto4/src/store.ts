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
  selectedDependencyId: string | null;
  loading: boolean;
  lastDebounceMessage: string | null;

  setZoomLevel: (level: ZoomLevel) => void;
  setSelectedTaskId: (id: string | null) => void;
  setSelectedDependencyId: (id: string | null) => void;
  loadAll: () => Promise<void>;
  loadTasks: () => Promise<void>;
  loadDependencies: () => Promise<void>;
  loadTimeEntries: (params?: { taskId?: string; date?: string }) => Promise<void>;
  loadDistribution: () => Promise<void>;
  loadComparison: () => Promise<void>;
  loadCumulative: () => Promise<void>;
  loadAllStats: () => Promise<void>;

  addTask: (task: Partial<Task>) => Promise<void>;
  editTask: (id: string, task: Partial<Task>) => Promise<void>;
  editTasks: (tasks: Task[]) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  addDependency: (dep: Partial<Dependency>) => Promise<void>;
  removeDependency: (id: string) => Promise<void>;
  submitTimeEntries: (entries: Partial<TimeEntry>[]) => Promise<{ debounced: boolean; skippedCount: number; message: string }>;
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
  selectedDependencyId: null,
  loading: false,
  lastDebounceMessage: null,

  setZoomLevel: (level) => set({ zoomLevel: level }),
  setSelectedTaskId: (id) => set({ selectedTaskId: id }),
  setSelectedDependencyId: (id) => set({ selectedDependencyId: id }),

  loadAll: async () => {
    set({ loading: true });
    await Promise.all([get().loadTasks(), get().loadDependencies(), get().loadTimeEntries()]);
    set({ loading: false });
  },

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

  loadAllStats: async () => {
    set({ loading: true });
    await Promise.all([get().loadDistribution(), get().loadComparison(), get().loadCumulative()]);
    set({ loading: false });
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

  editTasks: async (tasks) => {
    const updated = await api.batchUpdateTasks(tasks);
    set((s) => ({
      tasks: s.tasks.map((t) => {
        const u = updated.find((x) => x.id === t.id);
        return u || t;
      }),
    }));
  },

  removeTask: async (id) => {
    await api.deleteTask(id);
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
  },

  addDependency: async (dep) => {
    const created = await api.createDependency(dep);
    set((s) => ({ dependencies: [...s.dependencies, created] }));
    await get().loadTasks();
  },

  removeDependency: async (id) => {
    await api.deleteDependency(id);
    set((s) => ({ dependencies: s.dependencies.filter((d) => d.id !== id) }));
    await get().loadTasks();
  },

  submitTimeEntries: async (entries) => {
    const response = await api.batchCreateTimeEntries(entries);
    set((s) => ({
      timeEntries: [...s.timeEntries, ...response.entries],
      lastDebounceMessage: response.message,
    }));
    await get().loadTasks();
    return { debounced: response.debounced, skippedCount: response.skippedCount, message: response.message };
  },
}));
