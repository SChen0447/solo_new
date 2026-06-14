import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export interface Emotion {
  id: string;
  name: string;
  color: string;
  borderColor: string;
}

export const EMOTIONS: Emotion[] = [
  { id: 'joy', name: '喜悦', color: '#FFD93D', borderColor: 'rgba(255, 217, 61, 0.45)' },
  { id: 'excitement', name: '兴奋', color: '#FF9F43', borderColor: 'rgba(255, 159, 67, 0.45)' },
  { id: 'passion', name: '热情', color: '#FF6B6B', borderColor: 'rgba(255, 107, 107, 0.45)' },
  { id: 'anxiety', name: '焦虑', color: '#EE5A24', borderColor: 'rgba(238, 90, 36, 0.45)' },
  { id: 'anger', name: '愤怒', color: '#EB3B5A', borderColor: 'rgba(235, 59, 90, 0.45)' },
  { id: 'sadness', name: '悲伤', color: '#546DE5', borderColor: 'rgba(84, 109, 229, 0.45)' },
  { id: 'melancholy', name: '忧郁', color: '#6C5CE7', borderColor: 'rgba(108, 92, 231, 0.45)' },
  { id: 'fear', name: '恐惧', color: '#778CA3', borderColor: 'rgba(119, 140, 163, 0.45)' },
  { id: 'calm', name: '平静', color: '#4ECDC4', borderColor: 'rgba(78, 205, 196, 0.45)' },
  { id: 'peaceful', name: '安宁', color: '#55E6C1', borderColor: 'rgba(85, 230, 193, 0.45)' },
  { id: 'hope', name: '希望', color: '#26DE81', borderColor: 'rgba(38, 222, 129, 0.45)' },
  { id: 'gratitude', name: '感恩', color: '#20BF6B', borderColor: 'rgba(32, 191, 107, 0.45)' },
  { id: 'curiosity', name: '好奇', color: '#45AAF2', borderColor: 'rgba(69, 170, 242, 0.45)' },
  { id: 'inspiration', name: '灵感', color: '#2D98DA', borderColor: 'rgba(45, 152, 218, 0.45)' },
  { id: 'love', name: '爱意', color: '#F8A5C2', borderColor: 'rgba(248, 165, 194, 0.45)' },
  { id: 'tender', name: '温柔', color: '#FDA7DF', borderColor: 'rgba(253, 167, 223, 0.45)' },
];

export interface IdeaCard {
  id: string;
  title: string;
  content: string;
  emotion: string;
  x: number;
  y: number;
  rotation: number;
  createdAt: number;
}

interface EditorState {
  isOpen: boolean;
  x: number;
  y: number;
  editingId: string | null;
}

interface IdeaStore {
  cards: IdeaCard[];
  scale: number;
  searchKeyword: string;
  filterEmotion: string | null;
  editor: EditorState;
  highlightedCards: Set<string>;

  addCard: (data: Omit<IdeaCard, 'id' | 'createdAt'>) => void;
  updateCardPosition: (id: string, x: number, y: number) => void;
  removeCard: (id: string) => void;
  setScale: (scale: number) => void;
  setSearchKeyword: (keyword: string) => void;
  setFilterEmotion: (emotionId: string | null) => void;
  openEditor: (x: number, y: number) => void;
  closeEditor: () => void;
  setHighlightedCards: (ids: Set<string>) => void;
  clearHighlights: () => void;
  exportToJSON: () => void;
}

function getRandomPosition(viewWidth: number, viewHeight: number) {
  const padding = 100;
  return {
    x: padding + Math.random() * Math.max(0, viewWidth - padding * 2 - 280),
    y: padding + Math.random() * Math.max(0, viewHeight - padding * 2 - 200),
  };
}

function getRandomRotation() {
  return (Math.random() - 0.5) * 10;
}

export const useIdeaStore = create<IdeaStore>((set, get) => ({
  cards: [],
  scale: 1,
  searchKeyword: '',
  filterEmotion: null,
  editor: { isOpen: false, x: 0, y: 0, editingId: null },
  highlightedCards: new Set(),

  addCard: (data) => {
    const newCard: IdeaCard = {
      ...data,
      id: uuidv4(),
      createdAt: Date.now(),
    };
    set((state) => ({ cards: [...state.cards, newCard] }));
  },

  updateCardPosition: (id, x, y) => {
    set((state) => ({
      cards: state.cards.map((card) =>
        card.id === id ? { ...card, x, y } : card
      ),
    }));
  },

  removeCard: (id) => {
    set((state) => ({
      cards: state.cards.filter((card) => card.id !== id),
    }));
  },

  setScale: (scale) => {
    const clamped = Math.min(3, Math.max(0.5, scale));
    set({ scale: clamped });
  },

  setSearchKeyword: (keyword) => {
    set({ searchKeyword: keyword });
    if (keyword.trim()) {
      const lowerKeyword = keyword.toLowerCase();
      const matchedIds = new Set(
        get()
          .cards.filter((card) => card.title.toLowerCase().includes(lowerKeyword))
          .map((card) => card.id)
      );
      set({ highlightedCards: matchedIds });
      setTimeout(() => {
        get().clearHighlights();
      }, 2000);
    } else {
      set({ highlightedCards: new Set() });
    }
  },

  setFilterEmotion: (emotionId) => {
    set({ filterEmotion: emotionId });
  },

  openEditor: (x, y) => {
    set({ editor: { isOpen: true, x, y, editingId: null } });
  },

  closeEditor: () => {
    set({ editor: { isOpen: false, x: 0, y: 0, editingId: null } });
  },

  setHighlightedCards: (ids) => {
    set({ highlightedCards: ids });
  },

  clearHighlights: () => {
    set({ highlightedCards: new Set() });
  },

  exportToJSON: () => {
    const exportData = get().cards.map((card) => ({
      id: card.id,
      title: card.title,
      content: card.content,
      emotion: card.emotion,
      x: card.x,
      y: card.y,
      rotation: card.rotation,
    }));
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `idea-board-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
}));

export function createCardWithRandomPosition(
  title: string,
  content: string,
  emotion: string,
  viewWidth: number,
  viewHeight: number
): Omit<IdeaCard, 'id' | 'createdAt'> {
  const pos = getRandomPosition(viewWidth, viewHeight);
  return {
    title,
    content,
    emotion,
    x: pos.x,
    y: pos.y,
    rotation: getRandomRotation(),
  };
}

export function getEmotionById(id: string): Emotion | undefined {
  return EMOTIONS.find((e) => e.id === id);
}
