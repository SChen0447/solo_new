import type { Palette, Shape } from '../types';

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const { r, g, b } = hexToRgb(hex);
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case rNorm:
        h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) / 6;
        break;
      case gNorm:
        h = ((bNorm - rNorm) / d + 2) / 6;
        break;
      case bNorm:
        h = ((rNorm - gNorm) / d + 4) / 6;
        break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
  const hNorm = ((h % 360) + 360) % 360 / 360;
  const sNorm = s / 100;
  const lNorm = l / 100;

  let r: number, g: number, b: number;

  if (sNorm === 0) {
    r = g = b = lNorm;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = lNorm < 0.5 ? lNorm * (1 + sNorm) : lNorm + sNorm - lNorm * sNorm;
    const p = 2 * lNorm - q;
    r = hue2rgb(p, q, hNorm + 1 / 3);
    g = hue2rgb(p, q, hNorm);
    b = hue2rgb(p, q, hNorm - 1 / 3);
  }

  return rgbToHex(r * 255, g * 255, b * 255);
}

function adjustLightness(hex: string, amount: number): string {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex(h, s, Math.max(0, Math.min(100, l + amount)));
}

function adjustSaturation(hex: string, amount: number): string {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex(h, Math.max(0, Math.min(100, s + amount)), l);
}

function generateComplementaryPalette(baseColor: string): string[] {
  const { h, s, l } = hexToHsl(baseColor);
  
  const complementHue = (h + 180) % 360;
  
  return [
    adjustLightness(baseColor, 25),
    baseColor,
    adjustLightness(baseColor, -20),
    hslToHex(complementHue, s, l),
    adjustLightness(hslToHex(complementHue, s, l), 20),
  ];
}

function generateAnalogousPalette(baseColor: string): string[] {
  const { h, s, l } = hexToHsl(baseColor);
  
  return [
    hslToHex((h - 60 + 360) % 360, s, l),
    hslToHex((h - 30 + 360) % 360, s, l),
    baseColor,
    hslToHex((h + 30) % 360, s, l),
    hslToHex((h + 60) % 360, s, l),
  ];
}

function generateTriadicPalette(baseColor: string): string[] {
  const { h, s, l } = hexToHsl(baseColor);
  
  return [
    baseColor,
    adjustLightness(baseColor, 30),
    hslToHex((h + 120) % 360, s, l),
    hslToHex((h + 240) % 360, s, l),
    adjustLightness(hslToHex((h + 240) % 360, s, l), -20),
  ];
}

function generateSplitComplementaryPalette(baseColor: string): string[] {
  const { h, s, l } = hexToHsl(baseColor);
  
  return [
    baseColor,
    adjustSaturation(adjustLightness(baseColor, 20), -10),
    hslToHex((h + 150) % 360, s, l),
    hslToHex((h + 210) % 360, s, l),
    adjustLightness(hslToHex((h + 180) % 360, s * 0.7, l), 15),
  ];
}

function extractDominantColors(shapes: Shape[]): string[] {
  const colorCount: Record<string, number> = {};
  
  shapes.forEach((shape) => {
    const color = shape.color;
    colorCount[color] = (colorCount[color] || 0) + 1;
  });
  
  return Object.entries(colorCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([color]) => color);
}

export function generatePalettes(baseColor: string, shapes: Shape[] = []): Palette[] {
  const dominantColors = extractDominantColors(shapes);
  const primaryColor = dominantColors.length > 0 ? dominantColors[0] : baseColor;
  
  return [
    {
      name: '互补色',
      colors: generateComplementaryPalette(primaryColor),
      type: 'complementary',
    },
    {
      name: '类似色',
      colors: generateAnalogousPalette(primaryColor),
      type: 'analogous',
    },
    {
      name: '三角色',
      colors: generateTriadicPalette(primaryColor),
      type: 'triadic',
    },
  ];
}

export function getContrastColor(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

export {
  hexToRgb,
  rgbToHex,
  hexToHsl,
  hslToHex,
  adjustLightness,
  adjustSaturation,
  generateComplementaryPalette,
  generateAnalogousPalette,
  generateTriadicPalette,
  generateSplitComplementaryPalette,
};
