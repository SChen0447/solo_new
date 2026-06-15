import * as THREE from 'three';
import { HeatmapData } from '../core/Types';
import { getHeatmapColor } from '../utils/ColorUtils';

export class HeatmapRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private opacity = 0.5;
  
  constructor(canvasId: string = 'heatmap-canvas') {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) {
      throw new Error(`Canvas element with id "${canvasId}" not found`);
    }
    
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    
    this.setupOpacityControl();
  }
  
  private setupOpacityControl(): void {
    const opacitySlider = document.getElementById('heatmap-opacity') as HTMLInputElement;
    if (opacitySlider) {
      opacitySlider.addEventListener('input', (e) => {
        this.opacity = parseFloat((e.target as HTMLInputElement).value);
      });
    }
  }
  
  public render(data: HeatmapData): void {
    const { gridSize, values, minValue, maxValue } = data;
    const { width, height } = this.canvas;
    
    this.ctx.clearRect(0, 0, width, height);
    
    const cellWidth = width / gridSize;
    const cellHeight = height / gridSize;
    
    for (let x = 0; x < gridSize; x++) {
      for (let z = 0; z < gridSize; z++) {
        const intensity = values[x][z];
        const color = getHeatmapColor(intensity, minValue, maxValue);
        
        this.ctx.fillStyle = `rgba(
          ${Math.floor(color.r * 255)},
          ${Math.floor(color.g * 255)},
          ${Math.floor(color.b * 255)},
          ${this.opacity}
        )`;
        
        this.ctx.fillRect(
          x * cellWidth,
          z * cellHeight,
          cellWidth + 0.5,
          cellHeight + 0.5
        );
      }
    }
    
    this.drawGrid(gridSize);
    this.drawRoomOutline();
  }
  
  private drawGrid(gridSize: number): void {
    const { width, height } = this.canvas;
    const cellWidth = width / gridSize;
    const cellHeight = height / gridSize;
    
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.lineWidth = 0.5;
    
    for (let i = 0; i <= gridSize; i++) {
      this.ctx.beginPath();
      this.ctx.moveTo(i * cellWidth, 0);
      this.ctx.lineTo(i * cellWidth, height);
      this.ctx.stroke();
      
      this.ctx.beginPath();
      this.ctx.moveTo(0, i * cellHeight);
      this.ctx.lineTo(width, i * cellHeight);
      this.ctx.stroke();
    }
  }
  
  private drawRoomOutline(): void {
    const { width, height } = this.canvas;
    
    this.ctx.strokeStyle = 'rgba(22, 199, 154, 0.5)';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(1, 1, width - 2, height - 2);
  }
  
  public clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
  
  public setOpacity(value: number): void {
    this.opacity = Math.max(0.3, Math.min(0.7, value));
  }
}
