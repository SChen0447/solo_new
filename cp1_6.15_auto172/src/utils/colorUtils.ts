import type { ColorMapping, SvgLayer, SvgLayerId } from '../types';

export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const cleanHex = hex.replace('#', '');
  const result = /^([a-f\d]{3}|[a-f\d]{6})$/i.exec(cleanHex);
  if (!result) return null;

  let fullHex = cleanHex;
  if (fullHex.length === 3) {
    fullHex = fullHex
      .split('')
      .map((c) => c + c)
      .join('');
  }

  const intValue = parseInt(fullHex, 16);
  return {
    r: (intValue >> 16) & 255,
    g: (intValue >> 8) & 255,
    b: intValue & 255
  };
};

export const rgbToHex = (r: number, g: number, b: number): string => {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = (v: number) => clamp(v).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
};

const srgbToLinear = (c: number): number => {
  const srgb = c / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
};

export const getRelativeLuminance = (hex: string): number => {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const r = srgbToLinear(rgb.r);
  const g = srgbToLinear(rgb.g);
  const b = srgbToLinear(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const getContrastRatio = (hex1: string, hex2: string): number => {
  const l1 = getRelativeLuminance(hex1);
  const l2 = getRelativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
};

export const isContrastSufficient = (hex1: string, hex2: string): boolean => {
  return getContrastRatio(hex1, hex2) >= 4.5;
};

const hexToHsl = (hex: string): { h: number; s: number; l: number } => {
  const rgb = hexToRgb(hex);
  if (!rgb) return { h: 0, s: 0, l: 0 };

  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
};

const hslToHex = (h: number, s: number, l: number): string => {
  const hue = h / 360;
  const sat = s / 100;
  const lig = l / 100;

  if (sat === 0) {
    const val = Math.round(lig * 255);
    return rgbToHex(val, val, val);
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = lig < 0.5 ? lig * (1 + sat) : lig + sat - lig * sat;
  const p = 2 * lig - q;
  const r = Math.round(hue2rgb(p, q, hue + 1 / 3) * 255);
  const g = Math.round(hue2rgb(p, q, hue) * 255);
  const b = Math.round(hue2rgb(p, q, hue - 1 / 3) * 255);

  return rgbToHex(r, g, b);
};

export const generateShadePalette = (baseHex: string, count: number = 5): string[] => {
  const { h, s } = hexToHsl(baseHex);
  const shades: string[] = [];
  const lightnessSteps = [90, 75, 55, 35, 18];
  const actualCount = Math.min(count, lightnessSteps.length);

  for (let i = 0; i < actualCount; i++) {
    shades.push(hslToHex(h, Math.min(s * 1.05, 100), lightnessSteps[i]));
  }
  return shades;
};

export const isValidHex = (hex: string): boolean => {
  return /^#?([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/.test(hex);
};

export const isValidRgb = (r: number, g: number, b: number): boolean => {
  return (
    Number.isFinite(r) &&
    Number.isFinite(g) &&
    Number.isFinite(b) &&
    r >= 0 &&
    r <= 255 &&
    g >= 0 &&
    g <= 255 &&
    b >= 0 &&
    b <= 255
  );
};

export const normalizeHex = (hex: string): string => {
  let clean = hex.replace('#', '').toUpperCase();
  if (clean.length === 3) {
    clean = clean
      .split('')
      .map((c) => c + c)
      .join('');
  }
  return `#${clean}`;
};

export const exportToJson = (colorMapping: ColorMapping): string => {
  const result = Object.entries(colorMapping).map(([layer, hex]) => ({
    layer,
    hex: normalizeHex(hex)
  }));
  return JSON.stringify(result, null, 2);
};

export const exportToCssVariables = (colorMapping: ColorMapping): string => {
  return Object.entries(colorMapping)
    .map(([layer, hex]) => `--layer-${layer}: ${normalizeHex(hex)};`)
    .join('\n');
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  } catch {
    return false;
  }
};

export const SVG_LAYERS: SvgLayer[] = [
  {
    id: 'background',
    name: '背景',
    fillType: 'fill',
    adjacency: ['skin', 'hair', 'shirt', 'pants', 'shoes']
  },
  {
    id: 'skin',
    name: '皮肤',
    fillType: 'fill',
    adjacency: ['background', 'hair', 'shirt', 'pants']
  },
  {
    id: 'hair',
    name: '头发',
    fillType: 'fill',
    adjacency: ['background', 'skin']
  },
  {
    id: 'shirt',
    name: '上衣',
    fillType: 'fill',
    adjacency: ['background', 'skin', 'pants']
  },
  {
    id: 'pants',
    name: '裤子',
    fillType: 'fill',
    adjacency: ['background', 'shirt', 'shoes', 'skin']
  },
  {
    id: 'shoes',
    name: '鞋子',
    fillType: 'fill',
    adjacency: ['background', 'pants']
  }
];

export const getLayerAdjacencyWarnings = (
  colorMapping: ColorMapping
): Map<SvgLayerId, SvgLayerId[]> => {
  const warnings = new Map<SvgLayerId, SvgLayerId[]>();
  const checkedPairs = new Set<string>();

  SVG_LAYERS.forEach((layer) => {
    const layerWarnings: SvgLayerId[] = [];
    layer.adjacency.forEach((adjId) => {
      const pairKey = [layer.id, adjId].sort().join('-');
      if (checkedPairs.has(pairKey)) return;
      checkedPairs.add(pairKey);

      const color1 = colorMapping[layer.id];
      const color2 = colorMapping[adjId];
      if (color1 && color2) {
        const contrast = getContrastRatio(color1, color2);
        if (contrast < 4.5) {
          layerWarnings.push(adjId);
          if (!warnings.has(adjId)) {
            warnings.set(adjId, []);
          }
          warnings.get(adjId)!.push(layer.id);
        }
      }
    });
    if (layerWarnings.length > 0) {
      if (!warnings.has(layer.id)) {
        warnings.set(layer.id, []);
      }
      warnings.get(layer.id)!.push(...layerWarnings);
    }
  });

  return warnings;
};
