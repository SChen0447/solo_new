export type RuneShape = 'flame' | 'wave' | 'spiral' | 'diamond' | 'star' | 'vortex';

export interface RuneElement {
  id: string;
  name: string;
  color: string;
  shape: RuneShape;
}

export interface Spell {
  id: string;
  name: string;
  runeIds: [string, string, string];
  createdAt: number;
  dominantColor: string;
}

export type FurnacePhase = 'idle' | 'fusion' | 'naming' | 'complete';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface DragState {
  runeId: string | null;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  isDragging: boolean;
  trail: Array<{ x: number; y: number; opacity: number }>;
}

export interface SlotState {
  runeId: string | null;
  pulsePhase: number;
}

export const RUNE_ELEMENTS: RuneElement[] = [
  { id: 'fire', name: '火', color: '#ff6b35', shape: 'flame' },
  { id: 'water', name: '水', color: '#4ecdc4', shape: 'wave' },
  { id: 'wind', name: '风', color: '#95e1d3', shape: 'spiral' },
  { id: 'earth', name: '地', color: '#c4908a', shape: 'diamond' },
  { id: 'light', name: '光', color: '#ffe66d', shape: 'star' },
  { id: 'dark', name: '暗', color: '#9b59b6', shape: 'vortex' },
];

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 0, g: 0, b: 0 };
}

export function mixColors(colors: string[]): string {
  const rgbs = colors.map(hexToRgb);
  const r = Math.round(rgbs.reduce((s, c) => s + c.r, 0) / rgbs.length);
  const g = Math.round(rgbs.reduce((s, c) => s + c.g, 0) / rgbs.length);
  const b = Math.round(rgbs.reduce((s, c) => s + c.b, 0) / rgbs.length);
  return `rgb(${r},${g},${b})`;
}

export function complementaryColor(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${255 - r},${255 - g},${255 - b})`;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

export const EASING = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';
