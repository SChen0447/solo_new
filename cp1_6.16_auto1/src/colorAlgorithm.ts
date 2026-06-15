import type { ThemeObject } from './types';

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return [h * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

function getLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function getSaturation(hex: string): number {
  const [, s] = rgbToHsl(...hexToRgb(hex));
  return s;
}

function lightenColor(hex: string, amount: number): string {
  const [h, s, l] = rgbToHsl(...hexToRgb(hex));
  return hslToHex(h, s, Math.min(100, l + amount));
}

function darkenColor(hex: string, amount: number): string {
  const [h, s, l] = rgbToHsl(...hexToRgb(hex));
  return hslToHex(h, s, Math.max(0, l - amount));
}

function shiftHue(hex: string, degrees: number): string {
  const [h, s, l] = rgbToHsl(...hexToRgb(hex));
  return hslToHex((h + degrees + 360) % 360, s, l);
}

export function generateTheme(colors: string[]): ThemeObject {
  if (colors.length < 8) {
    return { light: '#F5F5F5', dark: '#333333', accent1: '#2196F3', accent2: '#FF9800', accent3: '#4CAF50' };
  }

  const sortedByLuminance = [...colors].sort((a, b) => getLuminance(b) - getLuminance(a));
  const sortedBySaturation = [...colors].sort((a, b) => getSaturation(b) - getSaturation(a));

  const lightest = sortedByLuminance[0];
  const darkest = sortedByLuminance[sortedByLuminance.length - 1];

  const lightBase = getLuminance(lightest) > 200 ? lightest : lightenColor(lightest, 40);
  const light = getLuminance(lightBase) < 230 ? lightenColor(lightBase, 20) : lightBase;

  const darkBase = getLuminance(darkest) < 60 ? darkest : darkenColor(darkest, 30);
  const dark = getLuminance(darkBase) > 80 ? darkenColor(darkBase, 20) : darkBase;

  const mostSaturated = sortedBySaturation[0];
  const accent1 = mostSaturated;
  const accent2 = shiftHue(mostSaturated, 30);
  const accent3 = shiftHue(mostSaturated, 60);

  return { light, dark, accent1, accent2, accent3 };
}

export function darkenForHover(hex: string): string {
  return darkenColor(hex, 15);
}

export { lightenColor, darkenColor };
