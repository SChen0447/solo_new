import * as THREE from 'three';

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function colorLerp(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  if (!c1 || !c2) return color1;

  const r = Math.round(lerp(c1.r, c2.r, t));
  const g = Math.round(lerp(c1.g, c2.g, t));
  const b = Math.round(lerp(c1.b, c2.b, t));

  return rgbToHex(r, g, b);
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function threeColorLerp(color1: THREE.Color, color2: THREE.Color, t: number): THREE.Color {
  return new THREE.Color().lerpColors(color1, color2, t);
}

export function speedToColor(speed: number, maxSpeed: number): THREE.Color {
  const t = clamp(speed / maxSpeed, 0, 1);

  if (t < 0.25) {
    return threeColorLerp(
      new THREE.Color(0x0066ff),
      new THREE.Color(0x00ccff),
      t / 0.25
    );
  } else if (t < 0.5) {
    return threeColorLerp(
      new THREE.Color(0x00ccff),
      new THREE.Color(0xffffff),
      (t - 0.25) / 0.25
    );
  } else if (t < 0.75) {
    return threeColorLerp(
      new THREE.Color(0xffffff),
      new THREE.Color(0xffcc00),
      (t - 0.5) / 0.25
    );
  } else {
    return threeColorLerp(
      new THREE.Color(0xffcc00),
      new THREE.Color(0xff3300),
      (t - 0.75) / 0.25
    );
  }
}

export function pressureToColor(pressure: number, minPressure: number, maxPressure: number): THREE.Color {
  const t = clamp((pressure - minPressure) / (maxPressure - minPressure), 0, 1);

  if (t < 0.5) {
    return threeColorLerp(
      new THREE.Color(0x0033aa),
      new THREE.Color(0x66ccff),
      t / 0.5
    );
  } else {
    return threeColorLerp(
      new THREE.Color(0xffcc66),
      new THREE.Color(0xcc0000),
      (t - 0.5) / 0.5
    );
  }
}

export function buildingHeightToColor(height: number, minHeight: number, maxHeight: number): string {
  const t = clamp((height - minHeight) / (maxHeight - minHeight), 0, 1);
  return colorLerp('#22aa55', '#cc2233', t);
}

export function degToRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function radToDeg(radians: number): number {
  return radians * (180 / Math.PI);
}

export function windDirectionToVector(directionDeg: number): { x: number; z: number } {
  const rad = degToRad(directionDeg);
  return {
    x: Math.sin(rad),
    z: Math.cos(rad),
  };
}

export function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function formatNumber(num: number, decimals: number = 1): string {
  return num.toFixed(decimals);
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
