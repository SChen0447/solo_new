export type EmotionKey = 'joy' | 'sadness' | 'anger' | 'calm';

export interface EmotionInfo {
  key: EmotionKey;
  name: string;
  color: string;
}

export interface Particle {
  x: number;
  y: number;
  radius: number;
  emotion: EmotionKey;
  angle: number;
  radiusDist: number;
  speed: number;
  history: { x: number; y: number }[];
  spiralOffset: number;
}

export interface StarState {
  fps: number;
  particleCount: number;
  rotationSpeed: number;
  colorDistribution: Record<EmotionKey, number>;
  trailingEnabled: boolean;
}

export const EMOTIONS: Record<EmotionKey, EmotionInfo> = {
  joy: { key: 'joy', name: '快乐', color: '#f9ca24' },
  sadness: { key: 'sadness', name: '忧伤', color: '#5352ed' },
  anger: { key: 'anger', name: '愤怒', color: '#ff6b81' },
  calm: { key: 'calm', name: '平静', color: '#2ed573' }
};

export const EMOTION_ORDER: EmotionKey[] = ['joy', 'sadness', 'anger', 'calm'];

export function getEmotionColor(key: EmotionKey): string {
  return EMOTIONS[key].color;
}

export function intensityToRotationPeriod(intensity: number): number {
  const minPeriod = 3;
  const maxPeriod = 8;
  const t = (intensity - 1) / 9;
  return maxPeriod - t * (maxPeriod - minPeriod);
}

export function generateParticleCount(intensity: number, degraded: boolean): number {
  if (degraded) return 200;
  const min = 300;
  const max = 500;
  const t = (intensity - 1) / 9;
  return Math.round(min + t * (max - min));
}

export function randomEmotion(emotions: EmotionKey[]): EmotionKey {
  return emotions[Math.floor(Math.random() * emotions.length)];
}

export function computeSpiralPosition(
  angle: number,
  radiusDist: number,
  spiralOffset: number,
  centerX: number,
  centerY: number
): { x: number; y: number } {
  const effectiveAngle = angle + spiralOffset;
  const r = radiusDist * (0.3 + 0.7 * (1 - radiusDist));
  return {
    x: centerX + Math.cos(effectiveAngle) * r * centerX,
    y: centerY + Math.sin(effectiveAngle) * r * centerY
  };
}

export function createParticles(
  count: number,
  emotions: EmotionKey[],
  canvasSize: number
): Particle[] {
  const particles: Particle[] = [];
  const center = canvasSize / 2;
  for (let i = 0; i < count; i++) {
    const emotion = randomEmotion(emotions);
    const angle = Math.random() * Math.PI * 2;
    const radiusDist = Math.random();
    const radius = 2 + Math.random() * 3;
    const spiralOffset = radiusDist * Math.PI * 4;
    const pos = computeSpiralPosition(angle, radiusDist, spiralOffset, center, center);
    particles.push({
      x: pos.x,
      y: pos.y,
      radius,
      emotion,
      angle,
      radiusDist,
      speed: 0.002 + Math.random() * 0.004,
      history: [],
      spiralOffset
    });
  }
  return particles;
}

export function computeColorDistribution(
  particles: Particle[]
): Record<EmotionKey, number> {
  const total = particles.length || 1;
  const counts: Record<EmotionKey, number> = { joy: 0, sadness: 0, anger: 0, calm: 0 };
  for (const p of particles) {
    counts[p.emotion]++;
  }
  return {
    joy: Math.round((counts.joy / total) * 100),
    sadness: Math.round((counts.sadness / total) * 100),
    anger: Math.round((counts.anger / total) * 100),
    calm: Math.round((counts.calm / total) * 100)
  };
}

export function generateEmotionDescription(
  emotions: EmotionKey[],
  intensity: number
): string {
  if (emotions.length === 0) return '请选择你的情绪，让星盘开始转动。';
  const names = emotions.map((e) => EMOTIONS[e].name);
  const colors = emotions.map((e) => EMOTIONS[e].color);
  const colorDescMap: Record<string, string> = {
    '#f9ca24': '金色',
    '#5352ed': '幽蓝',
    '#ff6b81': '绯红',
    '#2ed573': '翠绿'
  };
  const colorNames = colors.map((c) => colorDescMap[c]);
  let conjunction = '而';
  if (names.length === 1) conjunction = '';
  if (names.length === 2) conjunction = '而';
  if (names.length === 3) conjunction = '、';
  let joinedNames = names[0];
  if (names.length === 2) joinedNames = names.join(conjunction);
  if (names.length === 3) joinedNames = `${names[0]}、${names[1]}和${names[2]}`;
  const intensityDesc =
    intensity >= 8 ? '强烈' : intensity >= 5 ? '适中' : '轻柔';
  let paletteDesc = colorNames[0];
  if (colorNames.length === 2) paletteDesc = colorNames.join('与');
  if (colorNames.length === 3)
    paletteDesc = `${colorNames[0]}、${colorNames[1]}和${colorNames[2]}`;
  return `你感到${joinedNames}，情绪${intensityDesc}，星盘呈现和谐的${paletteDesc}色调。`;
}

export class FPSMonitor {
  private frames = 0;
  private lastTime = performance.now();
  private currentFps = 60;

  tick(): number {
    this.frames++;
    const now = performance.now();
    if (now - this.lastTime >= 1000) {
      this.currentFps = Math.round((this.frames * 1000) / (now - this.lastTime));
      this.frames = 0;
      this.lastTime = now;
    }
    return this.currentFps;
  }

  getFps(): number {
    return this.currentFps;
  }
}

export class PerformanceController {
  private degraded = false;
  private lowFpsFrames = 0;
  private highFpsFrames = 0;

  shouldDegrade(fps: number): boolean {
    if (fps < 45) {
      this.lowFpsFrames++;
      this.highFpsFrames = 0;
      if (this.lowFpsFrames >= 3 && !this.degraded) {
        this.degraded = true;
        this.lowFpsFrames = 0;
        return true;
      }
    }
    return false;
  }

  shouldRecover(fps: number): boolean {
    if (fps >= 58) {
      this.highFpsFrames++;
      this.lowFpsFrames = 0;
      if (this.highFpsFrames >= 30 && this.degraded) {
        this.degraded = false;
        this.highFpsFrames = 0;
        return true;
      }
    }
    return false;
  }

  isDegraded(): boolean {
    return this.degraded;
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
