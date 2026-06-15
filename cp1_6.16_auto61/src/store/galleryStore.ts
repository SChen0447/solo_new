import { create } from 'zustand';
import { generateId, clamp } from '../utils/helpers';

export type FrameStyle = 'simple-black' | 'gold-european' | 'none';
export type BackgroundType = 'solid' | 'texture';
export type TextureType = 'marble' | 'wood' | 'brick';
export type HistoryType = 'add' | 'move' | 'update' | 'delete' | 'rollback' | 'background';

export interface Artwork {
  id: string;
  name: string;
  imageUrl: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  frameStyle: FrameStyle;
  width: number;
  height: number;
}

export interface Annotation {
  id: string;
  artworkId: string;
  content: string;
  author: string;
  authorInitials: string;
  backgroundColor: string;
  createdAt: number;
  isExpanded: boolean;
  order: number;
}

export interface HistoryRecord {
  id: string;
  type: HistoryType;
  description: string;
  timestamp: number;
  artworks: Artwork[];
  background: BackgroundConfig;
}

export interface BackgroundConfig {
  type: BackgroundType;
  color?: string;
  texture?: TextureType;
}

export interface NewArtworkData {
  name: string;
  imageUrl: string;
  width: number;
  height: number;
  x?: number;
  y?: number;
}

export interface NewAnnotationData {
  artworkId: string;
  content: string;
  author: string;
  authorInitials: string;
  backgroundColor: string;
  order?: number;
}

interface GalleryState {
  artworks: Artwork[];
  annotations: Annotation[];
  history: HistoryRecord[];
  historyIndex: number;
  background: BackgroundConfig;
  selectedArtworkId: string | null;
  isLeftPanelCollapsed: boolean;
  isRightPanelCollapsed: boolean;
  isMobile: boolean;
  activeMobilePanel: 'none' | 'resources' | 'annotations' | 'timeline';
  isAnimating: boolean;

  addArtwork: (data: NewArtworkData) => void;
  moveArtwork: (id: string, x: number, y: number, saveToHistory?: boolean) => void;
  updateArtwork: (id: string, updates: Partial<Artwork>) => void;
  deleteArtwork: (id: string) => void;
  selectArtwork: (id: string | null) => void;

  addAnnotation: (data: NewAnnotationData) => void;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  toggleAnnotationExpand: (id: string) => void;
  reorderAnnotations: (startIndex: number, endIndex: number) => void;

  setBackground: (config: BackgroundConfig) => void;
  setLeftPanelCollapsed: (collapsed: boolean) => void;
  setRightPanelCollapsed: (collapsed: boolean) => void;
  setMobilePanel: (panel: 'none' | 'resources' | 'annotations' | 'timeline') => void;
  setIsMobile: (isMobile: boolean) => void;
  setIsAnimating: (animating: boolean) => void;

  saveHistory: (type: HistoryType, description: string) => void;
  rollback: (index: number) => void;

  saveProject: () => string;
  loadProject: (data: string) => void;

  getAnnotationCountForArtwork: (artworkId: string) => number;
}

const MAX_HISTORY = 50;

const createDemoArtworks = (): Artwork[] => {
  const artworks: Artwork[] = [];
  const demoImages = [
    { name: '星空', color: '#1a237e' },
    { name: '向日葵', color: '#f57f17' },
    { name: '山水', color: '#2e7d32' },
    { name: '抽象画', color: '#c62828' },
    { name: '静物', color: '#6a1b9a' }
  ];

  demoImages.forEach((img, index) => {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 150;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createLinearGradient(0, 0, 200, 150);
      gradient.addColorStop(0, img.color);
      gradient.addColorStop(1, '#ffffff');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 200, 150);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(img.name, 100, 80);
    }

    artworks.push({
      id: generateId(),
      name: img.name,
      imageUrl: canvas.toDataURL(),
      x: 100 + (index % 3) * 220,
      y: 100 + Math.floor(index / 3) * 180,
      scale: 1,
      rotation: 0,
      frameStyle: 'simple-black',
      width: 200,
      height: 150
    });
  });

  return artworks;
};

