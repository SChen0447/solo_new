import { create } from 'zustand';
import {
  Inspiration,
  CanvasCard,
  CanvasText,
  Connection,
  GeneratedIdea,
  Task,
  Project,
  inspirationApi,
  ideaApi,
  projectApi
} from '../api/api';

export type ViewType = 'inspiration' | 'canvas' | 'project';

interface AppState {
  currentView: ViewType;
  inspirations: Inspiration[];
  collectedCards: Inspiration[];
  canvasCards: CanvasCard[];
  canvasTexts: CanvasText[];
  connections: Connection[];
  generatedIdea: GeneratedIdea | null;
  showIdeaModal: boolean;
  currentProject: Project | null;
  sidebarCollapsed: boolean;
  isLoading: boolean;
  loadedItemIndex: number;

  setCurrentView: (view: ViewType) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  setLoadedItemIndex: (i: number) => void;

  fetchInspirations: () => Promise<void>;
  refreshInspirations: () => Promise<void>;
  collectCard: (card: Inspiration) => void;
  uncollectCard: (id: string) => void;

  addCanvasCard: (card: Inspiration, x: number, y: number) => void;
  removeCanvasCard: (id: string) => void;
  updateCanvasCardPosition: (id: string, x: number, y: number) => void;

  addCanvasText: (x: number, y: number) => void;
  updateCanvasText: (id: string, updates: Partial<CanvasText>) => void;
  removeCanvasText: (id: string) => void;

  updateConnections: () => void;

  generateIdea: () => Promise<void>;
  closeIdeaModal: () => void;

  saveIdeas: () => Promise<void>;
  loadIdeas: () => Promise<void>;

  convertToProject: () => Promise<void>;
  setCurrentProject: (project: Project | null) => void;
  updateTaskStatus: (taskId: string, newStatus: Task['status']) => void;
  updateProjectTasks: (tasks: Task[]) => Promise<void>;
  loadProject: (id: string) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  currentView: 'inspiration',
  inspirations: [],
  collectedCards: [],
  canvasCards: [],
  canvasTexts: [],
  connections: [],
  generatedIdea: null,
  showIdeaModal: false,
  currentProject: null,
  sidebarCollapsed: false,
  isLoading: false,
  loadedItemIndex: -1,

  setCurrentView: (view) => set({ currentView: view }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
  setLoadedItemIndex: (i) => set({ loadedItemIndex: i }),

  fetchInspirations: async () => {
    set({ isLoading: true });
    try {
      const data = await inspirationApi.getRandom();
      set({ inspirations: data, isLoading: false, loadedItemIndex: 0 });
    } catch (e) {
      set({ isLoading: false });
    }
  },

  refreshInspirations: async () => {
    set({ isLoading: true, inspirations: [], loadedItemIndex: -1 });
    try {
      const data = await inspirationApi.getRandom();
      set({ inspirations: data, isLoading: false, loadedItemIndex: 0 });
    } catch (e) {
      set({ isLoading: false });
    }
  },

  collectCard: (card) => {
    set((s) => {
      if (s.collectedCards.find((c) => c.id === card.id)) return s;
      return { collectedCards: [...s.collectedCards, card] };
    });
  },

  uncollectCard: (id) => {
    set((s) => ({
      collectedCards: s.collectedCards.filter((c) => c.id !== id),
      canvasCards: s.canvasCards.filter((c) => c.inspirationId !== id)
    }));
    get().updateConnections();
  },

  addCanvasCard: (card, x, y) => {
    const newCard: CanvasCard = {
      id: `canvas-${card.id}-${Date.now()}`,
      inspirationId: card.id,
      emoji: card.emoji,
      text: card.text,
      gradientIndex: card.gradientIndex,
      gradient: card.gradient,
      x,
      y
    };
    set((s) => ({ canvasCards: [...s.canvasCards, newCard] }));
    setTimeout(() => get().updateConnections(), 50);
  },

  removeCanvasCard: (id) => {
    set((s) => ({ canvasCards: s.canvasCards.filter((c) => c.id !== id) }));
    get().updateConnections();
  },

  updateCanvasCardPosition: (id, x, y) => {
    set((s) => ({
      canvasCards: s.canvasCards.map((c) => (c.id === id ? { ...c, x, y } : c))
    }));
    get().updateConnections();
  },

  addCanvasText: (x, y) => {
    const newText: CanvasText = {
      id: `text-${Date.now()}`,
      content: '双击编辑文字',
      x,
      y,
      bold: false,
      italic: false,
      color: '#ffffff'
    };
    set((s) => ({ canvasTexts: [...s.canvasTexts, newText] }));
  },

  updateCanvasText: (id, updates) => {
    set((s) => ({
      canvasTexts: s.canvasTexts.map((t) => (t.id === id ? { ...t, ...updates } : t))
    }));
  },

  removeCanvasText: (id) => {
    set((s) => ({ canvasTexts: s.canvasTexts.filter((t) => t.id !== id) }));
  },

  updateConnections: () => {
    const { canvasCards } = get();
    const newConnections: Connection[] = [];
    for (let i = 0; i < canvasCards.length; i++) {
      for (let j = i + 1; j < canvasCards.length; j++) {
        const a = canvasCards[i];
        const b = canvasCards[j];
        const dx = (a.x + 90) - (b.x + 90);
        const dy = (a.y + 60) - (b.y + 60);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 240) {
          newConnections.push({
            id: `conn-${a.id}-${b.id}`,
            fromId: a.id,
            toId: b.id
          });
        }
      }
    }
    set({ connections: newConnections });
  },

