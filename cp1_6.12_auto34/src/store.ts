import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export const COLOR_PALETTE = [
  '#FFE4E1',
  '#E8F5E9',
  '#E3F2FD',
  '#FFF3E0',
  '#F3E5F5',
  '#FFFDE7',
  '#E0F2F1',
  '#FCE4EC',
];

const STORAGE_KEY_PROGRESS = 'text-adventure-progress';
const STORAGE_KEY_NODES = 'text-adventure-nodes';
const STORAGE_KEY_EDGES = 'text-adventure-edges';

export interface GameOption {
  id: string;
  text: string;
  targetNodeId: string | null;
}

export interface GameNode {
  id: string;
  description: string;
  options: GameOption[];
  backgroundColor: string;
  position: { x: number; y: number };
}

export interface GameEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
}

export interface PlayProgress {
  currentNodeId: string;
  history: string[];
  savedAt: number;
}

interface GameState {
  nodes: GameNode[];
  edges: GameEdge[];
  selectedNodeId: string | null;
  mode: 'edit' | 'play';
  playHistory: string[];
  currentPlayNodeId: string | null;
  savedProgress: PlayProgress | null;

  addNode: (position?: { x: number; y: number }) => void;
  updateNode: (id: string, updates: Partial<GameNode>) => void;
  deleteNode: (id: string) => void;
  selectNode: (id: string | null) => void;
  updateNodePosition: (id: string, position: { x: number; y: number }) => void;
  addOption: (nodeId: string) => void;
  removeOption: (nodeId: string, optionId: string) => void;
  updateOption: (nodeId: string, optionId: string, updates: Partial<GameOption>) => void;
  addEdge: (source: string, target: string, sourceHandle?: string) => void;
  deleteEdge: (id: string) => void;
  syncEdgesFromOptions: () => void;
  setMode: (mode: 'edit' | 'play') => void;
  setCurrentPlayNode: (nodeId: string) => void;
  goBack: () => void;
  saveProgress: () => void;
  loadProgress: () => boolean;
  clearProgress: () => void;
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

const getRandomColor = (): string => {
  return COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
};

const createDefaultOption = (): GameOption => ({
  id: uuidv4(),
  text: '',
  targetNodeId: null,
});

const loadFromLocalStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    console.warn(`Failed to load ${key} from localStorage`);
  }
  return defaultValue;
};

const saveToLocalStorage = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    console.warn(`Failed to save ${key} to localStorage`);
  }
};

const createInitialNodes = (): GameNode[] => {
  const stored = loadFromLocalStorage<GameNode[] | null>(STORAGE_KEY_NODES, null);
  if (stored && stored.length > 0) {
    return stored;
  }
  return [
    {
      id: uuidv4(),
      description: '## 冒险开始\n\n你站在一个**神秘的森林**入口，四周雾气缭绕。前方有两条小路...',
      options: [
        { id: uuidv4(), text: '走向左边的小路', targetNodeId: null },
        { id: uuidv4(), text: '走向右边的小路', targetNodeId: null },
      ],
      backgroundColor: getRandomColor(),
      position: { x: 100, y: 100 },
    },
  ];
};

const createInitialEdges = (): GameEdge[] => {
  return loadFromLocalStorage<GameEdge[]>(STORAGE_KEY_EDGES, []);
};

