export type ColorSchemeKey = 'classic' | 'cyberpunk' | 'pastel' | 'retro';

export interface ColorScheme {
  name: string;
  colors: string[];
}

export const colorSchemes: Record<ColorSchemeKey, ColorScheme> = {
  classic: {
    name: '经典冷暖',
    colors: [
      '#0d47a1',
      '#1976d2',
      '#42a5f5',
      '#66bb6a',
      '#9ccc65',
      '#d4a017',
      '#a1887f',
      '#795548',
      '#bdbdbd',
      '#f5f5f5',
    ],
  },
  cyberpunk: {
    name: '赛博霓虹',
    colors: [
      '#0a0a23',
      '#1a0033',
      '#4a0080',
      '#8a00c0',
      '#c200c0',
      '#ff0080',
      '#ff2060',
      '#ff6060',
      '#ffa040',
      '#ffffff',
    ],
  },
  pastel: {
    name: '梦幻粉彩',
    colors: [
      '#a8d8ea',
      '#aa96da',
      '#fcbad3',
      '#ffffd2',
      '#e1bee7',
      '#b39ddb',
      '#9fa8da',
      '#c5cae9',
      '#d1c4e9',
      '#f3e5f5',
    ],
  },
  retro: {
    name: '复古胶片',
    colors: [
      '#2d3436',
      '#636e72',
      '#b2bec3',
      '#dfe6e9',
      '#8d6e63',
      '#6d4c41',
      '#5d4037',
      '#4e342e',
      '#3e2723',
      '#f5f5f5',
    ],
  },
};

export const hexToRgb = (hex: string): [number, number, number] => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
};

export const getColorFromHeight = (
  height: number,
  colors: string[]
): [number, number, number] => {
  const h = Math.max(0, Math.min(1, height));
  const numColors = colors.length;
  const scaled = h * (numColors - 1);
  const index = Math.floor(scaled);
  const t = scaled - index;

  if (index >= numColors - 1) {
    return hexToRgb(colors[numColors - 1]);
  }

  const c1 = hexToRgb(colors[index]);
  const c2 = hexToRgb(colors[index + 1]);

  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * t),
    Math.round(c1[1] + (c2[1] - c1[1]) * t),
    Math.round(c1[2] + (c2[2] - c1[2]) * t),
  ];
};
