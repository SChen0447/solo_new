import { ShapeUnion, SelectionState, CanvasState, BoundingBox } from '../shapes/types';

export type HandleType = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se' | 'rotate';

export interface DrawEngineOptions {
  showGrid?: boolean;
  showHandles?: boolean;
  backgroundColor?: string;
  gridColor?: string;
}

export class DrawEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private shapes: ShapeUnion[] = [];
  private selection: SelectionState = { selectedIds: [], editingGroupId: null };
  private canvasState: CanvasState = {
    zoom: 1,
    panX: 0,
    panY: 0,
    width: 800,
    height: 600,
  };
  private selectionBox: BoundingBox | null = null;
  private activeHandle: HandleType | null = null;
  private options: DrawEngineOptions;
  private rafId: number | null = null;
  private animationFrame: number | null = null;

  constructor(canvas: HTMLCanvasElement, options: DrawEngineOptions = {}) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
    this.options = {
      showGrid: true,
      showHandles: true,
      backgroundColor: '#F0F0F0',
      gridColor: '#D0D0D0',
      ...options,
    };
  }

  setCanvasState(state: Partial<CanvasState>): void {
    this.canvasState = { ...this.canvasState, ...state };
    this.scheduleRender();
  }

  getCanvasState(): CanvasState {
    return { ...this.canvasState };
  }

  setShapes(shapes: ShapeUnion[]): void {
    this.shapes = shapes;
    this.scheduleRender();
  }

  setSelection(selection: SelectionState): void {
    this.selection = selection;
    this.scheduleRender();
  }

  setSelectionBox(box: BoundingBox | null): void {
    this.selectionBox = box;
    this.scheduleRender();
  }

  setActiveHandle(handle: HandleType | null): void {
    this.activeHandle = handle;
    this.scheduleRender();
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const x = (screenX - rect.left - this.canvasState.panX) / this.canvasState.zoom;
    const y = (screenY - rect.top - this.canvasState.panY) / this.canvasState.zoom;
    return { x, y };
  }

  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const x = worldX * this.canvasState.zoom + this.canvasState.panX + rect.left;
    const y = worldY * this.canvasState.zoom + this.canvasState.panY + rect.top;
    return { x, y };
  }

  private scheduleRender(): void {
    if (this.rafId) return;
    this.rafId = requestAnimationFrame(() => {
      this.render();
      this.rafId = null;
    });
  }

  render(): void {
    const { width, height, zoom, panX, panY } = this.canvasState;

    this.canvas.width = width;
    this.canvas.height = height;

    this.clear();

    this.ctx.save();
    this.ctx.translate(panX, panY);
    this.ctx.scale(zoom, zoom);

    if (this.options.showGrid) {
      this.drawGrid();
    }

    this.drawShapes();

    if (this.options.showHandles && this.selection.selectedIds.length > 0) {
      this.drawSelectionHandles();
    }

    if (this.selectionBox) {
      this.drawSelectionBox();
    }

    this.ctx.restore();
  }

  clear(): void {
    const { width, height } = this.canvasState;
    this.ctx.clearRect(0, 0, width, height);
    this.ctx.fillStyle = this.options.backgroundColor || '#F0F0F0';
    this.ctx.fillRect(0, 0, width, height);
  }

  private drawGrid(): void {
    const { width, height, zoom } = this.canvasState;
    const rect = this.canvas.getBoundingClientRect();

    let gridSize = 20;
    if (zoom < 0.5) gridSize = 80;
    else if (zoom < 1) gridSize = 40;
    else if (zoom < 2) gridSize = 20;
    else gridSize = 10;

    this.ctx.strokeStyle = this.options.gridColor || '#D0D0D0';
    this.ctx.lineWidth = 1 / zoom;

    const startX = Math.floor(-this.canvasState.panX / zoom / gridSize) * gridSize;
    const startY = Math.floor(-this.canvasState.panY / zoom / gridSize) * gridSize;
    const endX = startX + (width / zoom) + gridSize * 2;
    const endY = startY + (height / zoom) + gridSize * 2;

    this.ctx.beginPath();
    for (let x = startX; x <= endX; x += gridSize) {
      this.ctx.moveTo(x, startY);
      this.ctx.lineTo(x, endY);
    }
    for (let y = startY; y <= endY; y += gridSize) {
      this.ctx.moveTo(startX, y);
      this.ctx.lineTo(endX, y);
    }
    this.ctx.stroke();

    this.ctx.strokeStyle = '#B0B0B0';
    this.ctx.lineWidth = 1.5 / zoom;
    this.ctx.beginPath();
    this.ctx.moveTo(0, startY);
    this.ctx.lineTo(0, endY);
    this.ctx.moveTo(startX, 0);
    this.ctx.lineTo(endX, 0);
    this.ctx.stroke();
  }

  private drawShapes(): void {
    const visibleShapes = this.shapes.filter((s) => s.visible);

    const drawShape = (shape: ShapeUnion): void => {
      if (!shape.visible) return;

      if (shape.type === 'group') {
        return;
      }

      this.ctx.save();

      const cx = shape.x + shape.width / 2;
      const cy = shape.y + shape.height / 2;

      this.ctx.translate(cx, cy);
      this.ctx.rotate((shape.rotation * Math.PI) / 180;
      this.ctx.translate(-cx, -cy);

      this.drawShapePath(shape);

      if (shape.fillColor !== 'transparent') {
        this.ctx.fillStyle = shape.fillColor;
        this.ctx.fill();
      }

      if (shape.strokeWidth > 0 && shape.strokeColor !== 'transparent') {
        this.ctx.strokeStyle = shape.strokeColor;
        this.ctx.lineWidth = shape.strokeWidth;
        this.ctx.lineJoin = 'round';
        this.ctx.stroke();
      }

      this.ctx.restore();
    };

    visibleShapes.forEach(drawShape);
  }

  private drawShapePath(shape: ShapeUnion): void {
    const { x, y, width, height } = shape;

    this.ctx.beginPath();

    switch (shape.type) {
      case 'rectangle':
        const radius = (shape as any).borderRadius || 0;
        this.ctx.roundRect(x, y, width, height, radius);
        break;

      case 'circle':
        this.ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
        break;

      case 'triangle':
        this.ctx.moveTo(x + width / 2, y);
        this.ctx.lineTo(x + width, y + height);
        this.ctx.lineTo(x, y + height);
        this.ctx.closePath();
        break;

      case 'star':
        this.drawStar(x + width / 2, y + height / 2, shape.points, shape.outerRadius, shape.innerRadius);
        break;

      case 'heart':
        this.drawHeart(x, y, width, height);
        break;

      case 'arrow':
        this.drawArrow(x, y, width, height, shape.arrowHeadWidth, shape.arrowHeadHeight, shape.tailWidth);
        break;

      default:
        this.ctx.rect(x, y, width, height);
    }
  }

  private drawStar(cx: number, cy: number, points: number, outerR: number, innerR: number): void {
    this.ctx.moveTo(cx, cy - outerR);
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerR : innerR;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      this.ctx.lineTo(x, y);
    }
    this.ctx.closePath();
  }

  private drawHeart(x: number, y: number, width: number, height: number): void {
    const topCurveHeight = height * 0.3;
    const bottomCurveHeight = height * 0.7;
    const leftX = x + width * 0.2;
    const rightX = x + width * 0.8;
    const centerX = x + width / 2;
    const bottomY = y + height;

    this.ctx.moveTo(centerX, y + topCurveHeight);
    this.ctx.bezierCurveTo(
      x, y,
      x, y + topCurveHeight,
      centerX, bottomY
    );
    this.ctx.bezierCurveTo(
      x + width, y + topCurveHeight,
      x + width, y,
      centerX, y + topCurveHeight
    );
  }

  private drawArrow(
    x: number,
    y: number,
    width: number,
    height: number,
    headW: number,
    headH: number,
    tailW: number
  ): void {
    const tailX = x;
    const tailCenterY = y + height / 2;
    const tailTopY = tailCenterY - tailW / 2;
    const tailBottomY = tailCenterY + tailW / 2;
    const headStartX = x + width - headH;
    const headTopY = y;
    const headBottomY = y + height;
    const headTipX = x + width;
    const headCenterY = y + height / 2;

    this.ctx.moveTo(tailX, tailTopY);
    this.ctx.lineTo(headStartX, tailTopY);
    this.ctx.lineTo(headStartX, headTopY);
    this.ctx.lineTo(headTipX, headCenterY);
    this.ctx.lineTo(headStartX, headBottomY);
    this.ctx.lineTo(headStartX, tailBottomY);
    this.ctx.lineTo(tailX, tailBottomY);
    this.ctx.closePath();
  }

  private drawSelectionHandles(): void {
    const selectedShapes = this.shapes.filter((s) => this.selection.selectedIds.includes(s.id));

    selectedShapes.forEach((shape) => {
      const box = this.getShapeBoundingBox(shape);
      this.drawBoundingBox(box);
    });

    if (this.selection.selectedIds.length === 1 && selectedShapes[0]?.type !== 'group') {
      const shape = selectedShapes[0];
      const handles = this.getHandlePositions(shape);
      Object.entries(handles).forEach(([type, pos]) => {
        this.drawHandle(pos.x, pos.y, type as HandleType);
      });
      this.drawRotateHandle(shape);
    }

    if (this.selection.selectedIds.length > 1) {
      const box = this.getSelectionBoundingBox();
      if (box) {
        this.drawBoundingBox(box, true);
      }
    }
  }

  private getShapeBoundingBox(shape: ShapeUnion): BoundingBox {
    const cx = shape.x + shape.width / 2;
    const cy = shape.y + shape.height / 2;

    const corners = [
      { x: shape.x, y: shape.y },
      { x: shape.x + shape.width, y: shape.y },
      { x: shape.x, y: shape.y + shape.height },
      { x: shape