  generateIdea: async () => {
    set({ isLoading: true });
    try {
      const { canvasCards, canvasTexts } = get();
      const result = await ideaApi.generate({ cards: canvasCards, texts: canvasTexts });
      set({ generatedIdea: result, showIdeaModal: true, isLoading: false });
    } catch (e) {
      set({ isLoading: false });
    }
  },

  closeIdeaModal: () => set({ showIdeaModal: false }),

  saveIdeas: async () => {
    try {
      const { canvasCards, canvasTexts, connections } = get();
      await ideaApi.save({ cards: canvasCards, texts: canvasTexts, connections });
    } catch (e) {
      console.error('保存失败', e);
    }
  },

  loadIdeas: async () => {
    set({ isLoading: true });
    try {
      const data = await ideaApi.load();
      if (data) {
        set({
          canvasCards: data.cards || [],
          canvasTexts: data.texts || [],
          connections: data.connections || [],
          loadedItemIndex: 0,
          isLoading: false
        });
      } else {
        set({ isLoading: false });
      }
    } catch (e) {
      set({ isLoading: false });
    }
  },

  convertToProject: async () => {
    const { generatedIdea, canvasCards } = get();
    if (!generatedIdea) return;
    try {
      const result = await projectApi.create({
        title: generatedIdea.title,
        summary: generatedIdea.summary
      });
      set({
        currentProject: result.project,
        currentView: 'project',
        showIdeaModal: false
      });
    } catch (e) {
      console.error('创建项目失败', e);
    }
  },

  setCurrentProject: (project) => set({ currentProject: project }),

  updateTaskStatus: (taskId, newStatus) => {
    set((s) => {
      if (!s.currentProject) return s;
      const updatedTasks = s.currentProject.tasks.map((t) =>
        t.id === taskId ? { ...t, status: newStatus } : t
      );
      return { currentProject: { ...s.currentProject, tasks: updatedTasks } };
    });
  },

  updateProjectTasks: async (tasks) => {
    const { currentProject } = get();
    if (!currentProject) return;
    try {
      const result = await projectApi.update(currentProject.id, tasks);
      set({ currentProject: result.project });
    } catch (e) {
      console.error('更新失败', e);
    }
  },

  loadProject: async (id) => {
    set({ isLoading: true });
    try {
      const project = await projectApi.getById(id);
      set({ currentProject: project, currentView: 'project', isLoading: false });
    } catch (e) {
      set({ isLoading: false });
    }
  }
}));
