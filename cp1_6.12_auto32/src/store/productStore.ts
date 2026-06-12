import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export type MaterialType = 'metal' | 'plastic' | 'matte' | 'glossy';
export type PartName = 'base' | 'pole' | 'shade';
export type AccessoryId = 'shade-flower' | 'shade-cone' | 'deco-ring' | 'base-extender';

export interface PartConfig {
  color: string;
  material: MaterialType;
}

export interface Accessory {
  id: AccessoryId;
  name: string;
  description: string;
  attachTo: PartName;
  positionOffset: [number, number, number];
  thumbnail: string;
}

export interface ProductConfig {
  base: PartConfig;
  pole: PartConfig;
  shade: PartConfig;
  accessories: AccessoryId[];
}

export interface SavedDesign {
  id: string;
  name: string;
  config: ProductConfig;
  thumbnail: string;
  timestamp: number;
}

export interface ValidationWarning {
  accessoryId: AccessoryId;
  blockedBy: AccessoryId;
  message: string;
}

export type ResetPhase = 'idle' | 'fade-out' | 'switching' | 'fade-in';

export interface CompatibilityRule {
  id: string;
  accessoryA: AccessoryId;
  accessoryB: AccessoryId;
  compatible: boolean;
  message: string;
}

const COMPATIBILITY_RULES: CompatibilityRule[] = [
  {
    id: 'deco-ring-incompatible-cone',
    accessoryA: 'deco-ring',
    accessoryB: 'shade-cone',
    compatible: false,
    message: '装饰环仅适配花形灯罩，无法与锥形灯罩同时使用',
  },
  {
    id: 'deco-ring-requires-flower',
    accessoryA: 'deco-ring',
    accessoryB: 'shade-flower',
    compatible: true,
    message: '',
  },
];

export function validateAccessories(
  accessories: AccessoryId[],
  rules: CompatibilityRule[] = COMPATIBILITY_RULES
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  for (const rule of rules) {
    if (rule.compatible) continue;

    const hasA = accessories.includes(rule.accessoryA);
    const hasB = accessories.includes(rule.accessoryB);

    if (hasA && hasB) {
      warnings.push({
        accessoryId: rule.accessoryA,
        blockedBy: rule.accessoryB,
        message: rule.message,
      });
      warnings.push({
        accessoryId: rule.accessoryB,
        blockedBy: rule.accessoryA,
        message: rule.message,
      });
    }
  }

  return warnings;
}

const DEFAULT_CONFIG: ProductConfig = {
  base: { color: '#4a4a4a', material: 'matte' },
  pole: { color: '#c0c0c0', material: 'metal' },
  shade: { color: '#f5f5dc', material: 'glossy' },
  accessories: [],
};

const DEFAULT_ACCESSORIES: Accessory[] = [
  {
    id: 'shade-flower',
    name: '花形灯罩',
    description: '优雅花瓣造型灯罩，搭配装饰环效果更佳',
    attachTo: 'shade',
    positionOffset: [0, 0, 0],
    thumbnail: '🌸',
  },
  {
    id: 'shade-cone',
    name: '锥形灯罩',
    description: '极简锥形灯罩，现代风格之选',
    attachTo: 'shade',
    positionOffset: [0, 0, 0],
    thumbnail: '🔺',
  },
  {
    id: 'deco-ring',
    name: '装饰环',
    description: '精致金属装饰环，仅适配花形灯罩',
    attachTo: 'pole',
    positionOffset: [0, 1.8, 0],
    thumbnail: '💍',
  },
  {
    id: 'base-extender',
    name: '底座加高垫',
    description: '加高底座垫片，提升台灯整体高度',
    attachTo: 'base',
    positionOffset: [0, 0.3, 0],
    thumbnail: '⬆️',
  },
];

const COLOR_PALETTE = [
  '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71',
  '#1abc9c', '#3498db', '#9b59b6', '#e91e63',
  '#4a4a4a', '#c0c0c0', '#f5f5dc', '#ffffff',
];

const MATERIAL_OPTIONS: MaterialType[] = ['metal', 'plastic', 'matte', 'glossy'];

const RESET_FADE_DURATION = 1000;

