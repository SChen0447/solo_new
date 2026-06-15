export interface Point {
  x: number;
  y: number;
}

export interface EmojiElement {
  id: string;
  type: 'emoji';
  emoji: string;
  position: Point;
  size: number;
  rotation: number;
  layerId: string;
}

export interface ASCIIText {
  id: string;
  type: 'ascii';
  char: string;
  position: Point;
  rotation: number;
  fontSize: number;
  color: string;
  layerId: string;
}

export type CanvasElement = EmojiElement | ASCIIText;

export interface Layer {
  id: string;
  name: string;
  type: 'emoji' | 'ascii' | 'background';
  visible: boolean;
  opacity: number;
  elements: CanvasElement[];
}

export interface CanvasState {
  width: number;
  height: number;
  layers: Layer[];
  activeLayerId: string;
  selectedElementId: string | null;
}

export interface EmojiCategory {
  name: string;
  emojis: string[];
}

export type DragMode = 'none' | 'move' | 'draw' | 'delete';

export interface DragState {
  mode: DragMode;
  elementId: string | null;
  startPosition: Point;
  currentPosition: Point;
}

export interface ASCIIBrushConfig {
  char: string;
  fontSize: number;
  color: string;
  spacing: number;
  jitter: number;
}

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 500;
export const GRID_SIZE = 10;
export const EMOJI_SIZE = 44;
export const ASCII_FONT_SIZE = 16;
export const ASCII_SPACING = 4;
export const ASCII_JITTER = 3;

export const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    name: '表情',
    emojis: ['😀', '😂', '🤣', '😊', '😍', '🤔', '😎', '🥳', '😭', '😡', '🤯', '😴']
  },
  {
    name: '动物',
    emojis: ['🐶', '🐱', '🐼', '🦊', '🐸', '🐵', '🦁', '🐯', '🐨', '🐙', '🦄', '🐝']
  },
  {
    name: '食物',
    emojis: ['🍎', '🍕', '🍔', '🍟', '🍣', '🍩', '🍪', '🧁', '☕', '🍺', '🍷', '🥂']
  },
  {
    name: '交通',
    emojis: ['🚗', '🚀', '✈️', '🚂', '🚲', '🛸', '🚁', '⛵', '🏎️', '🛴', '🚢', '🎈']
  },
  {
    name: '符号',
    emojis: ['⭐', '❤️', '🔥', '💯', '✨', '🎉', '💡', '🔧', '📌', '🎯', '💎', '🚩']
  }
];

export const ASCII_CHARS = ['@', '#', '*', '$', '%', '&', '?', '+', '=', '-', '.', '~'];
