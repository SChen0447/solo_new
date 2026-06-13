import { create } from 'zustand';

export type QuestionType = 'choice' | 'fill' | 'short';

export interface Question {
  id: number;
  index: number;
  question: string;
  options?: string[];
  answer: string;
}

export interface Section {
  type: QuestionType;
  title: string;
  questions: Question[];
}

export interface ReviewMaterial {
  course: string;
  chapter: string;
  generatedAt: string;
  totalCount: number;
  insufficientCoverage: boolean;
  sections: Section[];
}

interface ReviewState {
  reviewMaterial: ReviewMaterial | null;
  loading: boolean;
  error: string | null;
  expandedCards: Set<string>;
  highlightedCards: Set<string>;
  inputPanelCollapsed: boolean;

  setReviewMaterial: (material: ReviewMaterial | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  toggleCard: (cardId: string) => void;
  isCardExpanded: (cardId: string) => boolean;
  highlightCard: (cardId: string) => void;
  isCardHighlighted: (cardId: string) => boolean;
  clearHighlight: (cardId: string) => void;
  toggleInputPanel: () => void;
  reset: () => void;
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  reviewMaterial: null,
  loading: false,
  error: null,
  expandedCards: new Set<string>(),
  highlightedCards: new Set<string>(),
  inputPanelCollapsed: false,

  setReviewMaterial: (material) => set({ reviewMaterial: material, expandedCards: new Set() }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  toggleCard: (cardId) => {
    const current = get().expandedCards;
    const next = new Set(current);
    if (next.has(cardId)) {
      next.delete(cardId);
    } else {
      next.add(cardId);
    }
    set({ expandedCards: next });
  },

  isCardExpanded: (cardId) => get().expandedCards.has(cardId),

  highlightCard: (cardId) => {
    const current = get().highlightedCards;
    const next = new Set(current);
    next.add(cardId);
    set({ highlightedCards: next });
  },

  isCardHighlighted: (cardId) => get().highlightedCards.has(cardId),

  clearHighlight: (cardId) => {
    const current = get().highlightedCards;
    const next = new Set(current);
    next.delete(cardId);
    set({ highlightedCards: next });
  },

  toggleInputPanel: () => set({ inputPanelCollapsed: !get().inputPanelCollapsed }),

  reset: () => set({
    reviewMaterial: null,
    loading: false,
    error: null,
    expandedCards: new Set(),
    highlightedCards: new Set()
  })
}));
