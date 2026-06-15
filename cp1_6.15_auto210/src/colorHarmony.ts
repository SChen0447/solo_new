import type { Color } from './colorExtractor';

export interface HarmonySet {
  name: string;
  colors: Color[];
}

const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
  r /= 255;
  g /= 255;
  b /= 255;

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

  return [h * 360, s * 100, l * 100];
};

const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
  h /= 360;
  s /= 100;
  l /= 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
};

const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};

const createColor = (r: number, g: number, b: number, ratio: number = 0.2): Color => {
  return {
    r,
    g,
    b,
    hex: rgbToHex(r, g, b),
    ratio
  };
};

const generateComplementary = (baseColor: Color): Color[] => {
  const [h, s, l] = rgbToHsl(baseColor.r, baseColor.g, baseColor.b);
  const colors: Color[] = [];

  colors.push(createColor(...hslToRgb(h, s, Math.max(l - 20, 10)), 0.25));
  colors.push(createColor(...hslToRgb(h, s, l), 0.25));

  const compH = (h + 180) % 360;
  colors.push(createColor(...hslToRgb(compH, s, l), 0.2));

  colors.push(createColor(...hslToRgb(compH, s, Math.min(l + 15, 95)), 0.15));
  colors.push(createColor(...hslToRgb(h, Math.max(s - 20, 10), Math.min(l + 25, 95)), 0.15));

  return colors;
};

const generateAnalogous = (baseColor: Color): Color[] => {
  const [h, s, l] = rgbToHsl(baseColor.r, baseColor.g, baseColor.b);
  const colors: Color[] = [];

  colors.push(createColor(...hslToRgb((h - 60 + 360) % 360, s, l), 0.15));
  colors.push(createColor(...hslToRgb((h - 30 + 360) % 360, s, l), 0.25));
  colors.push(createColor(...hslToRgb(h, s, l), 0.25));
  colors.push(createColor(...hslToRgb((h + 30) % 360, s, l), 0.2));
  colors.push(createColor(...hslToRgb((h + 60) % 360, s, Math.min(l + 10, 90)), 0.15));

  return colors;
};

const generateTriadic = (baseColor: Color): Color[] => {
  const [h, s, l] = rgbToHsl(baseColor.r, baseColor.g, baseColor.b);
  const colors: Color[] = [];

  colors.push(createColor(...hslToRgb(h, s, l), 0.3));
  colors.push(createColor(...hslToRgb((h + 120) % 360, s, l), 0.25));
  colors.push(createColor(...hslToRgb((h + 240) % 360, s, l), 0.25));
  colors.push(createColor(...hslToRgb(h, Math.max(s - 15, 5), Math.min(l + 20, 95)), 0.1));
  colors.push(createColor(...hslToRgb((h + 120) % 360, Math.max(s - 20, 5), Math.min(l + 15, 90)), 0.1));

  return colors;
};

export const generateHarmonies = (colors: Color[]): HarmonySet[] => {
  if (colors.length === 0) return [];

  const primaryColor = colors[0];

  return [
    {
      name: '互补色方案',
      colors: generateComplementary(primaryColor)
    },
    {
      name: '类似色方案',
      colors: generateAnalogous(primaryColor)
    },
    {
      name: '三角色方案',
      colors: generateTriadic(primaryColor)
    }
  ];
};
