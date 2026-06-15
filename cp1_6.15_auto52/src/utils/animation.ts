export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeInCubic(t: number): number {
  return t * t * t;
}

export function easeOutElastic(t: number): number {
  const c4 = (2 * Math.PI) / 3;
  return t === 0
    ? 0
    : t === 1
    ? 1
    : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

export function easeOutBounce(t: number): number {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) {
    return n1 * t * t;
  } else if (t < 2 / d1) {
    return n1 * (t -= 1.5 / d1) * t + 0.75;
  } else if (t < 2.5 / d1) {
    return n1 * (t -= 2.25 / d1) * t + 0.9375;
  } else {
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }
}

export function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export interface SpinAnimationConfig {
  startAngle: number;
  targetSector: number;
  duration: number;
  totalRotations: number;
}

export function generateSpinConfig(): SpinAnimationConfig {
  const targetSector = Math.floor(Math.random() * 8);
  const duration = 2000 + Math.random() * 1000;
  const totalRotations = 5 + Math.floor(Math.random() * 5);
  return {
    startAngle: 0,
    targetSector,
    duration,
    totalRotations,
  };
}

export function calculateSpinAngle(
  config: SpinAnimationConfig,
  elapsed: number
): number {
  const progress = clamp(elapsed / config.duration, 0, 1);
  const easedProgress = easeInOutQuad(progress);
  const sectorAngle = 45;
  const sectorCenterAngle = config.targetSector * sectorAngle + sectorAngle / 2;
  const totalAngle = config.totalRotations * 360 + sectorCenterAngle;
  return config.startAngle + totalAngle * easedProgress;
}

export interface AnimationController {
  start: () => void;
  stop: () => void;
  isRunning: () => boolean;
}

export function createAnimationController(
  onFrame: (elapsed: number, progress: number) => void,
  onComplete: () => void,
  duration: number
): AnimationController {
  let startTime: number | null = null;
  let animationId: number | null = null;
  let running = false;

  function animate(timestamp: number) {
    if (!running) return;
    if (startTime === null) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const progress = clamp(elapsed / duration, 0, 1);
    onFrame(elapsed, progress);
    if (progress < 1) {
      animationId = requestAnimationFrame(animate);
    } else {
      running = false;
      onComplete();
    }
  }

  return {
    start: () => {
      if (running) return;
      running = true;
      startTime = null;
      animationId = requestAnimationFrame(animate);
    },
    stop: () => {
      running = false;
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
    },
    isRunning: () => running,
  };
}

export function getFortuneColor(score: number): string {
  if (score < 30) return '#c0392b';
  if (score < 70) return '#d4a762';
  return '#27ae60';
}

export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
