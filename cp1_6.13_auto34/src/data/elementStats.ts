import type { ElementType, ElementStats } from '@/types';

export const elementStats: Record<ElementType, ElementStats> = {
  fire: {
    hp: [80, 100],
    attack: [85, 110],
    defense: [55, 75],
    speed: [70, 95],
  },
  water: {
    hp: [90, 110],
    attack: [65, 85],
    defense: [80, 105],
    speed: [60, 80],
  },
  grass: {
    hp: [95, 115],
    attack: [60, 80],
    defense: [75, 95],
    speed: [65, 85],
  },
  electric: {
    hp: [70, 90],
    attack: [75, 95],
    defense: [60, 75],
    speed: [90, 115],
  },
  ice: {
    hp: [75, 95],
    attack: [80, 100],
    defense: [65, 80],
    speed: [75, 95],
  },
};

export const elementColors: Record<ElementType, { from: string; to: string; glow: string; text: string }> = {
  fire: {
    from: '#ff6b35',
    to: '#f72c25',
    glow: 'rgba(255, 107, 53, 0.6)',
    text: '#ff8c5a',
  },
  water: {
    from: '#4facfe',
    to: '#00f2fe',
    glow: 'rgba(79, 172, 254, 0.6)',
    text: '#6fc3ff',
  },
  grass: {
    from: '#56ab2f',
    to: '#a8e063',
    glow: 'rgba(86, 171, 47, 0.6)',
    text: '#8ed95a',
  },
  electric: {
    from: '#f7ff00',
    to: '#dbff65',
    glow: 'rgba(247, 255, 0, 0.6)',
    text: '#fffd70',
  },
  ice: {
    from: '#2193b0',
    to: '#6dd5ed',
    glow: 'rgba(33, 147, 176, 0.6)',
    text: '#7dd8ef',
  },
};

export const elementNames: Record<ElementType, string> = {
  fire: '火',
  water: '水',
  grass: '草',
  electric: '电',
  ice: '冰',
};

export const elementIcons: Record<ElementType, string> = {
  fire: '🔥',
  water: '💧',
  grass: '🌿',
  electric: '⚡',
  ice: '❄️',
};
