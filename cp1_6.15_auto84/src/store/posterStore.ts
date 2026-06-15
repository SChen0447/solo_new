import { create } from 'zustand';

export type FontStyle = 'pixel' | 'neon' | 'handwrite';

interface PosterState {
  text: string;
  fontStyle: FontStyle;
  fontSize: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  setText: (text: string) => void;
  setFontStyle: (style: FontStyle) => void;
  setFontSize: (size: number) => void;
  setScale: (scale: number) => void;
  setOffset: (x: number, y: number) => void;
}

export const usePosterStore = create<PosterState>((set) => ({
  text: 'PIXEL ART',
  fontStyle: 'pixel',
  fontSize: 60,
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  setText: (text: string) => set({ text: text.slice(0, 30) }),
  setFontStyle: (fontStyle: FontStyle) => set({ fontStyle }),
  setFontSize: (fontSize: number) => set({ fontSize: Math.max(12, Math.min(200, fontSize)) }),
  setScale: (scale: number) => set({ scale: Math.max(0.5, Math.min(3, scale)) }),
  setOffset: (offsetX: number, offsetY: number) => set({ offsetX, offsetY }),
}));
