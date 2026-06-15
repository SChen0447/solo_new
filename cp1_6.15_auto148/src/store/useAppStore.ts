import { create } from 'zustand';
import type {
  ColorData,
  VariantParams,
  HistoryItem,
  ExportFormat,
} from '../types';
import {
  kmeansExtractColors,
  createImageDataFromFile,
} from '../modules/color-extraction/ColorExtractor';
import { generateVariants } from '../modules/variants/VariantGenerator';
import {
  addHistoryItem,
  loadHistory,
  generateId,
  findHistoryById,
  clearHistory as clearStorageHistory,
} from '../history/HistoryManager';

interface AppState {
  uploadedImage: string | null;
  thumbnail: string | null;
  isDragging: boolean;
  extractedColors: ColorData[];
  isExtracting: boolean;
  selectedColorIndex: number;
  variantParams: VariantParams;
  variants: ColorData[];
  selectedVariantIndex: number;
  history: HistoryItem[];
  isHistoryOpen: boolean;
  copiedIndex: string | null;
  activePopup: { color: ColorData; index: number } | null;
  historyId: string | null;

  setDragging: (v: boolean) => void;
  handleFileUpload: (file: File) => Promise<void>;
  setSelectedColorIndex: (i: number) => void;
  setSelectedVariantIndex: (i: number) => void;
  updateVariantParams: (p: Partial<VariantParams>) => void;
  setVariants: (v: ColorData[]) => void;
  copyHex: (hex: string, key: string) => void;
  showPopup: (color: ColorData, index: number) => void;
  hidePopup: () => void;
  toggleHistory: () => void;
  restoreFromHistory: (id: string) => void;
  clearHistory: () => void;
  exportPalette: (format: ExportFormat) => void;
  ensureSavedToHistory: () => void;
  updateCurrentHistoryThumbnail: (thumbnail: string) => void;
}

