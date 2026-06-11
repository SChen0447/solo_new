import { create } from 'zustand';
import type { CanvasComponent, CanvasState, ExportSize, Template, ComponentType } from '../types';
import { DEFAULT_EXPORT_SIZES } from '../types';
import { generateId } from '../utils/helpers';

interface CanvasStore extends CanvasState {
  exportSizes: ExportSize[];
  isExporting: boolean;
  exportProgress: number;
  editingTextId: string | null;

  setCanvasSize: (width: number, height: number) => void;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;

  addComponent: (type: ComponentType, x?: number, y?: number) => void;
  addComponentFromData: (component: CanvasComponent) => void;
  updateComponent: (id: string, updates: Partial<CanvasComponent>) => void;
  deleteComponent: (id: string) => void;
  duplicateComponent: (id: string) => void;
  selectComponent: (id: string | null) => void;
  reorderComponents: (fromIndex: number, toIndex: number) => void;
  toggleVisibility: (id: string) => void;
  toggleLock: (id: string) => void;
  setComponents: (components: CanvasComponent[]) => void;

  toggleExportSize: (id: string) => void;
  setExportProgress: (progress: number) => void;
  setIsExporting: (isExporting: boolean) => void;

  setEditingTextId: (id: string | null) => void;

  loadTemplate: (template: Template) => void;
  saveAsTemplate: (name: string) => Template;
  loadTemplateFromJson: (json: string) => void;
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  width: 1080,
  height: 1920,
  components: [],
  selectedId: null,
  zoom: 0.5,
  panX: 0,
  panY: 0,
  exportSizes: [...DEFAULT_EXPORT_SIZES],
  isExporting: false,
  exportProgress: 0,
  editingTextId: null,

  setCanvasSize: (width, height) => set({ width, height }),

  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(3, zoom)) }),

  setPan: (x, y) => set({ panX: x, panY: y }),

  addComponent: (type, x, y) => {
    const state = get();
    const baseX = x ?? state.width / 2 - 100;
    const baseY = y ?? state.height / 2 - 50;
    const id = generateId();
    const zIndex = state.components.length + 1;
    const typeNames: Record<ComponentType, string> = {
      text: '文本',
      image: '图片',
      rect: '矩形',
      circle: '圆形',
    };

    let newComponent: CanvasComponent;
    switch (type) {
      case 'text':
        newComponent = {
          id,
          type: 'text',
          x: baseX,
          y: baseY,
          width: 300,
          height: 80,
          rotation: 0,
          opacity: 1,
          visible: true,
          locked: false,
          name: `${typeNames[type]} ${zIndex}`,
          zIndex,
          content: '双击编辑文字',
          fontSize: 48,
          fontFamily: 'Noto Sans SC',
          fontWeight: 'normal',
          fontStyle: 'normal',
          textDecoration: 'none',
          lineHeight: 1.5,
          textAlign: 'center',
          color: '#333333',
          backgroundColor: 'transparent',
        };
        break;
      case 'image':
        newComponent = {
          id,
          type: 'image',
          x: baseX,
          y: baseY,
          width: 200,
          height: 200,
          rotation: 0,
          opacity: 1,
          visible: true,
          locked: false,
          name: `${typeNames[type]} ${zIndex}`,
          zIndex,
          src: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&h=400&fit=crop',
        };
        break;
      case 'rect':
        newComponent = {
          id,
          type: 'rect',
          x: baseX,
          y: baseY,
          width: 200,
          height: 150,
          rotation: 0,
          opacity: 1,
          visible: true,
          locked: false,
          name: `${typeNames[type]} ${zIndex}`,
          zIndex,
          fill: '#1A237E',
          stroke: 'transparent',
          strokeWidth: 0,
          borderRadius: 8,
        };
        break;
      case 'circle':
        newComponent = {
          id,
          type: 'circle',
          x: baseX,
          y: baseY,
          width: 150,
          height: 150,
          rotation: 0,
          opacity: 1,
          visible: true,
          locked: false,
          name: `${typeNames[type]} ${zIndex}`,
          zIndex,
          fill: '#FF6F00',
          stroke: 'transparent',
          strokeWidth: 0,
        };
        break;
      default:
        return;
    }

    set({
      components: [...state.components, newComponent],
      selectedId: id,
    });
  },

  addComponentFromData: (component) => {
    const state = get();
    set({
      components: [...state.components, component],
      selectedId: component.id,
    });
  },

  updateComponent: (id, updates) => {
    set((state) => ({
      components: state.components.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    }));
  },

  deleteComponent: (id) => {
    set((state) => {
      const newComponents = state.components
        .filter((c) => c.id !== id)
        .map((c, i) => ({ ...c, zIndex: i + 1 }));
      return {
        components: newComponents,
        selectedId: state.selectedId === id ? null : state.selectedId,
      };
    });
  },

  duplicateComponent: (id) => {
    const state = get();
    const comp = state.components.find((c) => c.id === id);
    if (!comp) return;
    const newId = generateId();
    const duplicated: CanvasComponent = {
      ...comp,
      id: newId,
      x: comp.x + 20,
      y: comp.y + 20,
      zIndex: state.components.length + 1,
      name: `${comp.name} 副本`,
    };
    set({
      components: [...state.components, duplicated],
      selectedId: newId,
    });
  },

  selectComponent: (id) => set({ selectedId: id }),

  reorderComponents: (fromIndex, toIndex) => {
    set((state) => {
      const sorted = [...state.components].sort((a, b) => a.zIndex - b.zIndex);
      const [removed] = sorted.splice(fromIndex, 1);
      sorted.splice(toIndex, 0, removed);
      const reindexed = sorted.map((c, i) => ({ ...c, zIndex: i + 1 }));
      return { components: reindexed };
    });
  },

  toggleVisibility: (id) => {
    set((state) => ({
      components: state.components.map((c) =>
        c.id === id ? { ...c, visible: !c.visible } : c
      ),
    }));
  },

  toggleLock: (id) => {
    set((state) => ({
      components: state.components.map((c) =>
        c.id === id ? { ...c, locked: !c.locked } : c
      ),
    }));
  },

  setComponents: (components) => set({ components }),

  toggleExportSize: (id) => {
    set((state) => ({
      exportSizes: state.exportSizes.map((s) =>
        s.id === id ? { ...s, selected: !s.selected } : s
      ),
    }));
  },

  setExportProgress: (progress) => set({ exportProgress: progress }),

  setIsExporting: (isExporting) => set({ isExporting }),

  setEditingTextId: (id) => set({ editingTextId: id }),

  loadTemplate: (template) => {
    set({
      width: template.canvasWidth,
      height: template.canvasHeight,
      components: template.components.map((c, i) => ({ ...c, zIndex: i + 1 })),
      selectedId: null,
      zoom: 0.5,
      panX: 0,
      panY: 0,
    });
  },

  saveAsTemplate: (name) => {
    const state = get();
    return {
      id: generateId(),
      name,
      canvasWidth: state.width,
      canvasHeight: state.height,
      components: state.components,
    };
  },

  loadTemplateFromJson: (json) => {
    try {
      const template = JSON.parse(json) as Template;
      get().loadTemplate(template);
    } catch (e) {
      console.error('Failed to parse template JSON:', e);
    }
  },
}));
