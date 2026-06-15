import { ThemeType, audioEngine } from './AudioEngine';

const BAR_COUNT = 256;
const MIN_BAR_WIDTH = 2;
const MAX_BAR_HEIGHT = 300;

interface VisualizerState {
  barHeights: number[];
  targetHeights: number[];
  currentColors: string[];
  targetColors: string[];
  animationId: number | null;
}

const state: VisualizerState = {
  barHeights: new Array(BAR_COUNT).fill(0),
  targetHeights: new Array(BAR_COUNT).fill(0),
  currentColors: new Array(BAR_COUNT).fill('hsl(0, 0%, 50%)'),
  targetColors: new Array(BAR_COUNT).fill('hsl(0, 0%, 50%)'),
  animationId: null
};

const getBarColor = (index: number, amplitude: number, totalBars: number, theme: ThemeType): string => {
  const freqRatio = index / totalBars;
  const ampRatio = amplitude / 255;

  switch (theme) {
    case 'fire': {
      const hue = 0 + freqRatio * 60;
      const saturation = 80 + ampRatio * 20;
      const lightness = 40 + ampRatio * 20;
      return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }
    case 'ocean': {
      const hue = 180 + ampRatio * 40;
      const saturation = 70 + ampRatio * 20;
      const lightness = 35 + ampRatio * 25;
      return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }
    case 'aurora': {
      const hue = 150 + freqRatio * 120 - ampRatio * 30;
      const saturation = 75 + ampRatio * 20;
      const lightness = 45 + ampRatio * 20;
      return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }
    default: {
      if (freqRatio < 0.33) {
        return `hsl(${0 + freqRatio * 90}, 80%, ${40 + ampRatio * 25}%)`;
      } else if (freqRatio < 0.66) {
        return `hsl(${90 + (freqRatio - 0.33) * 180}, 75%, ${40 + ampRatio * 25}%)`;
      } else {
        return `hsl(${200 + (freqRatio - 0.66) * 180}, 80%, ${40 + ampRatio * 25}%)`;
      }
    }
  }
};

const parseHSL = (hsl: string): { h: number; s: number; l: number } => {
  const match = hsl.match(/hsl\(([\d.]+),\s*([\d.]+)%,\s*([\d.]+)%\)/);
  if (match) {
    return { h: parseFloat(match[1]), s: parseFloat(match[2]), l: parseFloat(match[3]) };
  }
  return { h: 0, s: 0, l: 50 };
};

const interpolateColor = (current: string, target: string, factor: number): string => {
  const c = parseHSL(current);
  const t = parseHSL(target);
  const h = c.h + (t.h - c.h) * factor;
  const s = c.s + (t.s - c.s) * factor;
  const l = c.l + (t.l - c.l) * factor;
  return `hsl(${h}, ${s}%, ${l}%)`;
};

export const renderSpectrum = (
  canvas: HTMLCanvasElement,
  theme: ThemeType,
  rotationY: number
): void => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const rect = canvas.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;

  ctx.clearRect(0, 0, width, height);

  const frequencyData = audioEngine.getFrequencyData();
  const barWidth = Math.max(MIN_BAR_WIDTH, (width / BAR_COUNT) * 0.85);
  const gap = (width - barWidth * BAR_COUNT) / (BAR_COUNT + 1);

  const perspective = 800;
  const rotateX = 30 * Math.PI / 180;
  const rotateYRad = rotationY * Math.PI / 180;
  const cosX = Math.cos(rotateX);
  const cosY = Math.cos(rotateYRad);
  const sinY = Math.sin(rotateYRad);

  for (let i = 0; i < BAR_COUNT; i++) {
    const amplitude = frequencyData[i] || 0;
    state.targetHeights[i] = (amplitude / 255) * MAX_BAR_HEIGHT;
    state.targetColors[i] = getBarColor(i, amplitude, BAR_COUNT, theme);

    state.barHeights[i] += (state.targetHeights[i] - state.barHeights[i]) * 0.85;
    state.currentColors[i] = interpolateColor(state.currentColors[i], state.targetColors[i], 0.1);

    const barHeight = state.barHeights[i];
    const x = gap + i * (barWidth + gap);
    const y = height - 40;

    const centerX = width / 2;
    const relX = x - centerX;

    const z = relX * sinY;
    const newX = centerX + relX * cosY;
    const scale = perspective / (perspective + z);

    const topY3d = (y - barHeight) * cosX + height * (1 - cosX);
    const bottomY3d = y * cosX + height * (1 - cosX);

    const finalX = centerX + (newX - centerX) * scale;
    const finalWidth = barWidth * scale;
    const finalTopY = topY3d * scale + height * (1 - scale);
    const finalBottomY = bottomY3d * scale + height * (1 - scale);
    const finalHeight = finalBottomY - finalTopY;

    if (finalHeight > 0.5) {
      const gradient = ctx.createLinearGradient(finalX, finalTopY, finalX, finalBottomY);
      const baseColor = state.currentColors[i];
      const parsed = parseHSL(baseColor);
      gradient.addColorStop(0, `hsl(${parsed.h}, ${parsed.s}%, ${Math.min(parsed.l + 15, 90)}%)`);
      gradient.addColorStop(0.5, baseColor);
      gradient.addColorStop(1, `hsl(${parsed.h}, ${parsed.s}%, ${Math.max(parsed.l - 15, 10)}%)`);

      ctx.fillStyle = gradient;
      ctx.fillRect(finalX, finalTopY, finalWidth, finalHeight);

      ctx.shadowColor = baseColor;
      ctx.shadowBlur = 8 * scale;
      ctx.fillRect(finalX, finalBottomY - 4 * scale, finalWidth, 4 * scale);
      ctx.shadowBlur = 0;
    }
  }
};

export const startAnimationLoop = (
  canvas: HTMLCanvasElement,
  getTheme: () => ThemeType,
  getRotationY: () => number
): void => {
  const render = () => {
    renderSpectrum(canvas, getTheme(), getRotationY());
    state.animationId = requestAnimationFrame(render);
  };
  render();
};

export const stopAnimationLoop = (): void => {
  if (state.animationId !== null) {
    cancelAnimationFrame(state.animationId);
    state.animationId = null;
  }
};

export const resizeCanvas = (canvas: HTMLCanvasElement): void => {
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }
};
