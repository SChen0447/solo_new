import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import presets from './data/presets.json';

export type ExhibitType = 'sculpture' | 'painting';
export type ViewMode = 'curate' | 'wander';

export interface LightConfig {
  color: string;
  intensity: number;
}

export interface LabelConfig {
  id: string;
  text: string;
  backgroundColor: string;
  textColor: string;
  offsetX: number;
  offsetZ: number;
  visible: boolean;
}

export interface Exhibit {
  id: string;
  presetId: string;
  type: ExhibitType;
  name: string;
  geometry: string;
  color: string;
  metalness: number;
  roughness: number;
  frameColor?: string;
  canvasColors?: string[];
  position: { x: number; y: number; z: number };
  rotation: number;
  scale: number;
  light: LightConfig;
  label: LabelConfig | null;
  createdAt: number;
  animating: boolean;
  animationProgress: number;
}

interface HistoryEntry {
  exhibits: Exhibit[];
}

interface GalleryState {
  exhibits: Exhibit[];
  selectedExhibitId: string | null;
  selectedLabelId: string | null;
  viewMode: ViewMode;
  isCurationMode: boolean;
  loading: boolean;
  loadingProgress: number;
  fps: number;
  history: HistoryEntry[];
  historyIndex: number;
  lastSharedLink: string | null;

  addExhibit: (presetId: string, position: { x: number; z: number }) => void;
  removeExhibit: (id: string) => void;
  selectExhibit: (id: string | null) => void;
  selectLabel: (id: string | null) => void;
  updateExhibitLight: (id: string, light: Partial<LightConfig>) => void;
  updateExhibitLabel: (id: string, label: Partial<LabelConfig>) => void;
  addLabelToExhibit: (exhibitId: string, position?: { offsetX: number; offsetZ: number }) => void;
  moveExhibit: (id: string, position: { x: number; z: number }) => void;
  moveLabel: (labelId: string, offsetX: number, offsetZ: number) => void;
  setViewMode: (mode: ViewMode) => void;
  toggleCurationMode: () => void;
  clearAll: () => void;
  undo: () => void;
  redo: () => void;
  generateShareLink: () => string;
  loadFromShareLink: (encoded: string) => void;
  setLoading: (loading: boolean, progress?: number) => void;
  setFps: (fps: number) => void;
  markAnimationDone: (exhibitId: string) => void;
}

function findPreset(presetId: string) {
  return (presets as any[]).find(p => p.id === presetId);
}

function cloneExhibits(exhibits: Exhibit[]): Exhibit[] {
  return JSON.parse(JSON.stringify(exhibits));
}

const STORAGE_KEY = 'cloud_gallery_v1';
const SHARE_PARAM = 'g';

