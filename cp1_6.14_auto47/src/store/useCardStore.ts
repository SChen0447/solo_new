import { create } from 'zustand';
import type { Card, BattleState, BattleResult, BattleLogEntry, BattleCard } from '../types';
import { cardApi, battleApi } from '../services/api';

interface CardStore {
  cards: Card[];
  loading: boolean;
  error: string | null;
  battleState: BattleState;
  fetchCards: () => Promise<void>;
  addCard: (card: Omit<Card, 'id'>) => Promise<void>;
  removeCard: (id: string) => Promise<void>;
  startBattle: () => Promise<void>;
  resetBattle: () => void;
}

const initialBattleState: BattleState = {
  isInProgress: false,
  playerCards: [],
  enemyCards: [],
  currentRound: 0,
  logs: [],
  result: null,
};

export const useCardStore = create<CardStore>((set) => ({
  cards: [],
  loading: false,
  error: null,
  battleState: initialBattleState,

  fetchCards: async () => {
    set({ loading: true, error: null });
    try {
      const cards = await cardApi.getAllCards();
      set({ cards, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  addCard: async (card) => {
    set({ loading: true, error: null });
    try {
      const newCard = await cardApi.createCard(card);
      set((state) => ({
        cards: [...state.cards, newCard],
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  removeCard: async (id) => {
    set({ loading: true, error: null });
    try {
      await cardApi.deleteCard(id);
      set((state) => ({
        cards: state.cards.filter((card) => card.id !== id),
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  startBattle: async () => {
    set((state) => ({
      battleState: { ...state.battleState, isInProgress: true },
    }));
    try {
      const result: BattleResult = await battleApi.startBattle();
      set({
        battleState: {
          isInProgress: false,
          playerCards: result.playerCardStats,
          enemyCards: result.enemyCardStats,
          currentRound: result.totalRounds,
          logs: result.logs,
          result,
        },
      });
    } catch (error: any) {
      set((state) => ({
        battleState: {
          ...state.battleState,
          isInProgress: false,
        },
        error: error.message,
      }));
    }
  },

  resetBattle: () => {
    set({ battleState: initialBattleState });
  },
}));
