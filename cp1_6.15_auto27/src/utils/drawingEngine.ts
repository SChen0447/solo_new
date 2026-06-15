import type {
  WhiteboardElement,
  PenElement,
  RectElement,
  CircleElement,
  LineElement,
  NoteElement,
  ImageElement,
  Point
} from '../store/useWhiteboardStore';

export class DrawingEngine {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;
  }

  resize(width: number, height: number) {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    this.ctx.scale(dpr, dpr);
  }

  clear() {
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();
  }

  drawGrid(offsetX: number, offsetY: number, scale: number, viewportWidth: number, viewportHeight: number) {
    const gridSize = 30;
    this.ctx.save();
    this.ctx.strokeStyle = '#e0e0e0';
    this.ctx.globalAlpha = 0.5;
    this.ctx.lineWidth = 1 / scale;

    const scaledGridSize = gridSize * scale;
    const startX = (-offsetX % scaledGridSize + scaledGridSize) % scaledGridSize;
    const startY = (-offsetY % scaledGridSize + scaledGridSize) % scaledGridSize;

    this.ctx.beginPath();
    for (let x = startX; x < viewportWidth; x += scaledGridSize) {
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, viewportHeight);
    }
    for (let y = startY; y < viewportHeight; y += scaledGridSize) {
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(viewportWidth, y);
    }
    this.ctx.stroke();
    this.ctx.restore();
  }

  drawElement(element: WhiteboardElement, selected: boolean = false) {
    this.ctx.save();
    if (selected) {
      this.ctx.shadowColor = 'rgba(0, 210, 255, 0.5)';
      this.ctx.shadowBlur = 6;
      this.ctx.shadowOffsetX = 2;
      this.ctx.shadowOffsetY = 2;
    }
    switch (element.type) {
      case 'pen':
        this.drawPen(element);
        break;
      case 'rect':
        this.drawRect(element);
        break;
      case 'circle':
        this.drawCircle(element);
        break;
      case 'line':
        this.drawLine(element);
        break;
    }
    this.ctx.restore();

    if (selected) {
      this.drawSelectionBox(element);
    }
  }

  private drawPen(element: PenElement) {
    if (element.points.length < 2) return;
    this.ctx.strokeStyle = element.color;
    this.ctx.lineWidth = element.thickness;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.beginPath();
    this.ctx.moveTo(element.points[0].x, element.points[0].y);
    for (let i = 1; i < element.points.length; i++) {
      this.ctx.lineTo(element.points[i].x, element.points[i].y);
    }
    this.ctx.stroke();
  }

  private drawRect(element: RectElement) {
    this.ctx.strokeStyle = element.color;
    this.ctx.lineWidth = element.thickness;
    if (element.fill) {
      this.ctx.fillStyle = element.fill;
      this.ctx.fillRect(element.x, element.y, element.width, element.height);
    }
    this.ctx.strokeRect(element.x, element.y, element.width, element.height);
  }

  private drawCircle(element: CircleElement) {
    const rx = Math.abs(element.width) / 2;
    const ry = Math.abs(element.height) / 2;
    const cx = element.x + element.width / 2;
    const cy = element.y + element.height / 2;
    this.ctx.strokeStyle = element.color;
    this.ctx.lineWidth = element.thickness;
    this.ctx.beginPath();
    this.ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    if (element.fill) {
      this.ctx.fillStyle = element.fill;
      this.ctx.fill();
    }
    this.ctx.stroke();
  }

  private drawLine(element: LineElement) {
    this.ctx.strokeStyle = element.color;
    this.ctx.lineWidth = element.thickness;
    this.ctx.lineCap = 'round';
    this.ctx.beginPath();
    this.ctx.moveTo(element.x, element.y);
    this.ctx.lineTo(element.x2, element.y2);
    this.ctx.stroke();
  }

  private drawSelectionBox(element: WhiteboardElement) {
    this.ctx.save();
    this.ctx.strokeStyle = '#00d2ff';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([6, 4]);

    const box = this.getElementBounds(element);
    const pad = 6;
    this.ctx.strokeRect(box.x - pad, box.y - pad, box.w + pad * 2, box.h + pad * 2);
    this.ctx.restore();
  }

  getElementBounds(element: WhiteboardElement): { x: number; y: number; w: number; h: number } {
    switch (element.type) {
      case 'pen': {
        if (element.points.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of element.points) {
          minX = Math.min(minX, p.x);
          minY = Math.min(minY, p.y);
          maxX = Math.max(maxX, p.x);
          maxY = Math.max(maxY, p.y);
        }
        return { x: minX - 4, y: minY - 4, w: maxX - minX + 8, h: maxY - minY + 8 };
      }
      case 'rect':
      case 'circle':
      case 'note':
      case 'image': {
        const w = Math.abs(element.width);
        const h = Math.abs(element.height);
        const x = element.width < 0 ? element.x - w : element.x;
        const y = element.height < 0 ? element.y - h : element.y;
        return { x, y, w, h };
      }
      case 'line': {
        const minX = Math.min(element.x, element.x2);
        const minY = Math.min(element.y, element.y2);
        const maxX = Math.max(element.x, element.x2);
        const maxY = Math.max(element.y, element.y2);
        return { x: minX - 4, y: minY - 4, w: maxX - minX + 8, h: maxY - minY + 8 };
      }
      default:
        return { x: 0, y: 0, w: 0, h: 0 };
    }
  }

  hitTest(point: Point, elements: WhiteboardElement[]): string | null {
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (el.type === 'note' || el.type === 'image') continue;
      const bounds = this.getElementBounds(el);
      if (
        point.x >= bounds.x &&
        point.x <= bounds.x + bounds.w &&
        point.y >= bounds.y &&
        point.y <= bounds.y + bounds.h
      ) {
        return el.id;
      }
    }
    return null;
  }

  drawPreviewLine(start: Point, end: Point, color: string, thickness: number) {
    this.ctx.save();
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = thickness;
    this.ctx.setLineDash([5, 5]);
    this.ctx.lineCap = 'round';
    this.ctx.beginPath();
    this.ctx.moveTo(start.x, start.y);
    this.ctx.lineTo(end.x, end.y);
    this.ctx.stroke();
    this.ctx.restore();
  }

  drawPreviewRect(x: number, y: number, w: number, h: number, color: string, thickness: number) {
    this.ctx.save();
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = thickness;
    this.ctx.setLineDash([5, 5]);
    this.ctx.strokeRect(x, y, w, h);
    this.ctx.restore();
  }

  drawPreviewCircle(x: number, y: number, w: number, h: number, color: string, thickness: number) {
    this.ctx.save();
    const rx = Math.abs(w) / 2;
    const ry = Math.abs(h) / 2;
    const cx = x + w / 2;
    const cy = y + h / 2;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = thickness;
    this.ctx.setLineDash([5, 5]);
    this.ctx.beginPath();
    this.ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.restore();
  }

  drawPreviewPoints(points: Point[], color: string, thickness: number) {
    if (points.length < 2) return;
    this.ctx.save();
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = thickness;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x, points[i].y);
    }
    this.ctx.stroke();
    this.ctx.restore();
  }
}