function loadSavedDesigns(): SavedDesign[] {
  try {
    const data = localStorage.getItem('3d-config-designs');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function persistDesigns(designs: SavedDesign[]) {
  localStorage.setItem('3d-config-designs', JSON.stringify(designs));
}

function cloneConfig(config: ProductConfig): ProductConfig {
  return {
    base: { ...config.base },
    pole: { ...config.pole },
    shade: { ...config.shade },
    accessories: [...config.accessories],
  };
}

interface ProductState {
  currentConfig: ProductConfig;
  defaultConfig: ProductConfig;
  savedDesigns: SavedDesign[];
  availableAccessories: Accessory[];
  compatibilityRules: CompatibilityRule[];
  colorPalette: string[];
  materialOptions: MaterialType[];
  activePart: PartName;
  resetPhase: ResetPhase;
  warnings: ValidationWarning[];
  panelCollapsed: boolean;

  setPartColor: (part: PartName, color: string) => void;
  setPartMaterial: (part: PartName, material: MaterialType) => void;
  setActivePart: (part: PartName) => void;
  toggleAccessory: (id: AccessoryId) => void;
  resetConfig: () => void;
  saveDesign: (name: string, thumbnail: string) => boolean;
  loadDesign: (id: string) => void;
  deleteDesign: (id: string) => void;
  clearWarnings: () => void;
  setResetPhase: (phase: ResetPhase) => void;
  setPanelCollapsed: (collapsed: boolean) => void;
}

export const useProductStore = create<ProductState>((set, get) => ({
  currentConfig: cloneConfig(DEFAULT_CONFIG),
  defaultConfig: cloneConfig(DEFAULT_CONFIG),
  savedDesigns: loadSavedDesigns(),
  availableAccessories: DEFAULT_ACCESSORIES,
  compatibilityRules: COMPATIBILITY_RULES,
  colorPalette: COLOR_PALETTE,
  materialOptions: MATERIAL_OPTIONS,
  activePart: 'base',
  resetPhase: 'idle',
  warnings: [],
  panelCollapsed: false,

  setPartColor: (part, color) =>
    set((state) => ({
      currentConfig: {
        ...state.currentConfig,
        [part]: { ...state.currentConfig[part], color },
      },
    })),

  setPartMaterial: (part, material) =>
    set((state) => ({
      currentConfig: {
        ...state.currentConfig,
        [part]: { ...state.currentConfig[part], material },
      },
    })),

  setActivePart: (part) => set({ activePart: part }),

  toggleAccessory: (id) => {
    const state = get();
    const isActive = state.currentConfig.accessories.includes(id);
    const newAccessories = isActive
      ? state.currentConfig.accessories.filter((a) => a !== id)
      : [...state.currentConfig.accessories, id];

    const warnings = validateAccessories(newAccessories, state.compatibilityRules);

    set({
      currentConfig: { ...state.currentConfig, accessories: newAccessories },
      warnings,
    });
  },

  resetConfig: () => {
    const state = get();
    if (state.resetPhase !== 'idle') return;

    set({ resetPhase: 'fade-out' });

    setTimeout(() => {
      set({ resetPhase: 'switching' });
      set({
        currentConfig: cloneConfig(state.defaultConfig),
        warnings: [],
      });

      requestAnimationFrame(() => {
        set({ resetPhase: 'fade-in' });

        setTimeout(() => {
          set({ resetPhase: 'idle' });
        }, RESET_FADE_DURATION / 2);
      });
    }, RESET_FADE_DURATION / 2);
  },

  setResetPhase: (phase) => set({ resetPhase: phase }),

  saveDesign: (name, thumbnail) => {
    const state = get();
    if (state.savedDesigns.length >= 5) {
      return false;
    }
    const design: SavedDesign = {
      id: uuidv4(),
      name,
      config: cloneConfig(state.currentConfig),
      thumbnail,
      timestamp: Date.now(),
    };
    const newDesigns = [design, ...state.savedDesigns];
    persistDesigns(newDesigns);
    set({ savedDesigns: newDesigns });
    return true;
  },

  loadDesign: (id) => {
    const state = get();
    const design = state.savedDesigns.find((d) => d.id === id);
    if (design) {
      set({
        currentConfig: cloneConfig(design.config),
        warnings: [],
      });
    }
  },

  deleteDesign: (id) => {
    const state = get();
    const newDesigns = state.savedDesigns.filter((d) => d.id !== id);
    persistDesigns(newDesigns);
    set({ savedDesigns: newDesigns });
  },

  clearWarnings: () => set({ warnings: [] }),

  setPanelCollapsed: (collapsed) => set({ panelCollapsed: collapsed }),
}));

export { COMPATIBILITY_RULES, DEFAULT_CONFIG, DEFAULT_ACCESSORIES, COLOR_PALETTE, MATERIAL_OPTIONS, RESET_FADE_DURATION };
