import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type {
  ColorSwatch,
  Palette,
  SvgLayerId,
  ColorMapping,
  AppToast,
  ExportFormat
} from '../types';

const PRESET_PALETTES: Palette[] = [
  {
    id: 'preset-warm',
    name: '暖阳',
    type: 'preset',
    colors: [
      { id: 'pw-1', hex: '#FF6B6B', name: '珊瑚红', createdAt: Date.now() },
      { id: 'pw-2', hex: '#FFA94D', name: '暖阳橙', createdAt: Date.now() },
      { id: 'pw-3', hex: '#FFD43B', name: '金黄', createdAt: Date.now() },
      { id: 'pw-4', hex: '#FF8787', name: '玫瑰粉', createdAt: Date.now() },
      { id: 'pw-5', hex: '#FA5252', name: '朱红', createdAt: Date.now() }
    ]
  },
  {
    id: 'preset-cool',
    name: '冷月',
    type: 'preset',
    colors: [
      { id: 'pc-1', hex: '#74C0FC', name: '天蓝', createdAt: Date.now() },
      { id: 'pc-2', hex: '#4DABF7', name: '湖蓝', createdAt: Date.now() },
      { id: 'pc-3', hex: '#339AF0', name: '宝石蓝', createdAt: Date.now() },
      { id: 'pc-4', hex: '#228BE6', name: '深海蓝', createdAt: Date.now() },
      { id: 'pc-5', hex: '#1971C2', name: '午夜蓝', createdAt: Date.now() }
    ]
  },
  {
    id: 'preset-forest',
    name: '森林',
    type: 'preset',
    colors: [
      { id: 'pf-1', hex: '#8CE99A', name: '嫩绿', createdAt: Date.now() },
      { id: 'pf-2', hex: '#69DB7C', name: '青草绿', createdAt: Date.now() },
      { id: 'pf-3', hex: '#40C057', name: '翠绿', createdAt: Date.now() },
      { id: 'pf-4', hex: '#2F9E44', name: '森林绿', createdAt: Date.now() },
      { id: 'pf-5', hex: '#2B8A3E', name: '松柏绿', createdAt: Date.now() }
    ]
  }
];

const DEFAULT_COLOR_MAPPING: ColorMapping = {
  background: '#F8F9FA',
  skin: '#FFE0C2',
  hair: '#5C3A21',
  shirt: '#1976D2',
  pants: '#343A40',
  shoes: '#495057'
};

interface ColorState {
  presetPalettes: Palette[];
  customColors: ColorSwatch[];
  favoriteColors: ColorSwatch[];
  selectedColor: string | null;
  selectedLayer: SvgLayerId | null;
  colorMapping: ColorMapping;
  toasts: AppToast[];
  addCustomColor: (hex: string, name?: string) => void;
  removeCustomColor: (id: string) => void;
  reorderCustomColors: (startIndex: number, endIndex: number) => void;
  toggleFavorite: (colorId: string, hex: string) => void;
  setSelectedColor: (hex: string | null) => void;
  setSelectedLayer: (layer: SvgLayerId | null) => void;
  applyColorToLayer: (color: string, layer: SvgLayerId) => void;
  addToast: (message: string, type: AppToast['type']) => void;
  removeToast: (id: string) => void;
  exportScheme: (format: ExportFormat) => string;
  resetColors: () => void;
}

export const useColorStore = create<ColorState>()(
  persist(
    (set, get) => ({
      presetPalettes: PRESET_PALETTES,
      customColors: [],
      favoriteColors: [],
      selectedColor: null,
      selectedLayer: null,
      colorMapping: DEFAULT_COLOR_MAPPING,
      toasts: [],

      addCustomColor: (hex, name) =>
        set((state) => ({
          customColors: [
            ...state.customColors,
            {
              id: uuidv4(),
              hex,
              name,
              createdAt: Date.now()
            }
          ]
        })),

      removeCustomColor: (id) =>
        set((state) => ({
          customColors: state.customColors.filter((c) => c.id !== id)
        })),

      reorderCustomColors: (startIndex, endIndex) =>
        set((state) => {
          const result = Array.from(state.customColors);
          const [removed] = result.splice(startIndex, 1);
          result.splice(endIndex, 0, removed);
          return { customColors: result };
        }),

      toggleFavorite: (colorId, hex) =>
        set((state) => {
          const exists = state.favoriteColors.find((c) => c.hex === hex);
          if (exists) {
            return {
              favoriteColors: state.favoriteColors.filter(
                (c) => c.hex !== hex
              )
            };
          }
          return {
            favoriteColors: [
              ...state.favoriteColors,
              {
                id: colorId || uuidv4(),
                hex,
                isFavorite: true,
                createdAt: Date.now()
              }
            ]
          };
        }),

      setSelectedColor: (hex) => set({ selectedColor: hex }),

      setSelectedLayer: (layer) => set({ selectedLayer: layer }),

      applyColorToLayer: (color, layer) =>
        set((state) => ({
          colorMapping: {
            ...state.colorMapping,
            [layer]: color
          }
        })),

      addToast: (message, type) => {
        const id = uuidv4();
        set((state) => ({
          toasts: [...state.toasts, { id, message, type, duration: 2000 }]
        }));
        setTimeout(() => {
          get().removeToast(id);
        }, 2000);
      },

      removeToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id)
        })),

      exportScheme: (format) => {
        const { colorMapping } = get();
        if (format === 'json') {
          const arr = Object.entries(colorMapping).map(([layer, hex]) => ({
            layer,
            hex
          }));
          return JSON.stringify(arr, null, 2);
        } else {
          return Object.entries(colorMapping)
            .map(([layer, hex]) => `--layer-${layer}: ${hex};`)
            .join('\n');
        }
      },

      resetColors: () => set({ colorMapping: DEFAULT_COLOR_MAPPING })
    }),
    {
      name: 'color-palette-storage',
      partialize: (state) => ({
        customColors: state.customColors,
        favoriteColors: state.favoriteColors,
        colorMapping: state.colorMapping
      })
    }
  )
);