const createDemoAnnotations = (artworkIds: string[]): Annotation[] => {
  const demoAuthors = [
    { name: '张明', color: '#e94560' },
    { name: '李华', color: '#3498db' },
    { name: '王芳', color: '#27ae60' }
  ];

  return [
    {
      id: generateId(),
      artworkId: artworkIds[0],
      content: '## 建议\n\n这张**星空**的位置可以**再往右移动50px**，和右侧的画作保持对齐。\n\n- [x] 调整位置\n- [ ] 确认灯光效果',
      author: demoAuthors[0].name,
      authorInitials: demoAuthors[0].name.charAt(0),
      backgroundColor: demoAuthors[0].color,
      createdAt: Date.now() - 180000,
      isExpanded: true,
      order: 0
    },
    {
      id: generateId(),
      artworkId: artworkIds[1],
      content: '**向日葵**的金色画框非常棒，和画面的暖色调很搭配！',
      author: demoAuthors[1].name,
      authorInitials: demoAuthors[1].name.charAt(0),
      backgroundColor: demoAuthors[1].color,
      createdAt: Date.now() - 60000,
      isExpanded: false,
      order: 1
    }
  ];
};

const initialArtworks = createDemoArtworks();
const initialAnnotations = createDemoAnnotations(initialArtworks.map(a => a.id));

const initialHistory: HistoryRecord[] = [{
  id: generateId(),
  type: 'add',
  description: '初始化项目',
  timestamp: Date.now(),
  artworks: JSON.parse(JSON.stringify(initialArtworks)),
  background: { type: 'solid', color: '#1a1a2e' }
}];

