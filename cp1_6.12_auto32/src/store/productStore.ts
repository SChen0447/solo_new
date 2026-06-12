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
  compatibleWith: AccessoryId[];
  incompatibleWith: AccessoryId[];
  position: [number, number, number];
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
  message: string;
}

interface ProductState {
  currentConfig: ProductConfig;
  defaultConfig: ProductConfig;
  savedDesigns: SavedDesign[];
  availableAccessories: Accessory[];
  colorPalette: string[];
  materialOptions: MaterialType[];
  activePart: PartName;
  isResetting: boolean;
  warnings: ValidationWarning[];

  setPartColor: (part: PartName, color: string) => void;
  setPartMaterial: (part: PartName, material: MaterialType) => void;
  setActivePart: (part: PartName) => void;
  toggleAccessory: (id: AccessoryId) => void;
  validateAccessories: (accessories: AccessoryId[]) => ValidationWarning[];
  resetConfig: () => void;
  setResetting: (val: boolean) => void;
  saveDesign: (name: string, thumbnail: string) => void;
  loadDesign: (id: string) => void;
  deleteDesign: (id: string) => void;
  clearWarnings: () => void;
  initData: () => Promise<void>;
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
    description: '优雅花瓣造型的灯罩，搭配装饰环效果更佳',
    attachTo: 'shade',
    compatibleWith: ['deco-ring'],
    incompatibleWith: [],
    position: [0, 2.85, 0],
  },
  {
    id: 'shade-cone',
    name: '锥形灯罩',
    description: '极简锥形灯罩，现代风格之选',
    attachTo: 'shade',
    compatibleWith: [],
    incompatibleWith: ['deco-ring'],
    position: [0, 2.85, 0],
  },
  {
    id: 'deco-ring',
    name: '装饰环',
    description: '精致金属装饰环，仅适配花形灯罩',
    attachTo: 'pole',
    compatibleWith: ['shade-flower'],
    incompatibleWith: ['shade-cone'],
    position: [0, 2.2, 0],
  },
  {
    id: 'base-extender',
    name: '底座加高垫',
    description: '加高底座垫片，提升台灯整体高度',
    attachTo: 'base',
    compatibleWith: ['shade-flower', 'shade-cone', 'deco-ring'],
    incompatibleWith: [],
    position: [0, 0.08, 0],
  },
];

const COLOR_PALETTE = [
  '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71',
  '#1abc9c', '#3498db', '#9b59b6', '#e91e63',
  '#4a4a4a', '#c0c0c0', '#f5f5dc', '#ffffff',
];

const MATERIAL_OPTIONS: MaterialType[] = ['metal', 'plastic', 'matte', 'glossy'];

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

export const useProductStore = create<ProductState>((set, get) => ({
  currentConfig: { ...DEFAULT_CONFIG, base: { ...DEFAULT_CONFIG.base }, pole: { ...DEFAULT_CONFIG.pole }, shade: { ...DEFAULT_CONFIG.shade }, accessories: [] },
  defaultConfig: { ...DEFAULT_CONFIG, base: { ...DEFAULT_CONFIG.base }, pole: { ...DEFAULT_CONFIG.pole }, shade: { ...DEFAULT_CONFIG.shade }, accessories: [] },
  savedDesigns: loadSavedDesigns(),
  availableAccessories: DEFAULT_ACCESSORIES,
  colorPalette: COLOR_PALETTE,
  materialOptions: MATERIAL_OPTIONS,
  activePart: 'base',
  isResetting: false,
  warnings: [],

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
    let newAccessories: AccessoryId[];

    if (isActive) {
      newAccessories = state.currentConfig.accessories.filter((a) => a !== id);
    } else {
      newAccessories = [...state.currentConfig.accessories, id];
    }

    const warnings = get().validateAccessories(newAccessories);
    set({
      currentConfig: { ...state.currentConfig, accessories: newAccessories },
      warnings,
    });
  },

  validateAccessories: (accessories) => {
    const state = get();
    const warnings: ValidationWarning[] = [];
    const allAccessories = state.availableAccessories;

    for (const accId of accessories) {
      const acc = allAccessories.find((a) => a.id === accId);
      if (!acc) continue;

      for (const incompatId of acc.incompatibleWith) {
        if (accessories.includes(incompatId)) {
          const incompatAcc = allAccessories.find((a) => a.id === incompatId);
          warnings.push({
            accessoryId: accId,
            message: `"${acc.name}" 与 "${incompatAcc?.name}" 不兼容，装饰环仅适配花形灯罩`,
          });
        }
      }
    }

    return warnings;
  },

  resetConfig: () => {
    set({ isResetting: true });
    setTimeout(() => {
      set((state) => ({
        currentConfig: {
          base: { ...state.defaultConfig.base },
          pole: { ...state.defaultConfig.pole },
          shade: { ...state.defaultConfig.shade },
          accessories: [],
        },
        warnings: [],
      }));
      setTimeout(() => {
        set({ isResetting: false });
      }, 500);
    }, 500);
  },

  setResetting: (val) => set({ isResetting: val }),

  saveDesign: (name, thumbnail) => {
    const state = get();
    if (state.savedDesigns.length >= 5) {
      return false;
    }
    const design: SavedDesign = {
      id: uuidv4(),
      name,
      config: {
        base: { ...state.currentConfig.base },
        pole: { ...state.currentConfig.pole },
        shade: { ...state.currentConfig.shade },
        accessories: [...state.currentConfig.accessories],
      },
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
        currentConfig: {
          base: { ...design.config.base },
          pole: { ...design.config.pole },
          shade: { ...design.config.shade },
          accessories: [...design.config.accessories],
        },
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

  initData: async () => {
    try {
      const [configRes, accessoriesRes, colorsRes, materialsRes] = await Promise.all([
        fetch('/api/product/default'),
        fetch('/api/accessories'),
        fetch('/api/colors'),
        fetch('/api/materials'),
      ]);

      const [configData, accessoriesData, colorsData, materialsData] = await Promise.all([
        configRes.json(),
        accessoriesRes.json(),
        colorsRes.json(),
        materialsRes.json(),
      ]);

      set({
        currentConfig: configData.config,
        defaultConfig: configData.config,
        availableAccessories: accessoriesData.accessories,
        colorPalette: colorsData.colors,
        materialOptions: materialsData.materials,
      });
    } catch {
      set({
        currentConfig: { ...DEFAULT_CONFIG, base: { ...DEFAULT_CONFIG.base }, pole: { ...DEFAULT_CONFIG.pole }, shade: { ...DEFAULT_CONFIG.shade }, accessories: [] },
        defaultConfig: { ...DEFAULT_CONFIG, base: { ...DEFAULT_CONFIG.base }, pole: { ...DEFAULT_CONFIG.pole }, shade: { ...DEFAULT_CONFIG.shade }, accessories: [] },
      });
    }
  },
}));
