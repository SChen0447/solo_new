import { v4 as uuidv4 } from 'uuid';
import type { Vec3 } from '../types/game';

export const generateId = (): string => uuidv4();

export const distance = (a: Vec3, b: Vec3): number => {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

export const distance2D = (a: Vec3, b: Vec3): number => {
  const dx = a[0] - b[0];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dz * dz);
};

export const normalize = (v: Vec3): Vec3 => {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  if (len === 0) return [0, 0, 0];
  return [v[0] / len, v[1] / len, v[2] / len];
};

export const add = (a: Vec3, b: Vec3): Vec3 => {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
};

export const subtract = (a: Vec3, b: Vec3): Vec3 => {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
};

export const multiply = (v: Vec3, scalar: number): Vec3 => {
  return [v[0] * scalar, v[1] * scalar, v[2] * scalar];
};

export const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
};

export const angleBetween = (forward: Vec3, toTarget: Vec3): number => {
  const f = normalize(forward);
  const t = normalize(toTarget);
  const dot = f[0] * t[0] + f[1] * t[1] + f[2] * t[2];
  return Math.acos(Math.max(-1, Math.min(1, dot)));
};

export const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

export const formatTime = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export const isPointInCone = (
  origin: Vec3,
  direction: Vec3,
  point: Vec3,
  angle: number,
  maxDistance: number
): boolean => {
  const dist = distance2D(origin, point);
  if (dist > maxDistance) return false;

  const toPoint = subtract(point, origin);
  toPoint[1] = 0;
  const dir2D: Vec3 = [direction[0], 0, direction[2]];
  const theta = angleBetween(dir2D, toPoint);
  return theta <= angle / 2;
};

export const getForwardVector = (yaw: number, pitch: number): Vec3 => {
  return [
    -Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    -Math.cos(yaw) * Math.cos(pitch),
  ];
};

export const getRightVector = (yaw: number): Vec3 => {
  return [Math.cos(yaw), 0, -Math.sin(yaw)];
};

export const randomRange = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};

export const randomInt = (min: number, max: number): number => {
  return Math.floor(randomRange(min, max + 1));
};

export const now = (): number => performance.now();

export const debounce = <T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

export const throttle = <T extends (...args: unknown[]) => void>(
  fn: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
};
