export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export function hslToRgb(h: number, s: number, l: number): RGB {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(1, s));
  l = Math.max(0, Math.min(1, l));

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r1: number, g1: number, b1: number;

  if (h < 60) {
    r1 = c; g1 = x; b1 = 0;
  } else if (h < 120) {
    r1 = x; g1 = c; b1 = 0;
  } else if (h < 180) {
    r1 = 0; g1 = c; b1 = x;
  } else if (h < 240) {
    r1 = 0; g1 = x; b1 = c;
  } else if (h < 300) {
    r1 = x; g1 = 0; b1 = c;
  } else {
    r1 = c; g1 = 0; b1 = x;
  }

  return {
    r: r1 + m,
    g: g1 + m,
    b: b1 + m,
  };
}

export function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255,
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => {
    const clamped = Math.max(0, Math.min(255, Math.round(v * 255)));
    return clamped.toString(16).padStart(2, '0');
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function randomColor(): RGB {
  return {
    r: Math.random(),
    g: Math.random(),
    b: Math.random(),
  };
}

export function lerpColor(a: RGB, b: RGB, t: number): RGB {
  t = Math.max(0, Math.min(1, t));
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

export interface ColorTheme {
  name: string;
  start: RGB;
  end: RGB;
}

export const COLOR_THEMES: ColorTheme[] = [
  {
    name: 'purple-pink',
    start: hexToRgb('#8A2BE2'),
    end: hexToRgb('#FF69B4'),
  },
  {
    name: 'cyan-blue',
    start: hexToRgb('#00CED1'),
    end: hexToRgb('#00008B'),
  },
  {
    name: 'orange-yellow',
    start: hexToRgb('#FFD700'),
    end: hexToRgb('#FF4500'),
  },
];

export function randomColorInTheme(theme: ColorTheme): RGB {
  const t = Math.random();
  const base = lerpColor(theme.start, theme.end, t);
  const variation = 0.08;
  return {
    r: Math.max(0, Math.min(1, base.r + (Math.random() - 0.5) * variation)),
    g: Math.max(0, Math.min(1, base.g + (Math.random() - 0.5) * variation)),
    b: Math.max(0, Math.min(1, base.b + (Math.random() - 0.5) * variation)),
  };
}
