import { HeightMap, ViewTransform, ToolType } from '../types';
import { TerrainEditor } from './terrainEditor';

export class TerrainRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private viewTransform: ViewTransform = { offsetX: 0, offsetY: 0, scale: 1.0 };
  private isPanning: boolean = false;
  private panStartX: number = 0;
  private panStartY: number = 0;
  private panStartOffX: number = 0;
  private panStartOffY: number = 0;
  private isEditing: boolean = false;
  private currentTool: ToolType = 'raise';
  private onTerrainEdit: ((gridX: number, gridY: number, tool: ToolType) => void) | null = null;
  private cellSize: number = 10;
  private minScale: number = 0.3;
  private maxScale: number = 3.0;
  private showGrid: boolean = true;
  private terrainEditor: TerrainEditor | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
    this.bindEvents();
  }

  setTerrainEditor(editor: TerrainEditor): void {
    this.terrainEditor = editor;
  }

  private bindEvents(): void {
    this.canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.onMouseUp.bind(this));
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.viewTransform.scale * zoomFactor));

    const worldX = (mx - this.viewTransform.offsetX) / this.viewTransform.scale;
    const worldY = (my - this.viewTransform.offsetY) / this.viewTransform.scale;

    this.viewTransform.scale = newScale;
    this.viewTransform.offsetX = mx - worldX * newScale;
    this.viewTransform.offsetY = my - worldY * newScale;
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      this.isPanning = true;
      this.panStartX = e.clientX;
      this.panStartY = e.clientY;
      this.panStartOffX = this.viewTransform.offsetX;
      this.panStartOffY = this.viewTransform.offsetY;
      this.canvas.style.cursor = 'grabbing';
    } else if (e.button === 0) {
      this.isEditing = true;
      this.editAtMouse(e);
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if (this.isPanning) {
      this.viewTransform.offsetX = this.panStartOffX + (e.clientX - this.panStartX);
      this.viewTransform.offsetY = this.panStartOffY + (e.clientY - this.panStartY);
    } else if (this.isEditing) {
      this.editAtMouse(e);
    }
  }

  private onMouseUp(_e: MouseEvent): void {
    this.isPanning = false;
    this.isEditing = false;
    this.canvas.style.cursor = 'crosshair';
  }

  private editAtMouse(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const worldX = (mx - this.viewTransform.offsetX) / this.viewTransform.scale;
    const worldY = (my - this.viewTransform.offsetY) / this.viewTransform.scale;
    const gridX = Math.floor(worldX / this.cellSize);
    const gridY = Math.floor(worldY / this.cellSize);

    if (this.terrainEditor) {
      const { cols, rows } = this.terrainEditor.getHeightMap();
      if (gridX >= 0 && gridX < cols && gridY >= 0 && gridY < rows) {
        const elapsed = performance.now() - this.terrainEditor.applyTool(gridX, gridY, this.currentTool);
        if (this.onTerrainEdit) {
          this.onTerrainEdit(gridX, gridY, this.currentTool);
        }
      }
    }
  }

  setTool(tool: ToolType): void {
    this.currentTool = tool;
  }

  getTool(): ToolType {
    return this.currentTool;
  }

  onEdit(cb: (gridX: number, gridY: number, tool: ToolType) => void): void {
    this.onTerrainEdit = cb;
  }

  getViewTransform(): ViewTransform {
    return { ...this.viewTransform };
  }

  setViewTransform(vt: ViewTransform): void {
    this.viewTransform = { ...vt };
  }

  setCellSize(size: number): void {
    this.cellSize = size;
  }

  getCellSize(): number {
    return this.cellSize;
  }

  render(heightMap: HeightMap): void {
    const { cols, rows, data } = heightMap;
    const { offsetX, offsetY, scale } = this.viewTransform;
    const cs = this.cellSize * scale;

    this.ctx.save();
    this.ctx.translate(offsetX, offsetY);

    const startCol = Math.max(0, Math.floor(-offsetX / cs));
    const startRow = Math.max(0, Math.floor(-offsetY / cs));
    const endCol = Math.min(cols, Math.ceil((this.canvas.width - offsetX) / cs));
    const endRow = Math.min(rows, Math.ceil((this.canvas.height - offsetY) / cs));

    for (let y = startRow; y < endRow; y++) {
      for (let x = startCol; x < endCol; x++) {
        const h = data[y * cols + x];
        this.ctx.fillStyle = this.heightToColor(h);
        this.ctx.fillRect(x * cs, y * cs, cs + 0.5, cs + 0.5);
      }
    }

    if (this.showGrid && cs > 4) {
      this.ctx.strokeStyle = `rgba(100, 180, 220, ${Math.min(0.15, cs / 100)})`;
      this.ctx.lineWidth = 0.5;
      this.ctx.beginPath();
      for (let x = startCol; x <= endCol; x++) {
        this.ctx.moveTo(x * cs, startRow * cs);
        this.ctx.lineTo(x * cs, endRow * cs);
      }
      for (let y = startRow; y <= endRow; y++) {
        this.ctx.moveTo(startCol * cs, y * cs);
        this.ctx.lineTo(endCol * cs, y * cs);
      }
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  private heightToColor(h: number): string {
    if (h < 0.15) {
      const t = h / 0.15;
      const r = Math.floor(10 + t * 20);
      const g = Math.floor(40 + t * 60);
      const b = Math.floor(120 + t * 50);
      return `rgb(${r},${g},${b})`;
    } else if (h < 0.3) {
      const t = (h - 0.15) / 0.15;
      const r = Math.floor(30 - t * 10);
      const g = Math.floor(100 + t * 40);
      const b = Math.floor(170 - t * 40);
      return `rgb(${r},${g},${b})`;
    } else if (h < 0.5) {
      const t = (h - 0.3) / 0.2;
      const r = Math.floor(20 + t * 60);
      const g = Math.floor(140 - t * 40);
      const b = Math.floor(130 - t * 60);
      return `rgb(${r},${g},${b})`;
    } else if (h < 0.7) {
      const t = (h - 0.5) / 0.2;
      const r = Math.floor(80 + t * 70);
      const g = Math.floor(100 - t * 30);
      const b = Math.floor(70 - t * 30);
      return `rgb(${r},${g},${b})`;
    } else {
      const t = (h - 0.7) / 0.3;
      const r = Math.floor(150 + t * 80);
      const g = Math.floor(70 + t * 80);
      const b = Math.floor(40 + t * 60);
      return `rgb(${r},${g},${b})`;
    }
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  screenToGrid(screenX: number, screenY: number): { gx: number; gy: number } {
    const wx = (screenX - this.viewTransform.offsetX) / this.viewTransform.scale;
    const wy = (screenY - this.viewTransform.offsetY) / this.viewTransform.scale;
    return {
      gx: Math.floor(wx / this.cellSize),
      gy: Math.floor(wy / this.cellSize),
    };
  }

  centerView(cols: number, rows: number): void {
    const totalW = cols * this.cellSize;
    const totalH = rows * this.cellSize;
    const scaleX = (this.canvas.width * 0.9) / totalW;
    const scaleY = (this.canvas.height * 0.9) / totalH;
    this.viewTransform.scale = Math.min(scaleX, scaleY, 2.0);
    this.viewTransform.offsetX = (this.canvas.width - totalW * this.viewTransform.scale) / 2;
    this.viewTransform.offsetY = (this.canvas.height - totalH * this.viewTransform.scale) / 2;
  }
}
