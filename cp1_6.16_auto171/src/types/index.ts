export type ActionType = 'walk' | 'jump' | 'rotate' | 'scale';

export type CharacterType = 'boy' | 'girl' | 'dog' | 'cat' | 'rocket' | 'star';

export interface CharacterColor {
  name: string;
  value: string;
}

export interface Character {
  id: string;
  type: CharacterType;
  name: string;
  color: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  dialog: string;
}

export interface CharacterTemplate {
  type: CharacterType;
  defaultName: string;
  colors: CharacterColor[];
}

export interface Action {
  id: string;
  characterId: string;
  type: ActionType;
  startTime: number;
  duration: number;
  targetX?: number;
  targetY?: number;
  targetRotation?: number;
  targetScale?: number;
  direction?: 'left' | 'right';
}

export interface StoryData {
  name: string;
  characters: Character[];
  actions: Action[];
  lastSaved?: string;
}

export const ACTION_COLORS: Record<ActionType, string> = {
  walk: '#81C784',
  jump: '#64B5F6',
  rotate: '#FFB74D',
  scale: '#BA68C8'
};

export const ACTION_NAMES: Record<ActionType, string> = {
  walk: '行走',
  jump: '跳跃',
  rotate: '旋转',
  scale: '缩放'
};

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 500;
export const TIMELINE_DURATION = 60;