export const useGalleryStore = create<GalleryState>((set, get) => ({
  artworks: initialArtworks,
  annotations: initialAnnotations,
  history: initialHistory,
  historyIndex: 0,
  background: { type: 'solid', color: '#1a1a2e' },
  selectedArtworkId: null,
  isLeftPanelCollapsed: false,
  isRightPanelCollapsed: false,
  isMobile: false,
  activeMobilePanel: 'none',
  isAnimating: false,

  addArtwork: (data) => {
    const newArtwork: Artwork = {
      id: generateId(),
      name: data.name,
      imageUrl: data.imageUrl,
      x: data.x ?? 100,
      y: data.y ?? 100,
      scale: 1,
      rotation: 0,
      frameStyle: 'none',
      width: data.width,
      height: data.height
    };
    set((state) => ({ artworks: [...state.artworks, newArtwork] }));
    get().saveHistory('add', `添加画作「${data.name}」`);
  },

  moveArtwork: (id, x, y, saveToHistory = true) => {
    set((state) => ({
      artworks: state.artworks.map((a) =>
        a.id === id ? { ...a, x: clamp(x, 0, 2000), y: clamp(y, 0, 2000) } : a
      )
    }));
    if (saveToHistory) {
      const artwork = get().artworks.find((a) => a.id === id);
      if (artwork) {
        get().saveHistory('move', `移动「${artwork.name}」`);
      }
    }
  },

  updateArtwork: (id, updates) => {
    set((state) => ({
      artworks: state.artworks.map((a) =>
        a.id === id
          ? {
              ...a,
              ...updates,
              scale: updates.scale !== undefined ? clamp(updates.scale, 0.5, 2) : a.scale,
              rotation: updates.rotation !== undefined ? ((updates.rotation % 360) + 360) % 360 : a.rotation
            }
          : a
      )
    }));
    const artwork = get().artworks.find((a) => a.id === id);
    if (artwork) {
      let desc = `更新「${artwork.name}」`;
      if (updates.frameStyle) desc = `更换「${artwork.name}」画框`;
      if (updates.scale !== undefined) desc = `缩放「${artwork.name}」`;
      if (updates.rotation !== undefined) desc = `旋转「${artwork.name}」`;
      get().saveHistory('update', desc);
    }
  },

  deleteArtwork: (id) => {
    const artwork = get().artworks.find((a) => a.id === id);
    set((state) => ({
      artworks: state.artworks.filter((a) => a.id !== id),
      annotations: state.annotations.filter((a) => a.artworkId !== id),
      selectedArtworkId: state.selectedArtworkId === id ? null : state.selectedArtworkId
    }));
    if (artwork) {
      get().saveHistory('delete', `删除「${artwork.name}」`);
    }
  },

  selectArtwork: (id) => {
    set({ selectedArtworkId: id });
  },

  addAnnotation: (data) => {
    const newAnnotation: Annotation = {
      id: generateId(),
      artworkId: data.artworkId,
      content: data.content,
      author: data.author,
      authorInitials: data.authorInitials,
      backgroundColor: data.backgroundColor,
      createdAt: Date.now(),
      isExpanded: true,
      order: data.order ?? get().annotations.length
    };
    set((state) => ({ annotations: [...state.annotations, newAnnotation] }));
  },

  updateAnnotation: (id, updates) => {
    set((state) => ({
      annotations: state.annotations.map((a) =>
        a.id === id ? { ...a, ...updates } : a
      )
    }));
  },

  toggleAnnotationExpand: (id) => {
    set((state) => ({
      annotations: state.annotations.map((a) =>
        a.id === id ? { ...a, isExpanded: !a.isExpanded } : a
      )
    }));
  },

  reorderAnnotations: (startIndex, endIndex) => {
    set((state) => {
      const result = Array.from(state.annotations);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return { annotations: result.map((a, i) => ({ ...a, order: i })) };
    });
  },

  setBackground: (config) => {
    set({ background: config });
    get().saveHistory('background', '更新画布背景');
  },

  setLeftPanelCollapsed: (collapsed) => {
    set({ isLeftPanelCollapsed: collapsed });
  },

  setRightPanelCollapsed: (collapsed) => {
    set({ isRightPanelCollapsed: collapsed });
  },

  setMobilePanel: (panel) => {
    set({ activeMobilePanel: panel });
  },

  setIsMobile: (isMobile) => {
    set({ isMobile });
  },

  setIsAnimating: (animating) => {
    set({ isAnimating: animating });
  },

  saveHistory: (type, description) => {
    set((state) => {
      const newRecord: HistoryRecord = {
        id: generateId(),
        type,
        description,
        timestamp: Date.now(),
        artworks: JSON.parse(JSON.stringify(state.artworks)),
        background: JSON.parse(JSON.stringify(state.background))
      };

      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(newRecord);

      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
      }

      return {
        history: newHistory,
        historyIndex: newHistory.length - 1
      };
    });
  },

  rollback: (index) => {
    const state = get();
    if (index < 0 || index >= state.history.length) return;

    const record = state.history[index];
    set({ isAnimating: true });

    setTimeout(() => {
      set({
        artworks: JSON.parse(JSON.stringify(record.artworks)),
        background: JSON.parse(JSON.stringify(record.background)),
        historyIndex: index,
        isAnimating: false
      });
      get().saveHistory('rollback', `回滚到「${record.description}」`);
    }, 500);
  },

  saveProject: () => {
    const state = get();
    const projectData = {
      artworks: state.artworks,
      annotations: state.annotations,
      background: state.background,
      savedAt: Date.now()
    };
    const jsonStr = JSON.stringify(projectData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gallery-project-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    return jsonStr;
  },

  loadProject: (jsonStr) => {
    try {
      const data = JSON.parse(jsonStr);
      if (data.artworks && Array.isArray(data.artworks)) {
        set({
          artworks: data.artworks,
          annotations: data.annotations || [],
          background: data.background || { type: 'solid', color: '#1a1a2e' },
          history: [
            {
              id: generateId(),
              type: 'add',
              description: '加载项目',
              timestamp: Date.now(),
              artworks: JSON.parse(JSON.stringify(data.artworks)),
              background: JSON.parse(JSON.stringify(data.background || { type: 'solid', color: '#1a1a2e' }))
            }
          ],
          historyIndex: 0
        });
      }
    } catch (e) {
      console.error('Failed to load project:', e);
    }
  },

  getAnnotationCountForArtwork: (artworkId) => {
    return get().annotations.filter((a) => a.artworkId === artworkId).length;
  }
}));
