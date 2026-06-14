import { create } from 'zustand';
import axios from 'axios';
import type {
  Actor,
  Performance,
  Feedback,
  CheckInRecord,
  ScheduleState,
} from './types';

const DEFAULT_ACTORS: Actor[] = [
  { id: 'actor-1', name: '李明', avatarColor: '#3498DB', role: '男主角' },
  { id: 'actor-2', name: '王芳', avatarColor: '#E74C3C', role: '女主角' },
  { id: 'actor-3', name: '张伟', avatarColor: '#2ECC71', role: '配角' },
  { id: 'actor-4', name: '刘洋', avatarColor: '#9B59B6', role: '配角' },
  { id: 'actor-5', name: '陈静', avatarColor: '#F39C12', role: '导演助理' },
  { id: 'actor-6', name: '赵阳', avatarColor: '#1ABC9C', role: '舞台监督' },
];

interface StoreState extends ScheduleState {
  fetchPerformances: () => Promise<void>;
  fetchFeedbacks: () => Promise<void>;
  fetchActors: () => Promise<void>;
  addPerformance: (p: Omit<Performance, 'id' | 'createdAt'>) => Promise<void>;
  updatePerformance: (id: string, updates: Partial<Performance>) => Promise<void>;
  deletePerformance: (id: string) => Promise<void>;
  addFeedback: (f: Omit<Feedback, 'id' | 'createdAt'>) => Promise<void>;
  addCheckIn: (c: CheckInRecord) => Promise<void>;
  setCurrentMonth: (date: Date) => void;
  setSelectedDate: (date: string | null) => void;
  setSelectedPerformanceId: (id: string | null) => void;
  setSelectedActorId: (id: string | null) => void;
  setActorPanelOpen: (open: boolean) => void;
  setFeedbackPanelOpen: (open: boolean) => void;
  setCreateModalOpen: (open: boolean) => void;
  setEditingPerformance: (p: Performance | null) => void;
  getPerformanceFeedbacks: (performanceId: string) => Feedback[];
  getPerformanceAverageRating: (performanceId: string) => number;
  getActorPerformances: (actorId: string) => Performance[];
  getActorParticipation: () => { actor: Actor; count: number }[];
  getConflicts: () => Map<string, string[]>;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  toast: { message: string; type: string; visible: boolean } | null;
  hideToast: () => void;
}

export const useStore = create<StoreState>((set, get) => ({
  performances: [],
  actors: DEFAULT_ACTORS,
  feedbacks: [],
  checkIns: [],
  currentMonth: new Date(),
  selectedDate: null,
  selectedPerformanceId: null,
  selectedActorId: null,
  isActorPanelOpen: false,
  isFeedbackPanelOpen: false,
  isCreateModalOpen: false,
  editingPerformance: null,
  toast: null,

  showToast: (message, type = 'info') => {
    set({ toast: { message, type, visible: true } });
    setTimeout(() => {
      set({ toast: null });
    }, 2000);
  },

  hideToast: () => set({ toast: null }),

  fetchPerformances: async () => {
    try {
      const res = await axios.get<Performance[]>('/api/performances');
      set({ performances: res.data });
    } catch (err) {
      console.error('Failed to fetch performances:', err);
    }
  },

  fetchFeedbacks: async () => {
    try {
      const res = await axios.get<Feedback[]>('/api/feedbacks');
      set({ feedbacks: res.data });
    } catch (err) {
      console.error('Failed to fetch feedbacks:', err);
    }
  },

  fetchActors: () => {
    set({ actors: DEFAULT_ACTORS });
  },

  addPerformance: async (p) => {
    try {
      const res = await axios.post<Performance>('/api/performances', p);
      set((state) => ({
        performances: [...state.performances, res.data],
      }));
      get().showToast('演出创建成功', 'success');
    } catch (err) {
      console.error('Failed to add performance:', err);
      get().showToast('创建失败', 'error');
    }
  },

  updatePerformance: async (id, updates) => {
    try {
      const res = await axios.put<Performance>(`/api/performances/${id}`, updates);
      set((state) => ({
        performances: state.performances.map((p) =>
          p.id === id ? res.data : p
        ),
      }));
    } catch (err) {
      console.error('Failed to update performance:', err);
      get().showToast('更新失败', 'error');
    }
  },

  deletePerformance: async (id) => {
    try {
      await axios.delete(`/api/performances/${id}`);
      set((state) => ({
        performances: state.performances.filter((p) => p.id !== id),
        selectedPerformanceId: state.selectedPerformanceId === id ? null : state.selectedPerformanceId,
      }));
      get().showToast('已删除演出', 'success');
    } catch (err) {
      console.error('Failed to delete performance:', err);
      get().showToast('删除失败', 'error');
    }
  },

  addFeedback: async (f) => {
    try {
      const res = await axios.post<Feedback>('/api/feedbacks', f);
      set((state) => ({
        feedbacks: [...state.feedbacks, res.data],
      }));
      get().showToast('反馈已保存', 'success');
    } catch (err) {
      console.error('Failed to add feedback:', err);
      get().showToast('保存失败', 'error');
    }
  },

  addCheckIn: async (c) => {
    set((state) => ({
      checkIns: [...state.checkIns, c],
    }));
    get().showToast('打卡成功', 'success');
  },

  setCurrentMonth: (date) => set({ currentMonth: date }),
  setSelectedDate: (date) => set({ selectedDate: date }),
  setSelectedPerformanceId: (id) => set({ selectedPerformanceId: id }),
  setSelectedActorId: (id) => set({ selectedActorId: id }),
  setActorPanelOpen: (open) => set({ isActorPanelOpen: open }),
  setFeedbackPanelOpen: (open) => set({ isFeedbackPanelOpen: open }),
  setCreateModalOpen: (open) => set({ isCreateModalOpen: open }),
  setEditingPerformance: (p) => set({ editingPerformance: p }),

  getPerformanceFeedbacks: (performanceId) => {
    return get().feedbacks.filter((f) => f.performanceId === performanceId);
  },

  getPerformanceAverageRating: (performanceId) => {
    const feedbacks = get().feedbacks.filter((f) => f.performanceId === performanceId);
    if (feedbacks.length === 0) return 0;
    const sum = feedbacks.reduce((acc, f) => acc + f.rating, 0);
    return Math.round((sum / feedbacks.length) * 10) / 10;
  },

  getActorPerformances: (actorId) => {
    return get().performances.filter((p) => p.actorIds.includes(actorId));
  },

  getActorParticipation: () => {
    const { actors, performances } = get();
    return actors.map((actor) => ({
      actor,
      count: performances.filter((p) => p.actorIds.includes(actor.id)).length,
    }));
  },

  getConflicts: () => {
    const { performances } = get();
    const conflicts = new Map<string, string[]>();

    for (let i = 0; i < performances.length; i++) {
      for (let j = i + 1; j < performances.length; j++) {
        const a = performances[i];
        const b = performances[j];
        if (a.date !== b.date) continue;

        const aStart = parseInt(a.startTime.replace(':', ''));
        const aEnd = parseInt(a.endTime.replace(':', ''));
        const bStart = parseInt(b.startTime.replace(':', ''));
        const bEnd = parseInt(b.endTime.replace(':', ''));

        if (aStart < bEnd && bStart < aEnd) {
          if (!conflicts.has(a.id)) conflicts.set(a.id, []);
          if (!conflicts.has(b.id)) conflicts.set(b.id, []);
          conflicts.get(a.id)!.push(b.id);
          conflicts.get(b.id)!.push(a.id);
        }
      }
    }
    return conflicts;
  },
}));
