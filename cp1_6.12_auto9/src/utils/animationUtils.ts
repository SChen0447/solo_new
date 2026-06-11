export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

export const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export function springAnimation(
  from: number,
  to: number,
  duration: number = 400,
  stiffness: number = 150,
  damping: number = 12
): (progress: number) => number {
  const omega = Math.sqrt(stiffness);
  const zeta = damping / (2 * Math.sqrt(stiffness));
  const omegaD = omega * Math.sqrt(1 - zeta * zeta);

  return (progress: number): number => {
    if (progress >= 1) return to;
    const t = (progress * duration) / 1000;
    const envelope = Math.exp(-zeta * omega * t);
    const oscillation = Math.cos(omegaD * t);
    const normalized = 1 - envelope * oscillation;
    return from + (to - from) * normalized;
  };
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function normalizeAngle(angle: number): number {
  let result = angle % 360;
  if (result < 0) result += 360;
  return result;
}

export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

export function snapToAngle(angle: number, snapDeg: number): number {
  return Math.round(angle / snapDeg) * snapDeg;
}
