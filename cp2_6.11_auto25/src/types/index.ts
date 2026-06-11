export type ElementType = 'fire' | 'ice' | 'thunder' | 'life';

export interface Material {
  id: string;
  type: ElementType;
  name: string;
  emoji: string;
  color: { r: number; g: number; b: number };
  energy: number;
}

export interface GridCell {
  index: number;
  material: Material | null;
  isHighlighted: boolean;
  isGlowing: boolean;
}

export interface ReactionResult {
  color: { r: number; g: number; b: number };
  energy: number;
  effectType: 'explosion' | 'heal' | 'storm' | 'neutral' | null;
  elements: ElementType[];
}

export interface Potion {
  id: string;
  name: string;
  description: string;
  color: { r: number; g: number; b: number };
  rarity: 1 | 2 | 3 | 4 | 5;
  isCritical: boolean;
  effectType: string;
  createdAt: number;
  duration: number;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  elements: ElementType[];
  rarity: 1 | 2 | 3 | 4 | 5;
  effectType: string;
  discoveredAt: number;
  gridLayout: (ElementType | null)[];
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  type: 'fire' | 'ice' | 'thunder' | 'sparkle';
}
