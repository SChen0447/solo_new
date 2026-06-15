import { BrushStroke, BrushMode } from '../../store/useStore';
import { applyLocalBrushEffect } from './WatercolorEngine';

export interface BrushState {
  isDrawing: boolean;
  lastX: number;
  lastY: number;
  strokes: BrushStroke[];
}

export class BrushManager {
  private state: BrushState = {
    isDrawing: false,
    lastX: 0,
    lastY: 0,
    strokes: []
  };

  private rafId: number | null = null;
  private pendingStroke: { x: number; y: number; size: number; mode: BrushMode } | null = null;
  private lastApplyTime: number = 0;

  constructor() {}

  startDrawing(x: number, y: number): void {
    this.state.isDrawing = true;
    this.state.lastX = x;
    this.state.lastY = y;
  }

  addPoint(
    x: number,
    y: number,
    size: number,
    mode: BrushMode,
    imageData: ImageData,
    originalData: ImageData,
    onApply: (newData: ImageData, stroke: BrushStroke) => void
  ): ImageData {
    if (!this.state.isDrawing) return imageData;

    const dx = x - this.state.lastX;
    const dy = y - this.state.lastY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const step = Math.max(2, size / 4);
    let result = imageData;

    if (dist > step) {
      const steps = Math.floor(dist / step);
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const ix = this.state.lastX + dx * t;
        const iy = this.state.lastY + dy * t;
        const stroke: BrushStroke = { x: ix, y: iy, size, mode };
        this.state.strokes.push(stroke);
        result = applyLocalBrushEffect(result, originalData, ix, iy, size, mode);
        onApply(result, stroke);
      }
    } else {
      const stroke: BrushStroke = { x, y, size, mode };
      this.state.strokes.push(stroke);
      result = applyLocalBrushEffect(result, originalData, x, y, size, mode);
      onApply(result, stroke);
    }

    this.state.lastX = x;
    this.state.lastY = y;
    return result;
  }

  stopDrawing(): void {
    this.state.isDrawing = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  getStrokes(): BrushStroke[] {
    return [...this.state.strokes];
  }

  setStrokes(strokes: BrushStroke[]): void {
    this.state.strokes = [...strokes];
  }

  clearStrokes(): void {
    this.state.strokes = [];
  }

  isDrawingState(): boolean {
    return this.state.isDrawing;
  }

  replayStrokes(
    imageData: ImageData,
    originalData: ImageData,
    strokes: BrushStroke[]
  ): ImageData {
    let result = imageData;
    for (const stroke of strokes) {
      result = applyLocalBrushEffect(
        result,
        originalData,
        stroke.x,
        stroke.y,
        stroke.size,
        stroke.mode
      );
    }
    return result;
  }
}
