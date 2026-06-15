import * as THREE from 'three';

export function getHeatmapColor(value: number, min: number, max: number): THREE.Color {
  const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const color = new THREE.Color();
  color.setHSL(0.7 - normalized * 0.7, 0.8, 0.5);
  return color;
}

export function rgbToHex(r: number, g: number, b: number): number {
  return (r << 16) | (g << 8) | b;
}

export function hexToRgb(hex: number): { r: number; g: number; b: number } {
  return {
    r: (hex >> 16) & 255,
    g: (hex >> 8) & 255,
    b: hex & 255,
  };
}

export function lerpColor(color1: number, color2: number, t: number): number {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  return rgbToHex(r, g, b);
}

export function createColorWheelCanvas(size: number = 200): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size / 2;

  for (let angle = 0; angle < 360; angle += 1) {
    const startAngle = (angle - 1) * Math.PI / 180;
    const endAngle = (angle + 1) * Math.PI / 180;
    
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.closePath();
    
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, `hsl(${angle}, 100%, 100%)`);
    gradient.addColorStop(1, `hsl(${angle}, 100%, 50%)`);
    
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  return canvas;
}

export function pickColorFromWheel(
  wheelCanvas: HTMLCanvasElement,
  x: number,
  y: number
): { color: number; hue: number; saturation: number; lightness: number } {
  const ctx = wheelCanvas.getContext('2d')!;
  const pixel = ctx.getImageData(x, y, 1, 1).data;
  const color = rgbToHex(pixel[0], pixel[1], pixel[2]);
  
  const centerX = wheelCanvas.width / 2;
  const centerY = wheelCanvas.height / 2;
  const dx = x - centerX;
  const dy = y - centerY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const maxDistance = wheelCanvas.width / 2;
  
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  const hue = (angle + 360) % 360;
  const saturation = Math.min(1, distance / maxDistance);
  const lightness = 1 - saturation * 0.5;
  
  return { color, hue, saturation, lightness };
}