const defaultVariantParams: VariantParams = {
  hueShift: 0,
  saturationShift: 0,
  lightnessShift: 0,
};

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const useAppStore = create<AppState>((set, get) => ({
  uploadedImage: null,
  thumbnail: null,
  isDragging: false,
  extractedColors: [],
  isExtracting: false,
  selectedColorIndex: 0,
  variantParams: defaultVariantParams,
  variants: [],
  selectedVariantIndex: 0,
  history: loadHistory(),
  isHistoryOpen: false,
  copiedIndex: null,
  activePopup: null,
  historyId: null,

  setDragging: (v) => set({ isDragging: v }),

  handleFileUpload: async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    set({ isExtracting: true });

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      const uploadedImage = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });

      const { imageData, thumbnail } = await createImageDataFromFile(file, 120);
      const colors = kmeansExtractColors(imageData, 5, 18);

      const defaultParams: VariantParams = {
        hueShift: 0,
        saturationShift: 0,
        lightnessShift: 0,
      };
      const variants = colors.length > 0
        ? generateVariants(colors[0], defaultParams, 5)
        : [];

      set({
        uploadedImage,
        thumbnail,
        extractedColors: colors,
        selectedColorIndex: 0,
        variantParams: defaultParams,
        variants,
        selectedVariantIndex: 0,
        isExtracting: false,
        historyId: null,
      });

      get().ensureSavedToHistory();
    } catch (err) {
      console.error('Upload error:', err);
      set({ isExtracting: false });
    }
  },

  setSelectedColorIndex: (i) => {
    const { extractedColors, variantParams } = get();
    const color = extractedColors[i];
    if (!color) return;
    const variants = generateVariants(color, variantParams, 5);
    set({ selectedColorIndex: i, variants, selectedVariantIndex: 0 });
    get().ensureSavedToHistory();
  },

  setSelectedVariantIndex: (i) => set({ selectedVariantIndex: i }),

  updateVariantParams: (p) => {
    const { variantParams, extractedColors, selectedColorIndex } = get();
    const nextParams = { ...variantParams, ...p };
    const color = extractedColors[selectedColorIndex];
    if (!color) {
      set({ variantParams: nextParams });
      return;
    }
    set({ variantParams: nextParams });
    get().ensureSavedToHistory();
  },

  setVariants: (v) => set({ variants: v }),

  copyHex: (hex, key) => {
    set({ copiedIndex: key });
    setTimeout(() => {
      const curr = get().copiedIndex;
      if (curr === key) set({ copiedIndex: null });
    }, 1400);
  },

  showPopup: (color, index) => set({ activePopup: { color, index } }),
  hidePopup: () => set({ activePopup: null }),

  toggleHistory: () => set((s) => ({ isHistoryOpen: !s.isHistoryOpen })),

  restoreFromHistory: (id) => {
    const item = findHistoryById(id);
    if (!item) return;
    set({
      thumbnail: item.thumbnail,
      extractedColors: item.extractedColors,
      selectedColorIndex: item.selectedColorIndex,
      variantParams: item.variantParams,
      variants: item.variants,
      selectedVariantIndex: 0,
      historyId: item.id,
      uploadedImage: item.thumbnail,
      isHistoryOpen: false,
    });
  },

  clearHistory: () => {
    const cleared = clearStorageHistory();
    set({ history: cleared, historyId: null });
  },

  exportPalette: (format) => {
    const { extractedColors, variants } = get();
    const timestamp = new Date();
    const stampStr = timestamp
      .toISOString()
      .slice(0, 19)
      .replace(/[:T]/g, '-');

    if (format === 'json') {
      const data = {
        name: `Watercolor Palette ${stampStr}`,
        createdAt: timestamp.toISOString(),
        primaryColors: extractedColors.map((c) => ({
          name: c.name || '',
          hex: c.hex,
          rgb: c.rgb,
          hsl: c.hsl,
          percentage: c.percentage || 0,
        })),
        variantColors: variants.map((c) => ({
          name: c.name || '',
          hex: c.hex,
          rgb: c.rgb,
          hsl: c.hsl,
        })),
      };
      downloadFile(
        JSON.stringify(data, null, 2),
        `palette-${stampStr}.json`,
        'application/json'
      );
    } else if (format === 'css') {
      const lines: string[] = [':root {'];
      extractedColors.forEach((c, i) => {
        const name = (c.name || `primary-${i + 1}`)
          .replace(/\s+/g, '-')
          .toLowerCase();
        lines.push(
          `  --color-primary-${i + 1}-${name}: ${c.hex};`
        );
      });
      variants.forEach((c, i) => {
        const name = (c.name || `variant-${i + 1}`)
          .replace(/\s+/g, '-')
          .toLowerCase();
        lines.push(
          `  --color-variant-${i + 1}-${name}: ${c.hex};`
        );
      });
      lines.push('}');
      downloadFile(
        lines.join('\n'),
        `palette-${stampStr}.css`,
        'text/css'
      );
    } else if (format === 'sketch') {
      const allColors = [...extractedColors, ...variants];
      const paletteContent = buildSketchClrContent(allColors);
      downloadFile(
        paletteContent,
        `palette-${stampStr}.clr`,
        'application/octet-stream'
      );
    }
  },

  ensureSavedToHistory: () => {
    const s = get();
    if (s.extractedColors.length === 0) return;

    if (s.historyId) {
      const updated = s.history.map((h) =>
        h.id === s.historyId
          ? {
              ...h,
              extractedColors: s.extractedColors,
              selectedColorIndex: s.selectedColorIndex,
              variantParams: s.variantParams,
              variants: s.variants,
              timestamp: Date.now(),
              thumbnail: s.thumbnail || h.thumbnail,
            }
          : h
      );
      const saved = (function () {
        try {
          localStorage.setItem(
            'watercolor_palette_history',
            JSON.stringify(updated.slice(0, 10))
          );
          return updated.slice(0, 10);
        } catch {
          return updated;
        }
      })();
      set({ history: saved });
    } else {
      const item: HistoryItem = {
        id: generateId(),
        timestamp: Date.now(),
        thumbnail: s.thumbnail || '',
        extractedColors: s.extractedColors,
        selectedColorIndex: s.selectedColorIndex,
        variantParams: s.variantParams,
        variants: s.variants,
      };
      const saved = addHistoryItem(item);
      set({ history: saved, historyId: item.id });
    }
  },

  updateCurrentHistoryThumbnail: (thumbnail) => {
    set({ thumbnail });
    get().ensureSavedToHistory();
  },
}));

function buildSketchClrContent(colors: ColorData[]): string {
  const xmlHeader =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n';
  const items = colors
    .map((c, i) => {
      const r = (c.rgb.r / 255).toFixed(6);
      const g = (c.rgb.g / 255).toFixed(6);
      const b = (c.rgb.b / 255).toFixed(6);
      const name = c.name || `Color ${i + 1}`;
      return `    <dict>
      <key>color</key>
      <dict>
        <key>alpha</key><real>1.0</real>
        <key>blue</key><real>${b}</real>
        <key>green</key><real>${g}</real>
        <key>red</key><real>${r}</real>
        <key>colorSpace</key><string>sRGB</string>
      </dict>
      <key>name</key><string>${name}</string>
    </dict>`;
    })
    .join('\n');
  return `${xmlHeader}<plist version="1.0">
<array>
${items}
</array>
</plist>`;
}
