import { create } from 'zustand';
import {
  PixelMatrix,
  Artwork,
  ViewMode,
  PixelColorPickerState,
  ToastState,
  FRAME_COUNT,
  PALETTE_COLORS,
} from './types';
import {
  sampleCanvasToPixelMatrix,
  generateAnimationFrames,
} from './PixelAnimationEngine';

const HISTORY_KEY = 'pixel_animator_history';

function loadHistory(): Artwork[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to load history', e);
  }
  return [];
}

function saveHistory(history: Artwork[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.warn('Failed to save history', e);
  }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export function formatCreatedAt(iso: string): string {
  return formatDateTime(iso);
}

interface AppState {
  currentColor: string;
  brushSize: number;
  basePixelMatrix: PixelMatrix | null;
  animationFrames: PixelMatrix[];
  currentFrameIndex: number;
  isPlaying: boolean;
  viewMode: ViewMode;
  history: Artwork[];
  toast: ToastState | null;
  pixelColorPicker: PixelColorPickerState | null;
  isExporting: boolean;
  currentLoadedId: string | null;

  setCurrentColor: (c: string) => void;
  setBrushSize: (s: number) => void;
  convertCanvasToPixels: (canvas: HTMLCanvasElement) => void;
  togglePlay: () => void;
  setFrameIndex: (i: number) => void;
  setViewMode: (m: ViewMode) => void;
  setPixelColor: (x: number, y: number, color: string | null, frameIndex?: number) => void;
  regenerateAnimation: () => void;
  setExporting: (b: boolean) => void;
  saveToHistory: (canvasSnapshot?: string) => void;
  loadFromHistory: (id: string) => void;
  renameArtwork: (id: string, name: string) => void;
  deleteArtwork: (id: string) => void;
  showToast: (message: string, type?: ToastState['type']) => void;
  openPixelColorPicker: (
    screenX: number,
    screenY: number,
    pixelX: number,
    pixelY: number,
  ) => void;
  closePixelColorPicker: () => void;
}

let toastCounter = 0;

export const useAppStore = create<AppState>((set, get) => ({
  currentColor: PALETTE_COLORS[7], // 默认纯黑
  brushSize: 4,
  basePixelMatrix: null,
  animationFrames: [],
  currentFrameIndex: 0,
  isPlaying: false,
  viewMode: 'drawing',
  history: loadHistory(),
  toast: null,
  pixelColorPicker: null,
  isExporting: false,
  currentLoadedId: null,

  setCurrentColor: (c) => set({ currentColor: c }),
  setBrushSize: (s) => set({ brushSize: s }),

  convertCanvasToPixels: (canvas) => {
    const t0 = performance.now();
    const matrix = sampleCanvasToPixelMatrix(canvas);
    const frames = generateAnimationFrames(matrix);
    const t1 = performance.now();
    console.info(`[Convert] sampling+anim: ${(t1 - t0).toFixed(1)}ms`);
    set({
      basePixelMatrix: matrix,
      animationFrames: frames,
      currentFrameIndex: 0,
      isPlaying: true,
      viewMode: 'pixel-grid',
    });
    get().saveToHistory(canvas.toDataURL('image/png'));
  },

  togglePlay: () => {
    const { animationFrames, isPlaying } = get();
    if (animationFrames.length === 0) return;
    set({ isPlaying: !isPlaying });
  },

  setFrameIndex: (i) => {
    const total = get().animationFrames.length;
    if (total === 0) return;
    const idx = ((i % total) + total) % total;
    set({ currentFrameIndex: idx });
  },

  setViewMode: (m) => set({ viewMode: m }),

  setPixelColor: (x, y, color, frameIdx) => {
    const { animationFrames, basePixelMatrix, currentFrameIndex } = get();
    const targetFrame = frameIdx ?? currentFrameIndex;
    const newFrames = animationFrames.map((frame, i) => {
      if (i !== targetFrame) return frame;
      const newFrame = frame.map((row) => row.slice());
      if (newFrame[y] && newFrame[y].length > x) {
        newFrame[y][x] = color;
      }
      return newFrame;
    });
    let newBase = basePixelMatrix;
    if (basePixelMatrix && targetFrame === 0) {
      newBase = basePixelMatrix.map((row) => row.slice());
      if (newBase[y] && newBase[y].length > x) {
        newBase[y][x] = color;
      }
    }
    set({ animationFrames: newFrames, basePixelMatrix: newBase });
  },

  regenerateAnimation: () => {
    const { basePixelMatrix } = get();
    if (!basePixelMatrix) return;
    const frames = generateAnimationFrames(basePixelMatrix);
    set({ animationFrames: frames, currentFrameIndex: 0, isPlaying: true });
  },

  setExporting: (b) => set({ isExporting: b }),

  saveToHistory: (canvasSnapshot) => {
    const { basePixelMatrix, animationFrames, history, currentLoadedId } = get();
    if (!basePixelMatrix || animationFrames.length === 0) return;

    if (currentLoadedId) {
      const updated = history.map((a) => {
        if (a.id === currentLoadedId) {
          const thumb = generateThumbnail(animationFrames[0]);
          return {
            ...a,
            baseMatrix,
            animationFrames,
            thumbnail: thumb || a.thumbnail,
            canvasSnapshot: canvasSnapshot || a.canvasSnapshot,
          };
        }
        return a;
      });
      saveHistory(updated);
      set({ history: updated });
      return;
    }

    const thumbnail = generateThumbnail(animationFrames[0]) || '';
    const artwork: Artwork = {
      id: generateId(),
      name: `作品 ${history.length + 1}`,
      createdAt: new Date().toISOString(),
      thumbnail,
      baseMatrix: basePixelMatrix,
      animationFrames,
      canvasSnapshot,
    };
    const newHistory = [artwork, ...history].slice(0, 50);
    saveHistory(newHistory);
    set({ history: newHistory, currentLoadedId: artwork.id });
  },

  loadFromHistory: (id) => {
    const artwork = get().history.find((a) => a.id === id);
    if (!artwork) return;
    set({
      basePixelMatrix: artwork.baseMatrix,
      animationFrames: artwork.animationFrames,
      currentFrameIndex: 0,
      isPlaying: true,
      viewMode: 'pixel-grid',
      currentLoadedId: id,
    });
  },

  renameArtwork: (id, name) => {
    const history = get().history.map((a) =>
      a.id === id ? { ...a, name: name || a.name } : a,
    );
    saveHistory(history);
    set({ history });
  },

  deleteArtwork: (id) => {
    const history = get().history.filter((a) => a.id !== id);
    saveHistory(history);
    set({ history });
  },

  showToast: (message, type = 'success') => {
    const id = ++toastCounter;
    set({ toast: { message, type, id } });
    setTimeout(() => {
      set((s) => (s.toast && s.toast.id === id ? { toast: null } : {}));
    }, 2700);
  },

  openPixelColorPicker: (screenX, screenY, pixelX, pixelY) => {
    set({
      pixelColorPicker: { x: screenX, y: screenY, pixelX, pixelY },
    });
  },

  closePixelColorPicker: () => set({ pixelColorPicker: null }),
}));

function generateThumbnail(matrix: PixelMatrix): string | null {
  try {
    const h = matrix.length;
    const w = matrix[0]?.length || 0;
    if (!w || !h) return null;
    const canvas = document.createElement('canvas');
    canvas.width = 120;
    canvas.height = 80;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 120, 80);
    const sx = 120 / w;
    const sy = 80 / h;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const c = matrix[y][x];
        if (c) {
          ctx.fillStyle = c;
          ctx.fillRect(Math.floor(x * sx), Math.floor(y * sy), Math.ceil(sx), Math.ceil(sy));
        }
      }
    }
    return canvas.toDataURL('image/png');
  } catch (e) {
    return null;
  }
}

export function renderMatrixToDataUrl(matrix: PixelMatrix, scale = 1): string {
  const h = matrix.length;
  const w = matrix[0]?.length || 0;
  if (!w || !h) return '';
  const canvas = document.createElement('canvas');
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = matrix[y][x];
      if (c) {
        ctx.fillStyle = c;
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
  }
  return canvas.toDataURL('image/png');
}
