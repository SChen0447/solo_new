import { create } from 'zustand';
import { TarotCard, createInitialDeck, shuffleDeck, calculateLuckyScore } from '@/data/cards';

export type GamePhase = 'idle' | 'shuffling' | 'ready' | 'drawing' | 'complete';

interface GameState {
  deck: TarotCard[];
  drawnCards: TarotCard[];
  phase: GamePhase;
  selectedCardIndex: number | null;
  luckyScore: number;
  flippedCards: boolean[];
  
  shuffle: () => void;
  finishShuffle: () => void;
  drawCards: () => void;
  selectCard: (index: number | null) => void;
  resetGame: () => void;
  setCardFlipped: (index: number) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  deck: createInitialDeck(),
  drawnCards: [],
  phase: 'idle',
  selectedCardIndex: null,
  luckyScore: 0,
  flippedCards: [false, false, false],

  shuffle: () => {
    const currentDeck = get().deck;
    const newDeck = shuffleDeck(currentDeck);
    set({
      deck: newDeck,
      phase: 'shuffling',
      drawnCards: [],
      flippedCards: [false, false, false],
      selectedCardIndex: null,
      luckyScore: 0,
    });
  },

  finishShuffle: () => {
    set({ phase: 'ready' });
  },

  drawCards: () => {
    const { deck } = get();
    const shuffledDeck = shuffleDeck(deck);
    const drawn: TarotCard[] = [];
    
    const usedIndices = new Set<number>();
    for (let i = 0; i < 3; i++) {
      let idx;
      do {
        idx = Math.floor(Math.random() * shuffledDeck.length);
      } while (usedIndices.has(idx));
      usedIndices.add(idx);
      drawn.push(shuffledDeck[idx]);
    }

    set({
      drawnCards: drawn,
      phase: 'drawing',
    });
  },

  setCardFlipped: (index: number) => {
    const { flippedCards, drawnCards, phase } = get();
    const newFlipped = [...flippedCards];
    newFlipped[index] = true;

    const allFlipped = newFlipped.every(Boolean);
    if (allFlipped && phase === 'drawing') {
      const score = calculateLuckyScore(drawnCards);
      set({
        flippedCards: newFlipped,
        luckyScore: score,
        phase: 'complete',
        selectedCardIndex: 1,
      });
    } else {
      set({ flippedCards: newFlipped });
    }
  },

  selectCard: (index: number | null) => {
    set({ selectedCardIndex: index });
  },

  resetGame: () => {
    set({
      deck: createInitialDeck(),
      drawnCards: [],
      phase: 'idle',
      selectedCardIndex: null,
      luckyScore: 0,
      flippedCards: [false, false, false],
    });
  },
}));
