import { v4 as uuidv4 } from 'uuid';
import type { Shape, Point, ToolType, RectangleShape, CircleShape, PolygonShape, FreehandShape } from '../types';

const GRID_SIZE = 20;
const GRID_COLOR = '#e0e0e0';

export class CanvasEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private shapes: Shape[] = [];
  private zoom: number = 1;
  private offset: Point = { x: 0, y: 0 };
  private currentTool: ToolType = 'rectangle';
  private currentColor: string = '#3b82f6';
  private lineWidth: number = 3;
  private isDrawing: boolean = false;
  private isPanning: boolean = false;
  private isSpacePressed: boolean = false;
  private startPoint: Point = { x: 0, y: 0 };
  private lastPanPoint: Point = { x: 0, y: 0 };
  private previewShape: Shape | null = null;
  private polygonPoints: Point[] = [];
  private animationFrameId: number | null = null;
  private onShapeAddCallback: ((shape: Shape) => void) | null = null;
  private onStateChangeCallback: (() => void) | null = null;
  private onColorPickCallback: ((color: string) => void) | null = null;

  init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
    this.startRenderLoop();
  }

  destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.canvas = null;
    this.ctx = null;
  }

  resize(): void {
    if (!this.canvas) return;
    
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    
    if (this.ctx) {
      this.ctx.scale(dpr, dpr);
    }
  }

  setShapes(shapes: Shape[]): void {
    this.shapes = shapes;
  }

  setTool(tool: ToolType): void {
    this.currentTool = tool;
    this.polygonPoints = [];
    this.previewShape = null;
    this.notifyStateChange();
  }

  setColor(color: string): void {
    this.currentColor = color;
  }

  setLineWidth(width: number): void {
    this.lineWidth = width;
  }

  setZoom(zoom: number): void {
    this.zoom = Math.max(0.5, Math.min(5, zoom));
    this.notifyStateChange();
  }

  setOffset(offset: Point): void {
    this.offset = offset;
    this.notifyStateChange();
  }

  setSpacePressed(isPressed: boolean): void {
    this.isSpacePressed = isPressed;
    if (this.canvas) {
      this.canvas.style.cursor = isPressed || this.isPanning ? 'grab' : 'crosshair';
    }
  }

  setOnShapeAdd(callback: (shape: Shape) => void): void {
    this.onShapeAddCallback = callback;
  }

  setOnStateChange(callback: () => void): void {
    this.onStateChangeCallback = callback;
  }

  setOnColorPick(callback: (color: string) => void): void {
    this.onColorPickCallback = callback;
  }

  getZoom(): number {
    return this.zoom;
  }

  getOffset(): Point {
    return { ...this.offset };
  }

  getPreviewShape(): Shape | null {
    return this.previewShape;
  }

  private notifyStateChange(): void {
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback();
    }
  }

  private startRenderLoop(): void {
    const render = () => {
      this.render();
      this.animationFrameId = requestAnimationFrame(render);
    };
    render();
  }

  private render(): void {
    if (!this.ctx || !this.canvas) return;

    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    this.ctx.clearRect(0, 0, width, height);

    this.ctx.save();
    this.ctx.translate(this.offset.x, this.offset.y);
    this.ctx.scale(this.zoom, this.zoom);

    this.drawGrid(width, height);
    this.shapes.forEach((shape) => this.drawShape(shape));
    
    if (this.previewShape) {
      this.drawShape(this.previewShape, true);
    }

    this.ctx.restore();
  }

  private drawGrid(width: number, height: number): void {
    if (!this.ctx) return;

    const startX = -this.offset.x / this.zoom;
    const startY = -this.offset.y / this.zoom;
    const endX = startX + width / this.zoom;
    const endY = startY + height / this.zoom;

    this.ctx.strokeStyle = GRID_COLOR;
    this.ctx.lineWidth = 1 / this.zoom;

    const gridSize = GRID_SIZE;
    
    const startCol = Math.floor(startX / gridSize) * gridSize;
    const startRow = Math.floor(startY / gridSize) * gridSize;

    for (let x = startCol; x <= endX; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, startY);
      this.ctx.lineTo(x, endY);
      this.ctx.stroke();
    }

    for (let y = startRow; y <= endY; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(startX, y);
      this.ctx.lineTo(endX, y);
      this.ctx.stroke();
    }
  }

  private drawShape(shape: Shape, isPreview: boolean = false): void {
    if (!this.ctx) return;

    this.ctx.save();
    
    if (isPreview) {
      this.ctx.globalAlpha = 0.5;
    }

    this.ctx.strokeStyle = shape.color;
    this.ctx.lineWidth = shape.lineWidth;
    this.ctx.fillStyle = shape.fill || 'transparent';
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    switch (shape.type) {
      case 'rectangle':
        this.drawRectangle(shape);
        break;
      case 'circle':
        this.drawCircle(shape);
        break;
      case 'polygon':
        this.drawPolygon(shape);
        break;
      case 'freehand':
        this.drawFreehand(shape);
        break;
    }

    this.ctx.restore();
  }

  private drawRectangle(shape: RectangleShape): void {
    if (!this.ctx) return;
    this.ctx.beginPath();
    this.ctx.rect(shape.x, shape.y, shape.width, shape.height);
    this.ctx.stroke();
  }

  private drawCircle(shape: CircleShape): void {
    if (!this.ctx) return;
    this.ctx.beginPath();
    this.ctx.ellipse(shape.cx, shape.cy, Math.abs(shape.radiusX), Math.abs(shape.radiusY), 0, 0, Math.PI * 2);
    this.ctx.stroke();
  }

  private drawPolygon(shape: PolygonShape): void {
    if (!this.ctx || shape.points.length < 2) return;

    this.ctx.beginPath();
    this.ctx.moveTo(shape.points[0].x, shape.points[0].y);
    
    for (let i = 1; i < shape.points.length; i++) {
      this.ctx.lineTo(shape.points[i].x, shape.points[i].y);
    }
    
    if (shape.isComplete) {
      this.ctx.closePath();
    }
    
    this.ctx.stroke();
  }

  private drawFreehand(shape: FreehandShape): void {
    if (!this.ctx || shape.points.length < 2) return;

    this.ctx.beginPath();
    this.ctx.moveTo(shape.points[0].x, shape.points[0].y);
    
    for (let i = 1; i < shape.points.length; i++) {
      this.ctx.lineTo(shape.points[i].x, shape.points[i].y);
    }
    
    this.ctx.stroke();
  }

  screenToWorld(screenX: number, screenY: number): Point {
    return {
      x: (screenX - this.offset.x) / this.zoom,
      y: (screenY - this.offset.y) / this.zoom,
    };
  }

  handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>): void {
    if (!this.canvas) return;

    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldPoint = this.screenToWorld(screenX, screenY);

    if (this.isSpacePressed || e.button === 1) {
      this.isPanning = true;
      this.lastPanPoint = { x: screenX, y: screenY };
      if (this.canvas) {
        this.canvas.style.cursor = 'grabbing';
      }
      return;
    }

    if (this.currentTool === 'eyedropper') {
      this.pickColor(screenX, screenY);
      return;
    }

    if (this.currentTool === 'polygon') {
      this.polygonPoints.push(worldPoint);
      
      if (this.polygonPoints.length >= 3) {
        const dist = Math.hypot(
          worldPoint.x - this.polygonPoints[0].x,
          worldPoint.y - this.polygonPoints[0].y
        );
        if (dist < 10) {
          this.completePolygon();
          return;
        }
      }
      
      this.previewShape = {
        id: uuidv4(),
        type: 'polygon',
        color: this.currentColor,
        lineWidth: this.lineWidth,
        points: [...this.polygonPoints],
        isComplete: false,
      };
      this.notifyStateChange();
      return;
    }

    this.isDrawing = true;
    this.startPoint = worldPoint;

    switch (this.currentTool) {
      case 'rectangle':
        this.previewShape = {
          id: uuidv4(),
          type: 'rectangle',
          color: this.currentColor,
          lineWidth: this.lineWidth,
          x: worldPoint.x,
          y: worldPoint.y,
          width: 0,
          height: 0,
        };
        break;
      case 'circle':
        this.previewShape = {
          id: uuidv4(),
          type: 'circle',
          color: this.currentColor,
          lineWidth: this.lineWidth,
          cx: worldPoint.x,
          cy: worldPoint.y,
          radiusX: 0,
          radiusY: 0,
        };
        break;
      case 'freehand':
        this.previewShape = {
          id: uuidv4(),
          type: 'freehand',
          color: this.currentColor,
          lineWidth: this.lineWidth,
          points: [worldPoint],
        };
        break;
    }
    
    this.notifyStateChange();
  }

  handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>): void {
    if (!this.canvas) return;

    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldPoint = this.screenToWorld(screenX, screenY);

    if (this.isPanning) {
      const dx = screenX - this.lastPanPoint.x;
      const dy = screenY - this.lastPanPoint.y;
      this.offset.x += dx;
      this.offset.y += dy;
      this.lastPanPoint = { x: screenX, y: screenY };
      this.notifyStateChange();
      return;
    }

    if (!this.isDrawing && this.currentTool !== 'polygon') return;

    switch (this.currentTool) {
      case 'rectangle':
        if (this.previewShape && this.previewShape.type === 'rectangle') {
          this.previewShape.x = Math.min(this.startPoint.x, worldPoint.x);
          this.previewShape.y = Math.min(this.startPoint.y, worldPoint.y);
          this.previewShape.width = Math.abs(worldPoint.x - this.startPoint.x);
          this.previewShape.height = Math.abs(worldPoint.y - this.startPoint.y);
        }
        break;
      case 'circle':
        if (this.previewShape && this.previewShape.type === 'circle') {
          this.previewShape.radiusX = worldPoint.x - this.startPoint.x;
          this.previewShape.radiusY = worldPoint.y - this.startPoint.y;
        }
        break;
      case 'freehand':
        if (this.previewShape && this.previewShape.type === 'freehand') {
          this.previewShape.points.push(worldPoint);
        }
        break;
      case 'polygon':
        if (this.polygonPoints.length > 0) {
          this.previewShape = {
            id: uuidv4(),
            type: 'polygon',
            color: this.currentColor,
            lineWidth: this.lineWidth,
            points: [...this.polygonPoints, worldPoint],
            isComplete: false,
          };
        }
        break;
    }
    
    this.notifyStateChange();
  }

  handleMouseUp(e: React.MouseEvent<HTMLCanvasElement>): void {
    if (this.isPanning) {
      this.isPanning = false;
      if (this.canvas) {
        this.canvas.style.cursor = this.isSpacePressed ? 'grab' : 'crosshair';
      }
      return;
    }

    if (!this.isDrawing) return;

    this.isDrawing = false;

    if (this.previewShape) {
      const finalShape = { ...this.previewShape };
      this.shapes.push(finalShape);
      if (this.onShapeAddCallback) {
        this.onShapeAddCallback(finalShape);
      }
      this.previewShape = null;
    }
    
    this.notifyStateChange();
  }

  handleMouseLeave(): void {
    if (this.isPanning) {
      this.isPanning = false;
      if (this.canvas) {
        this.canvas.style.cursor = this.isSpacePressed ? 'grab' : 'crosshair';
      }
    }
  }

  handleWheel(e: React.WheelEvent<HTMLCanvasElement>): void {
    e.preventDefault();
    
    if (!this.canvas) return;

    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const worldX = (mouseX - this.offset.x) / this.zoom;
    const worldY = (mouseY - this.offset.y) / this.zoom;

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.5, Math.min(5, this.zoom * zoomFactor));

    this.offset.x = mouseX - worldX * newZoom;
    this.offset.y = mouseY - worldY * newZoom;
    this.zoom = newZoom;
    
    this.notifyStateChange();
  }

  handleDoubleClick(e: React.MouseEvent<HTMLCanvasElement>): void {
    if (this.currentTool === 'polygon' && this.polygonPoints.length >= 3) {
      this.completePolygon();
    }
  }

  private completePolygon(): void {
    if (this.polygonPoints.length < 3) return;

    const shape: PolygonShape = {
      id: uuidv4(),
      type: 'polygon',
      color: this.currentColor,
      lineWidth: this.lineWidth,
      points: [...this.polygonPoints],
      isComplete: true,
    };

    this.shapes.push(shape);
    if (this.onShapeAddCallback) {
      this.onShapeAddCallback(shape);
    }

    this.polygonPoints = [];
    this.previewShape = null;
    this.notifyStateChange();
  }

  private pickColor(screenX: number, screenY: number): void {
    if (!this.ctx || !this.canvas) return;

    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const x = screenX * dpr;
    const y = screenY * dpr;

    try {
      const imageData = this.ctx.getImageData(x, y, 1, 1);
      const pixel = imageData.data;
      const hex = this.rgbToHex(pixel[0], pixel[1], pixel[2]);
      
      if (this.onColorPickCallback) {
        this.onColorPickCallback(hex);
      }
    } catch (e) {
      console.error('Failed to pick color:', e);
    }
  }

  private rgbToHex(r: number, g: number, b: number): string {
    return (
      '#' +
      [r, g, b]
        .map((x) => {
          const hex = Math.round(x).toString(16);
          return hex.length === 1 ? '0' + hex : hex;
        })
        .join('')
    );
  }

  resetPolygon(): void {
    this.polygonPoints = [];
    this.previewShape = null;
    this.notifyStateChange();
  }
}