export const useGameStore = create<GameState>((set, get) => ({
  nodes: createInitialNodes(),
  edges: createInitialEdges(),
  selectedNodeId: null,
  mode: 'edit',
  playHistory: [],
  currentPlayNodeId: null,
  savedProgress: null,

  addNode: (position) => {
    const newNode: GameNode = {
      id: uuidv4(),
      description: '',
      options: [],
      backgroundColor: getRandomColor(),
      position: position || { x: 200, y: 200 },
    };
    set((state) => ({
      nodes: [...state.nodes, newNode],
      selectedNodeId: newNode.id,
    }));
    get().saveToStorage();
  },

  updateNode: (id, updates) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === id ? { ...node, ...updates } : node
      ),
    }));
    get().syncEdgesFromOptions();
    get().saveToStorage();
  },

  deleteNode: (id) => {
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== id),
      edges: state.edges.filter(
        (edge) => edge.source !== id && edge.target !== id
      ),
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
    }));
    get().saveToStorage();
  },

  selectNode: (id) => {
    set({ selectedNodeId: id });
  },

  updateNodePosition: (id, position) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === id ? { ...node, position } : node
      ),
    }));
  },

  addOption: (nodeId) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId && node.options.length < 4
          ? { ...node, options: [...node.options, createDefaultOption()] }
          : node
      ),
    }));
    get().saveToStorage();
  },

  removeOption: (nodeId, optionId) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              options: node.options.filter((opt) => opt.id !== optionId),
            }
          : node
      ),
      edges: state.edges.filter(
        (edge) =>
          !(edge.source === nodeId && edge.sourceHandle === optionId)
      ),
    }));
    get().saveToStorage();
  },

  updateOption: (nodeId, optionId, updates) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              options: node.options.map((opt) =>
                opt.id === optionId ? { ...opt, ...updates } : opt
              ),
            }
          : node
      ),
    }));
    get().syncEdgesFromOptions();
    get().saveToStorage();
  },

  addEdge: (source, target, sourceHandle) => {
    const existingEdge = get().edges.find(
      (e) => e.source === source && e.sourceHandle === sourceHandle
    );
    if (existingEdge) {
      set((state) => ({
        edges: state.edges.map((e) =>
          e.id === existingEdge.id ? { ...e, target } : e
        ),
      }));
    } else {
      const newEdge: GameEdge = {
        id: uuidv4(),
        source,
        target,
        sourceHandle,
      };
      set((state) => ({
        edges: [...state.edges, newEdge],
      }));
    }
    get().saveToStorage();
  },

  deleteEdge: (id) => {
    set((state) => ({
      edges: state.edges.filter((edge) => edge.id !== id),
    }));
    get().saveToStorage();
  },

  syncEdgesFromOptions: () => {
    const { nodes, edges } = get();
    const newEdges: GameEdge[] = [];

    nodes.forEach((node) => {
      node.options.forEach((option) => {
        if (option.targetNodeId) {
          const existing = edges.find(
            (e) =>
              e.source === node.id &&
              e.sourceHandle === option.id &&
              e.target === option.targetNodeId
          );
          if (existing) {
            newEdges.push(existing);
          } else {
            const sameSourceHandle = edges.find(
              (e) => e.source === node.id && e.sourceHandle === option.id
            );
            if (sameSourceHandle) {
              newEdges.push({
                ...sameSourceHandle,
                target: option.targetNodeId,
              });
            } else {
              newEdges.push({
                id: uuidv4(),
                source: node.id,
                target: option.targetNodeId,
                sourceHandle: option.id,
              });
            }
          }
        }
      });
    });

    const validEdgeIds = new Set(newEdges.map((e) => e.id));
    const orphanEdges = edges.filter(
      (e) => !validEdgeIds.has(e.id) && !e.sourceHandle
    );

    set({ edges: [...newEdges, ...orphanEdges] });
  },

  setMode: (mode) => {
    if (mode === 'play') {
      const { nodes } = get();
      if (nodes.length > 0) {
        set({
          mode,
          currentPlayNodeId: nodes[0].id,
          playHistory: [],
        });
        return;
      }
    }
    set({ mode });
  },

  setCurrentPlayNode: (nodeId) => {
    const { currentPlayNodeId, playHistory } = get();
    const newHistory = [...playHistory];
    if (currentPlayNodeId) {
      newHistory.push(currentPlayNodeId);
      if (newHistory.length > 10) {
        newHistory.shift();
      }
    }
    set({
      currentPlayNodeId: nodeId,
      playHistory: newHistory,
    });
  },

  goBack: () => {
    const { playHistory } = get();
    if (playHistory.length > 0) {
      const prevNodeId = playHistory[playHistory.length - 1];
      set((state) => ({
        currentPlayNodeId: prevNodeId,
        playHistory: state.playHistory.slice(0, -1),
      }));
    }
  },

  saveProgress: () => {
    const { currentPlayNodeId, playHistory } = get();
    if (currentPlayNodeId) {
      const progress: PlayProgress = {
        currentNodeId: currentPlayNodeId,
        history: [...playHistory],
        savedAt: Date.now(),
      };
      saveToLocalStorage(STORAGE_KEY_PROGRESS, progress);
      set({ savedProgress: progress });
    }
  },

  loadProgress: () => {
    const progress = loadFromLocalStorage<PlayProgress | null>(
      STORAGE_KEY_PROGRESS,
      null
    );
    if (progress) {
      set({
        currentPlayNodeId: progress.currentNodeId,
        playHistory: progress.history,
        savedProgress: progress,
        mode: 'play',
      });
      return true;
    }
    return false;
  },

  clearProgress: () => {
    localStorage.removeItem(STORAGE_KEY_PROGRESS);
    set({ savedProgress: null });
  },

  loadFromStorage: () => {
    const nodes = createInitialNodes();
    const edges = createInitialEdges();
    set({ nodes, edges });
  },

  saveToStorage: () => {
    const { nodes, edges } = get();
    saveToLocalStorage(STORAGE_KEY_NODES, nodes);
    saveToLocalStorage(STORAGE_KEY_EDGES, edges);
  },
}));
