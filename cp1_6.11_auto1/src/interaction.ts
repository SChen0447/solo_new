import { ChartEngine } from './chartEngine';

export class InteractionHandler {
  private canvas: HTMLCanvasElement;
  private engine: ChartEngine;

  private isDragging: boolean = false;
  private lastDragX: number = 0;

  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseDown: (e: MouseEvent) => void;
  private boundMouseUp: (e: MouseEvent) => void;
  private boundMouseLeave: (e: MouseEvent) => void;
  private boundWheel: (e: WheelEvent) => void;
  private boundContextMenu: (e: Event) => void;

  constructor(canvas: HTMLCanvasElement, engine: ChartEngine) {
    this.canvas = canvas;
    this.engine = engine;

    this.boundMouseMove = this.onMouseMove.bind(this);
    this.boundMouseDown = this.onMouseDown.bind(this);
    this.boundMouseUp = this.onMouseUp.bind(this);
    this.boundMouseLeave = this.onMouseLeave.bind(this);
    this.boundWheel = this.onWheel.bind(this);
    this.boundContextMenu = (e) => e.preventDefault();

    this.attach();
  }

  private attach(): void {
    this.canvas.addEventListener('mousemove', this.boundMouseMove, { passive: true });
    this.canvas.addEventListener('mousedown', this.boundMouseDown);
    this.canvas.addEventListener('mouseup', this.boundMouseUp);
    this.canvas.addEventListener('mouseleave', this.boundMouseLeave);
    this.canvas.addEventListener('wheel', this.boundWheel, { passive: false });
    this.canvas.addEventListener('contextmenu', this.boundContextMenu);
  }

  destroy(): void {
    this.canvas.removeEventListener('mousemove', this.boundMouseMove);
    this.canvas.removeEventListener('mousedown', this.boundMouseDown);
    this.canvas.removeEventListener('mouseup', this.boundMouseUp);
    this.canvas.removeEventListener('mouseleave', this.boundMouseLeave);
    this.canvas.removeEventListener('wheel', this.boundWheel);
    this.canvas.removeEventListener('contextmenu', this.boundContextMenu);
  }

  private getLocalPos(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;
    this.isDragging = true;
    this.lastDragX = e.clientX;
    this.canvas.style.cursor = 'grabbing';
  }

  private onMouseUp(e: MouseEvent): void {
    if (e.button !== 0) return;
    this.isDragging = false;
    this.canvas.style.cursor = 'crosshair';
  }

  private onMouseLeave(): void {
    this.isDragging = false;
    this.canvas.style.cursor = 'crosshair';
    this.engine.clearCrosshair();
  }

  private onMouseMove(e: MouseEvent): void {
    const pos = this.getLocalPos(e);

    if (this.isDragging) {
      const delta = e.clientX - this.lastDragX;
      this.lastDragX = e.clientX;
      if (Math.abs(delta) >= 1) {
        this.engine.pan(delta);
      }
    }

    this.engine.setCrosshair(pos.x, pos.y);
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const pos = this.getLocalPos(e);
    const view = this.engine.getView();
    const rect = this.canvas.getBoundingClientRect();
    const chartWidth = rect.width - 86;
    const ratio = Math.max(0, Math.min(1, (pos.x - 70) / chartWidth));
    const dataX = view.start + ratio * view.count;

    const zoomFactor = e.deltaY > 0 ? 1.12 : 0.89;
    this.engine.zoomAt(dataX, zoomFactor);
  }
}
