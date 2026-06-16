export interface ColorPalette {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  background: string;
  text: string;
  accent: string;
  isCustom?: boolean;
}

export interface ContrastScore {
  primaryBg: number;
  textBg: number;
  primaryBgLevel: '优' | '良' | '差';
  textBgLevel: '优' | '良' | '差';
  totalScore: number;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean;
  return {
    r: parseInt(full.substring(0, 2), 16),
    g: parseInt(full.substring(2, 4), 16),
    b: parseInt(full.substring(4, 6), 16)
  };
}

export function getRelativeLuminance(r: number, g: number, b: number): number {
  const toLinear = (val: number): number => {
    const srgb = val / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  const l1 = getRelativeLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = getRelativeLuminance(rgb2.r, rgb2.g, rgb2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function ratioToLevel(ratio: number): '优' | '良' | '差' {
  if (ratio >= 7) return '优';
  if (ratio >= 4.5) return '良';
  return '差';
}

export function calculateScore(primaryBgRatio: number, textBgRatio: number): ContrastScore {
  const primaryBgLevel = ratioToLevel(primaryBgRatio);
  const textBgLevel = ratioToLevel(textBgRatio);

  const scoreRatio = (ratio: number): number => {
    if (ratio >= 7) return 100;
    if (ratio >= 4.5) return 60 + ((ratio - 4.5) / 2.5) * 40;
    return Math.min(60, (ratio / 4.5) * 60);
  };

  const primaryScore = scoreRatio(primaryBgRatio);
  const textScore = scoreRatio(textBgRatio);
  const totalScore = Math.round((primaryScore * 0.4 + textScore * 0.6));

  return {
    primaryBg: Number(primaryBgRatio.toFixed(2)),
    textBg: Number(textBgRatio.toFixed(2)),
    primaryBgLevel,
    textBgLevel,
    totalScore
  };
}

export function paletteToCssVariables(palette: ColorPalette): string {
  return `:root {
  --primary: ${palette.primary};
  --secondary: ${palette.secondary};
  --background: ${palette.background};
  --text: ${palette.text};
  --accent: ${palette.accent};
}`;
}

export function levelColor(level: '优' | '良' | '差'): string {
  switch (level) {
    case '优': return '#22c55e';
    case '良': return '#f97316';
    case '差': return '#ef4444';
  }
}
