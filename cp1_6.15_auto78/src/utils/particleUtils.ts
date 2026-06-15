import type { BrainWaveType } from '../stores/brainWaveStore';

const MIN_FREQ = 0.5;
const MAX_FREQ = 30;
const PARTICLE_COUNT = 3000;
const SHELL_RADIUS = 5;
const MIN_RADIUS = 0.08;
const MAX_RADIUS = 0.25;

export interface ParticleData {
  positions: Float32Array;
  baseRadii: Float32Array;
  randomOffsets: Float32Array;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 0, g: 0, b: 0 };
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
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
  return { h, s, l };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  let r: number, g: number, b: number;
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
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

export function getBrainWaveType(frequency: number): BrainWaveType {
  if (frequency < 4) return 'Delta';
  if (frequency < 8) return 'Theta';
  if (frequency < 13) return 'Alpha';
  return 'Beta';
}

function lerpHsl(
  color1: { h: number; s: number; l: number },
  color2: { h: number; s: number; l: number },
  t: number
): { h: number; s: number; l: number } {
  let dh = color2.h - color1.h;
  if (Math.abs(dh) > 0.5) {
    if (dh > 0) dh -= 1;
    else dh += 1;
  }
  return {
    h: (color1.h + dh * t + 1) % 1,
    s: color1.s + (color2.s - color1.s) * t,
    l: color1.l + (color2.l - color1.l) * t
  };
}

export function frequencyToColor(frequency: number): { r: number; g: number; b: number } {
  const deltaStart = hexToRgb('#3d0c5c');
  const deltaEnd = hexToRgb('#8a2be2');
  const midStart = hexToRgb('#4a90d9');
  const midEnd = hexToRgb('#00e5ff');
  const betaStart = hexToRgb('#00bcd4');
  const betaEnd = hexToRgb('#8bc34a');

  if (frequency <= 4) {
    const t = (frequency - MIN_FREQ) / (4 - MIN_FREQ);
    const hsl1 = rgbToHsl(deltaStart.r, deltaStart.g, deltaStart.b);
    const hsl2 = rgbToHsl(deltaEnd.r, deltaEnd.g, deltaEnd.b);
    const result = lerpHsl(hsl1, hsl2, t);
    return hslToRgb(result.h, result.s, result.l);
  } else if (frequency <= 13) {
    const t = (frequency - 4) / (13 - 4);
    const hsl1 = rgbToHsl(midStart.r, midStart.g, midStart.b);
    const hsl2 = rgbToHsl(midEnd.r, midEnd.g, midEnd.b);
    const result = lerpHsl(hsl1, hsl2, t);
    return hslToRgb(result.h, result.s, result.l);
  } else {
    const t = (frequency - 13) / (MAX_FREQ - 13);
    const hsl1 = rgbToHsl(betaStart.r, betaStart.g, betaStart.b);
    const hsl2 = rgbToHsl(betaEnd.r, betaEnd.g, betaEnd.b);
    const result = lerpHsl(hsl1, hsl2, t);
    return hslToRgb(result.h, result.s, result.l);
  }
}

export function frequencyToOpacity(frequency: number): number {
  const t = (frequency - MIN_FREQ) / (MAX_FREQ - MIN_FREQ);
  return 0.25 + t * (0.65 - 0.25);
}

export function frequencyToRadiusScale(frequency: number): number {
  const t = (frequency - MIN_FREQ) / (MAX_FREQ - MIN_FREQ);
  return 1 + t * 0.4;
}

export function generateParticleData(): ParticleData {
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const baseRadii = new Float32Array(PARTICLE_COUNT);
  const randomOffsets = new Float32Array(PARTICLE_COUNT);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = SHELL_RADIUS * Math.cbrt(Math.random());

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    baseRadii[i] = MIN_RADIUS + Math.random() * (MAX_RADIUS - MIN_RADIUS);
    randomOffsets[i] = Math.random() * Math.PI * 2;
  }

  return { positions, baseRadii, randomOffsets };
}

export const PARTICLE_CONFIG = {
  PARTICLE_COUNT,
  SHELL_RADIUS,
  MIN_RADIUS,
  MAX_RADIUS,
  PULSE_AMPLITUDE: 0.15,
  FADE_DURATION: 1.5,
  COLOR_TRANSITION_DURATION: 2
};