export const useStore = create<GalleryState>((set, get) => ({
  exhibits: [],
  selectedExhibitId: null,
  selectedLabelId: null,
  viewMode: 'curate',
  isCurationMode: true,
  loading: true,
  loadingProgress: 0,
  fps: 60,
  history: [{ exhibits: [] }],
  historyIndex: 0,
  lastSharedLink: null,

  addExhibit: (presetId, position) => {
    const preset = findPreset(presetId);
    if (!preset) return;
    set(state => {
      const id = uuidv4();
      const labelId = uuidv4();
      const exhibit: Exhibit = {
        id,
        presetId,
        type: preset.type,
        name: preset.name,
        geometry: preset.geometry,
        color: preset.color || preset.canvasColors?.[0] || '#ccc',
        metalness: preset.metalness ?? 0.1,
        roughness: preset.roughness ?? 0.5,
        frameColor: preset.frameColor,
        canvasColors: preset.canvasColors,
        position: { x: position.x, y: 0, z: position.z },
        rotation: (Math.random() - 0.5) * 0.3,
        scale: preset.defaultScale ?? 1,
        light: { color: '#FFF7E8', intensity: 1.2 },
        label: {
          id: labelId,
          text: `${preset.name}\n${preset.theme || '艺术品'} · 2025`,
          backgroundColor: 'rgba(255,255,255,0.92)',
          textColor: '#2A2724',
          offsetX: 0,
          offsetZ: 0,
          visible: false,
        },
        createdAt: Date.now(),
        animating: true,
        animationProgress: 0,
      };
      const newExhibits = [...state.exhibits, exhibit];
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push({ exhibits: cloneExhibits(newExhibits) });
      return {
        exhibits: newExhibits,
        selectedExhibitId: id,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    });
  },

  removeExhibit: (id) => {
    set(state => {
      const newExhibits = state.exhibits.filter(e => e.id !== id);
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push({ exhibits: cloneExhibits(newExhibits) });
      return {
        exhibits: newExhibits,
        selectedExhibitId: state.selectedExhibitId === id ? null : state.selectedExhibitId,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    });
  },

  selectExhibit: (id) => set({ selectedExhibitId: id, selectedLabelId: null }),
  selectLabel: (id) => set({ selectedLabelId: id }),

  updateExhibitLight: (id, light) => {
    set(state => ({
      exhibits: state.exhibits.map(e =>
        e.id === id ? { ...e, light: { ...e.light, ...light } } : e
      ),
    }));
  },

  updateExhibitLabel: (id, label) => {
    set(state => ({
      exhibits: state.exhibits.map(e => {
        if (e.id !== id || !e.label) return e;
        return { ...e, label: { ...e.label, ...label, visible: true } };
      }),
    }));
  },

  addLabelToExhibit: (exhibitId, position) => {
    set(state => ({
      exhibits: state.exhibits.map(e => {
        if (e.id !== exhibitId) return e;
        const label = e.label
          ? { ...e.label, visible: true, ...(position || {}) }
          : {
              id: uuidv4(),
              text: `${e.name}\n作品说明`,
              backgroundColor: 'rgba(255,255,255,0.92)',
              textColor: '#2A2724',
              offsetX: position?.offsetX ?? 0,
              offsetZ: position?.offsetZ ?? 0,
              visible: true,
            };
        return { ...e, label };
      }),
    }));
  },

  moveExhibit: (id, position) => {
    set(state => ({
      exhibits: state.exhibits.map(e =>
        e.id === id ? { ...e, position: { ...e.position, x: position.x, z: position.z } } : e
      ),
    }));
  },

  moveLabel: (labelId, offsetX, offsetZ) => {
    set(state => ({
      exhibits: state.exhibits.map(e => {
        if (!e.label || e.label.id !== labelId) return e;
        return { ...e, label: { ...e.label, offsetX, offsetZ } };
      }),
    }));
  },

  setViewMode: (mode) => set({ viewMode: mode }),

  toggleCurationMode: () => set(state => ({
    isCurationMode: !state.isCurationMode,
    viewMode: !state.isCurationMode ? 'curate' : 'wander',
  })),

  clearAll: () => {
    set(state => {
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push({ exhibits: [] });
      return {
        exhibits: [],
        selectedExhibitId: null,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    });
  },

  undo: () => {
    set(state => {
      if (state.historyIndex <= 0) return {};
      const idx = state.historyIndex - 1;
      return {
        historyIndex: idx,
        exhibits: cloneExhibits(state.history[idx].exhibits),
        selectedExhibitId: null,
      };
    });
  },

  redo: () => {
    set(state => {
      if (state.historyIndex >= state.history.length - 1) return {};
      const idx = state.historyIndex + 1;
      return {
        historyIndex: idx,
        exhibits: cloneExhibits(state.history[idx].exhibits),
      };
    });
  },

  generateShareLink: () => {
    const state = get();
    const data = {
      v: 1,
      e: state.exhibits.map(e => ({
        p: e.presetId,
        x: +e.position.x.toFixed(2),
        z: +e.position.z.toFixed(2),
        r: +e.rotation.toFixed(2),
        s: +e.scale.toFixed(2),
        lc: e.light.color,
        li: +e.light.intensity.toFixed(2),
        lb: e.label?.visible ? {
          t: e.label.text,
          bc: e.label.backgroundColor,
          tc: e.label.textColor,
          ox: +e.label.offsetX.toFixed(2),
          oz: +e.label.offsetZ.toFixed(2),
        } : null,
      })),
    };
    try {
      const encoded = btoa(encodeURIComponent(JSON.stringify(data)));
      const url = `${window.location.origin}${window.location.pathname}?${SHARE_PARAM}=${encoded}`;
      set({ lastSharedLink: url });
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.exhibits));
      } catch {}
      return url;
    } catch (err) {
      console.error('Share encode error:', err);
      return '';
    }
  },

  loadFromShareLink: (encoded) => {
    try {
      const data = JSON.parse(decodeURIComponent(atob(encoded)));
      if (!data || !Array.isArray(data.e)) return;
      const exhibits: Exhibit[] = data.e.map((item: any) => {
        const preset = findPreset(item.p);
        if (!preset) return null;
        const id = uuidv4();
        const labelId = uuidv4();
        return {
          id,
          presetId: item.p,
          type: preset.type,
          name: preset.name,
          geometry: preset.geometry,
          color: preset.color || preset.canvasColors?.[0] || '#ccc',
          metalness: preset.metalness ?? 0.1,
          roughness: preset.roughness ?? 0.5,
          frameColor: preset.frameColor,
          canvasColors: preset.canvasColors,
          position: { x: item.x, y: 0, z: item.z },
          rotation: item.r ?? 0,
          scale: item.s ?? 1,
          light: { color: item.lc || '#FFF7E8', intensity: item.li ?? 1.2 },
          label: item.lb ? {
            id: labelId,
            text: item.lb.t,
            backgroundColor: item.lb.bc,
            textColor: item.lb.tc,
            offsetX: item.lb.ox,
            offsetZ: item.lb.oz,
            visible: true,
          } : {
            id: labelId,
            text: `${preset.name}`,
            backgroundColor: 'rgba(255,255,255,0.92)',
            textColor: '#2A2724',
            offsetX: 0,
            offsetZ: 0,
            visible: false,
          },
          createdAt: Date.now(),
          animating: true,
          animationProgress: 0,
        } as Exhibit;
      }).filter(Boolean) as Exhibit[];
      const history = [{ exhibits: cloneExhibits(exhibits) }];
      set({ exhibits, history, historyIndex: 0, selectedExhibitId: null });
    } catch (err) {
      console.error('Load from share link failed:', err);
    }
  },

  setLoading: (loading, progress) => set(state => ({
    loading,
    loadingProgress: progress ?? state.loadingProgress,
  })),

  setFps: (fps) => set({ fps }),

  markAnimationDone: (exhibitId) => {
    set(state => ({
      exhibits: state.exhibits.map(e =>
        e.id === exhibitId ? { ...e, animating: false, animationProgress: 1 } : e
      ),
    }));
  },
}));

export function getPresets() {
  return presets as any[];
}
