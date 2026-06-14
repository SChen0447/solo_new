import { create } from 'zustand';
import axios from 'axios';
import { Card, ThemeKey } from '../types';

interface CardState {
  cards: Card[];
  currentCard: Card | null;
  searchText: string;
  selectedThemes: ThemeKey[];
  loading: boolean;
  error: string | null;

  fetchCards: () => Promise<void>;
  createCard: (cardData: Partial<Card>) => Promise<Card | null>;
  updateCard: (id: string, cardData: Partial<Card>) => Promise<Card | null>;
  deleteCard: (id: string) => Promise<void>;
  exchangeCard: (cardId: string) => Promise<Card | null>;
  getCardById: (id: string) => Card | undefined;

  setCurrentCard: (card: Card | null) => void;
  setSearchText: (text: string) => void;
  toggleTheme: (theme: ThemeKey) => void;
  clearFilters: () => void;

  getFilteredCards: () => Card[];
}

export const useCardStore = create<CardState>((set, get) => ({
  cards: [],
  currentCard: null,
  searchText: '',
  selectedThemes: [],
  loading: false,
  error: null,

  fetchCards: async () => {
    set({ loading: true, error: null });
    try {
      const res = await axios.get('/api/cards');
      set({ cards: res.data.cards, loading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || '获取名片列表失败', loading: false });
    }
  },

  createCard: async (cardData) => {
    set({ loading: true, error: null });
    try {
      const res = await axios.post('/api/cards', cardData);
      const newCard = res.data.card;
      set((state) => ({ cards: [newCard, ...state.cards], loading: false }));
      return newCard;
    } catch (err: any) {
      set({ error: err.response?.data?.error || '创建名片失败', loading: false });
      return null;
    }
  },

  updateCard: async (id, cardData) => {
    set({ loading: true, error: null });
    try {
      const res = await axios.put(`/api/cards/${id}`, cardData);
      const updated = res.data.card;
      set((state) => ({
        cards: state.cards.map((c) => (c.id === id ? updated : c)),
        currentCard: state.currentCard?.id === id ? updated : state.currentCard,
        loading: false,
      }));
      return updated;
    } catch (err: any) {
      set({ error: err.response?.data?.error || '更新名片失败', loading: false });
      return null;
    }
  },

  deleteCard: async (id) => {
    set({ loading: true, error: null });
    try {
      await axios.delete(`/api/cards/${id}`);
      set((state) => ({
        cards: state.cards.filter((c) => c.id !== id),
        currentCard: state.currentCard?.id === id ? null : state.currentCard,
        loading: false,
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.error || '删除名片失败', loading: false });
    }
  },

  exchangeCard: async (cardId) => {
    set({ loading: true, error: null });
    try {
      const res = await axios.post('/api/exchange', { cardId });
      const card = res.data.card;
      set((state) => {
        const exists = state.cards.some((c) => c.id === card.id);
        return {
          cards: exists
            ? state.cards.map((c) => (c.id === card.id ? card : c))
            : [card, ...state.cards],
          loading: false,
        };
      });
      return card;
    } catch (err: any) {
      set({ error: err.response?.data?.error || '交换失败', loading: false });
      return null;
    }
  },

  getCardById: (id) => {
    return get().cards.find((c) => c.id === id);
  },

  setCurrentCard: (card) => set({ currentCard: card }),

  setSearchText: (text) => set({ searchText: text }),

  toggleTheme: (theme) =>
    set((state) => ({
      selectedThemes: state.selectedThemes.includes(theme)
        ? state.selectedThemes.filter((t) => t !== theme)
        : [...state.selectedThemes, theme],
    })),

  clearFilters: () => set({ searchText: '', selectedThemes: [] }),

  getFilteredCards: () => {
    const { cards, searchText, selectedThemes } = get();
    let result = cards;

    if (searchText.trim()) {
      const lower = searchText.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(lower) ||
          c.occupation.toLowerCase().includes(lower)
      );
    }

    if (selectedThemes.length > 0) {
      result = result.filter((c) => selectedThemes.includes(c.theme as ThemeKey));
    }

    return result;
  },
}));
