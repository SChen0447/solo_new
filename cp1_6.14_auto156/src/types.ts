export type MaterialCategory = 'plant' | 'mineral' | 'creature' | 'magic';

export interface Material {
  id: string;
  name: string;
  category: MaterialCategory;
  description: string;
  potency: number;
  toxicity: number;
  stability: number;
  icon: string;
}

export type ReactionType = 'stable' | 'explosion' | 'discolor' | 'smoke';

export type SideEffect =
  | 'toxicity_leak'
  | 'potency_reversal'
  | 'stability_collapse'
  | null;

export interface PotionStats {
  potency: number;
  toxicity: number;
  stability: number;
}

export interface ReactionResult {
  reactionType: ReactionType;
  sideEffect: SideEffect;
  stats: PotionStats;
  effects: {
    health: number;
    mana: number;
    speed: number;
    strength: number;
  };
}

export interface Potion {
  id: string;
  name: string;
  materials: Material[];
  createdAt: string;
  reaction: ReactionResult;
  summary: string;
}

export interface TargetStats {
  health: number;
  mana: number;
  speed: number;
  strength: number;
}
