import type { RGB, HSL, ColorData } from '../types';

export function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  const bigint = parseInt(
    h.length === 3
      ? h.split('').map((c) => c + c).join('')
      : h,
    16
  );
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

export function rgbToHex({ r, g, b }: RGB): string {
  return (
    '#' +
    [r, g, b]
      .map((v) => {
        const hex = Math.max(0, Math.min(255, Math.round(v))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  ).toUpperCase();
}

export function rgbToHsl({ r, g, b }: RGB): HSL {
  const rs = r / 255;
  const gs = g / 255;
  const bs = b / 255;
  const max = Math.max(rs, gs, bs);
  const min = Math.min(rs, gs, bs);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rs:
        h = ((gs - bs) / d + (gs < bs ? 6 : 0)) / 6;
        break;
      case gs:
        h = ((bs - rs) / d + 2) / 6;
        break;
      case bs:
        h = ((rs - gs) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function hslToRgb({ h, s, l }: HSL): RGB {
  const hs = ((h % 360) + 360) % 360 / 360;
  const ss = Math.max(0, Math.min(100, s)) / 100;
  const ll = Math.max(0, Math.min(100, l)) / 100;

  if (ss === 0) {
    const val = Math.round(ll * 255);
    return { r: val, g: val, b: val };
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss;
  const p = 2 * ll - q;

  return {
    r: Math.round(hue2rgb(p, q, hs + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, hs) * 255),
    b: Math.round(hue2rgb(p, q, hs - 1 / 3) * 255),
  };
}

export function createColorData(hex: string, percentage?: number): ColorData {
  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb);
  return {
    hex: hex.toUpperCase(),
    rgb,
    hsl,
    percentage,
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
