export type ElementType = 'fire' | 'water' | 'wind' | 'earth';

export interface CardData {
  id: number;
  element: ElementType;
  value: number;
  isFlipped: boolean;
  isMatched: boolean;
  isShattering: boolean;
  rotation: number;
  offsetY: number;
}

export interface CombinationResult {
  matched: boolean;
  matchedIds: number[];
  element: ElementType | null;
}

const ELEMENTS: ElementType[] = ['fire', 'water', 'wind', 'earth'];

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function initDeck(): CardData[] {
  const cards: CardData[] = [];
  let id = 0;

  for (const element of ELEMENTS) {
    for (let i = 0; i < 13; i++) {
      cards.push({
        id: id++,
        element,
        value: (i % 10) + 1,
        isFlipped: false,
        isMatched: false,
        isShattering: false,
        rotation: (Math.random() - 0.5) * 10,
        offsetY: (Math.random() - 0.5) * 4,
      });
    }
  }

  const shuffled = shuffle(cards);
  return shuffled;
}

export function checkCombination(flippedCards: CardData[]): CombinationResult {
  const activeFlipped = flippedCards.filter(c => c.isFlipped && !c.isMatched && !c.isShattering);
  const elementCounts: Record<ElementType, CardData[]> = {
    fire: [],
    water: [],
    wind: [],
    earth: [],
  };

  for (const card of activeFlipped) {
    elementCounts[card.element].push(card);
  }

  for (const element of ELEMENTS) {
    if (elementCounts[element].length >= 3) {
      const count = elementCounts[element].length >= 4 ? 4 : 3;
      const matchedCards = elementCounts[element].slice(0, count);
      return {
        matched: true,
        matchedIds: matchedCards.map(c => c.id),
        element,
      };
    }
  }

  return {
    matched: false,
    matchedIds: [],
    element: null,
  };
}

export const ELEMENT_COLORS: Record<ElementType, string> = {
  fire: '#ff6b6b',
  water: '#4a9eff',
  wind: '#00d4aa',
  earth: '#ffd700',
};

export const ELEMENT_NAMES: Record<ElementType, string> = {
  fire: '火',
  water: '水',
  wind: '风',
  earth: '地',
};
