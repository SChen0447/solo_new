import { create } from 'zustand';
import axios from 'axios';

export type EmotionType = 'happy' | 'sad' | 'angry' | 'anxious' | 'calm';

export interface Bubble {
  id: string;
  emotion: EmotionType;
  content: string;
  timestamp: number;
  x: number;
  y: number;
  size: number;
  rotation: number;
  vy: number;
  vr: number;
}

export interface Reply {
  id: string;
  bubbleId: string;
  content: string;
  timestamp: number;
}

interface EmotionStats {
  happy: number;
  sad: number;
  angry: number;
  anxious: number;
  calm: number;
  total: number;
  totalReplies: number;
}

interface StoreState {
  bubbles: Bubble[];
  replies: Reply[];
  selectedBubble: Bubble | null;
  timeRange: number;
  isModalOpen: boolean;
  fetchBubbles: () => Promise<void>;
  submitBubble: (emotion: EmotionType, content: string) => Promise<void>;
  submitReply: (bubbleId: string, content: string) => Promise<void>;
  selectBubble: (bubble: Bubble | null) => void;
  setTimeRange: (range: number) => void;
  updateBubblePosition: (id: string, y: number, rotation: number) => void;
  getEmotionStats: () => EmotionStats;
  getFilteredBubbles: () => Bubble[];
}

const EMOTION_COLORS: Record<EmotionType, string> = {
  happy: '#ffeb3b',
  sad: '#3f51b5',
  angry: '#f44336',
  anxious: '#ff9800',
  calm: '#4caf50',
};

export const getEmotionColor = (emotion: EmotionType): string => {
  return EMOTION_COLORS[emotion];
};

const EMOTION_LABELS: Record<EmotionType, string> = {
  happy: '高兴',
  sad: '悲伤',
  angry: '愤怒',
  anxious: '焦虑',
  calm: '平静',
};

export const getEmotionLabel = (emotion: EmotionType): string => {
  return EMOTION_LABELS[emotion];
};

function generateBubbleProperties(existingBubbles: Bubble[], canvasWidth: number, canvasHeight: number): Partial<Bubble> {
  const size = Math.random() * 60 + 60;
  const vy = (Math.random() * 1.5 + 0.5) * (Math.random() > 0.5 ? 1 : -1);
  const vr = (Math.random() * 1 - 0.5);

  let x = 0, y = 0;
  let attempts = 0;
  const maxAttempts = 100;

  while (attempts < maxAttempts) {
    x = Math.random() * (canvasWidth - size - 40) + size / 2 + 20;
    y = Math.random() * (canvasHeight - size - 100) + size / 2 + 60;

    let hasCollision = false;
    for (const bubble of existingBubbles) {
      const dx = x - bubble.x;
      const dy = y - bubble.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < (size + bubble.size) / 2 + 10) {
        hasCollision = true;
        break;
      }
    }

    if (!hasCollision) break;
    attempts++;
  }

  return { x, y, size, rotation: 0, vy, vr };
}

export const useStore = create<StoreState>((set, get) => ({
  bubbles: [],
  replies: [],
  selectedBubble: null,
  timeRange: 24,
  isModalOpen: false,

  fetchBubbles: async () => {
    try {
      const { data } = await axios.get('/api/bubbles');
      const canvasWidth = window.innerWidth - 320;
      const canvasHeight = window.innerHeight;

      const bubblesWithProps: Bubble[] = data.bubbles.map((bubble: Omit<Bubble, 'x' | 'y' | 'size' | 'rotation' | 'vy' | 'vr'>, index: number) => {
        const existing = get().bubbles.filter((_, i) => i < index);
        const props = generateBubbleProperties(existing, canvasWidth, canvasHeight);
        return { ...bubble, ...props } as Bubble;
      });

      set({ bubbles: bubblesWithProps, replies: data.replies });
    } catch (error) {
      console.error('Failed to fetch bubbles:', error);
    }
  },

  submitBubble: async (emotion: EmotionType, content: string) => {
    try {
      const { data } = await axios.post('/api/bubbles', { emotion, content });
      const canvasWidth = window.innerWidth - 320;
      const canvasHeight = window.innerHeight;
      const props = generateBubbleProperties(get().bubbles, canvasWidth, canvasHeight);
      const newBubble = { ...data, ...props } as Bubble;

      set((state) => {
        const updatedBubbles = [newBubble, ...state.bubbles].slice(0, 200);
        return { bubbles: updatedBubbles };
      });
    } catch (error) {
      console.error('Failed to submit bubble:', error);
    }
  },

  submitReply: async (bubbleId: string, content: string) => {
    try {
      const { data } = await axios.post(`/api/bubbles/${bubbleId}/replies`, { content });
      set((state) => ({
        replies: [...state.replies, data],
      }));
    } catch (error) {
      console.error('Failed to submit reply:', error);
    }
  },

  selectBubble: (bubble: Bubble | null) => {
    set({ selectedBubble: bubble, isModalOpen: bubble !== null });
  },

  setTimeRange: (range: number) => {
    set({ timeRange: range });
  },

  updateBubblePosition: (id: string, y: number, rotation: number) => {
    set((state) => ({
      bubbles: state.bubbles.map((b) =>
        b.id === id ? { ...b, y, rotation } : b
      ),
    }));
  },

  getEmotionStats: () => {
    const filtered = get().getFilteredBubbles();
    const stats: EmotionStats = {
      happy: 0,
      sad: 0,
      angry: 0,
      anxious: 0,
      calm: 0,
      total: filtered.length,
      totalReplies: 0,
    };

    filtered.forEach((b) => {
      stats[b.emotion]++;
    });

    const filteredIds = new Set(filtered.map((b) => b.id));
    stats.totalReplies = get().replies.filter((r) => filteredIds.has(r.bubbleId)).length;

    return stats;
  },

  getFilteredBubbles: () => {
    const { bubbles, timeRange } = get();
    const now = Date.now();
    const cutoff = now - timeRange * 60 * 60 * 1000;
    return bubbles.filter((b) => b.timestamp >= cutoff);
  },
}));
