import * as d3 from 'd3';
import * as THREE from 'three';

export const scalarColorScale = d3.scaleLinear<string>()
  .domain([0, 1])
  .range(['#1E90FF', '#FF4500'])
  .clamp(true);

export const rainbowColorScale = d3.scaleSequential<string>(d3.interpolateRainbow)
  .domain([0, 1]);

export const fieldLineColorScale = d3.scaleLinear<string>()
  .domain([0, 1])
  .range(['#00008B', '#00FFFF'])
  .clamp(true);

export const legendColorScale = d3.scaleLinear<string>()
  .domain([0, 1])
  .range(['#0000FF', '#FF0000'])
  .clamp(true);

export function getScalarColor(value: number, min: number, max: number): THREE.Color {
  const normalized = (value - min) / (max - min);
  const colorStr = scalarColorScale(Math.max(0, Math.min(1, normalized)));
  return new THREE.Color(colorStr);
}

export function getRainbowColor(value: number, min: number, max: number): THREE.Color {
  const normalized = (value - min) / (max - min);
  const colorStr = rainbowColorScale(Math.max(0, Math.min(1, normalized)));
  return new THREE.Color(colorStr);
}

export function getFieldLineColor(pathProgress: number): THREE.Color {
  const colorStr = fieldLineColorScale(Math.max(0, Math.min(1, pathProgress)));
  return new THREE.Color(colorStr);
}

export function getOpacity(value: number, min: number, max: number): number {
  const normalized = (value - min) / (max - min);
  return 0.3 + Math.max(0, Math.min(1, normalized)) * 0.7;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1]!, 16) / 255,
    g: parseInt(result[2]!, 16) / 255,
    b: parseInt(result[3]!, 16) / 255
  } : { r: 0, g: 0, b: 0 };
}

export function createColorGradientTexture(colors: string[]): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 1;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createLinearGradient(0, 0, 256, 0);
  colors.forEach((color, i) => {
    gradient.addColorStop(i / (colors.length - 1), color);
  });
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 1);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}
