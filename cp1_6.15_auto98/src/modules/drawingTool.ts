export type BrushShape = 'line' | 'arrow' | 'star' | 'bubble';
export type BrushSize = 2 | 4 | 6;

export interface BrushSettings {
  size: BrushSize;
  color: string;
  shape: BrushShape;
}

interface Point {
  x: number;
  y: number;
}

interface DrawAction {
  shape: BrushShape;
  color: string;
  size: BrushSize;
  points: Point[];
  startPoint?: Point;
  endPoint?: Point;
  text?: string;
}

export class DrawingTool {
  private ctx: CanvasRenderingContext2D | null = null;
  private currentAction: DrawAction | null = null;
  private isDrawing = false;
  private lastPoint: Point | null = null;
  private history: ImageData[] = [];
  private maxHistory = 5;

  constructor(private width: number, private height: number) {}

  setContext(ctx: CanvasRenderingContext2D): void {
    this.ctx = ctx;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  startDrawing(x: number, y: number, settings: BrushSettings): void {
    if (!this.ctx) return;
    this.isDrawing = true;
    this.lastPoint = { x, y };
    this.currentAction = {
      shape: settings.shape,
      color: settings.color,
      size: settings.size,
      points: [{ x, y }],
      startPoint: { x, y }
    };
    this.saveSnapshot();
  }

  draw(x: number, y: number): void {
    if (!this.isDrawing || !this.ctx || !this.currentAction || !this.lastPoint) return;

    const point = { x, y };
    this.currentAction.points.push(point);

    if (this.currentAction.shape === 'line') {
      this.drawSmoothLine(this.lastPoint, point, this.currentAction.color, this.currentAction.size);
    } else if (this.currentAction.shape === 'arrow') {
      this.currentAction.endPoint = point;
    } else if (this.currentAction.shape === 'star') {
      this.currentAction.endPoint = point;
    } else if (this.currentAction.shape === 'bubble') {
      this.currentAction.endPoint = point;
    }

    this.lastPoint = point;
  }

  endDrawing(): DrawAction | null {
    if (!this.ctx || !this.currentAction) return null;

    if (this.currentAction.shape !== 'line' && this.currentAction.startPoint && this.currentAction.endPoint) {
      this.drawShapeFromPoints(this.currentAction);
    }

    this.isDrawing = false;
    const action = { ...this.currentAction };
    this.currentAction = null;
    this.lastPoint = null;
    return action;
  }

  private drawSmoothLine(from: Point, to: Point, color: string, size: BrushSize): void {
    if (!this.ctx) return;
    const mid = {
      x: (from.x + to.x) / 2,
      y: (from.y + to.y) / 2
    };

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = size;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    this.ctx.beginPath();
    this.ctx.moveTo(from.x, from.y);
    this.ctx.quadraticCurveTo(mid.x, mid.y, to.x, to.y);
    this.ctx.stroke();
  }

  private drawShapeFromPoints(action: DrawAction): void {
    if (!this.ctx || !action.startPoint || !action.endPoint) return;

    const { startPoint: s, endPoint: e, color, size, shape } = action;

    this.ctx.strokeStyle = color;
    this.ctx.fillStyle = color;
    this.ctx.lineWidth = size;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    switch (shape) {
      case 'arrow':
        this.drawArrow(s, e, color, size);
        break;
      case 'star':
        this.drawStar(s, e, color);
        break;
      case 'bubble':
        this.drawBubble(s, e, color, size);
        break;
    }
  }

  private drawArrow(s: Point, e: Point, color: string, size: number): void {
    if (!this.ctx) return;
    const dx = e.x - s.x;
    const dy = e.y - s.y;
    const angle = Math.atan2(dy, dx);
    const headLen = 15 + size * 3;

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = size;
    this.ctx.beginPath();
    this.ctx.moveTo(s.x, s.y);
    this.ctx.lineTo(e.x, e.y);
    this.ctx.stroke();

    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.moveTo(e.x, e.y);
    this.ctx.lineTo(
      e.x - headLen * Math.cos(angle - Math.PI / 6),
      e.y - headLen * Math.sin(angle - Math.PI / 6)
    );
    this.ctx.lineTo(
      e.x - headLen * Math.cos(angle + Math.PI / 6),
      e.y - headLen * Math.sin(angle + Math.PI / 6)
    );
    this.ctx.closePath();
    this.ctx.fill();
  }

  private drawStar(s: Point, e: Point, color: string): void {
    if (!this.ctx) return;
    const cx = (s.x + e.x) / 2;
    const cy = (s.y + e.y) / 2;
    const outerR = Math.sqrt((e.x - s.x) ** 2 + (e.y - s.y) ** 2) / 2;
    const innerR = outerR * 0.4;
    const spikes = 5;

    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (Math.PI * i) / spikes - Math.PI / 2;
      const px = cx + r * Math.cos(angle);
      const py = cy + r * Math.sin(angle);
      if (i === 0) this.ctx.moveTo(px, py);
      else this.ctx.lineTo(px, py);
    }
    this.ctx.closePath();
    this.ctx.fill();
  }

  private drawBubble(s: Point, e: Point, color: string, size: number): void {
    if (!this.ctx) return;
    const cx = (s.x + e.x) / 2;
    const cy = (s.y + e.y) / 2;
    const rx = Math.abs(e.x - s.x) / 2;
    const ry = Math.abs(e.y - s.y) / 2;

    this.ctx.fillStyle = 'rgba(255,255,255,0.95)';
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = size;
    this.ctx.beginPath();
    this.ctx.ellipse(cx, cy, Math.max(rx, 30), Math.max(ry, 20), 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    const tailX = e.x < cx ? cx - rx * 0.7 : cx + rx * 0.7;
    const tailY = cy + ry * 0.6;
    this.ctx.beginPath();
    this.ctx.moveTo(tailX, tailY);
    this.ctx.lineTo(e.x, e.y);
    this.ctx.lineTo(tailX + 15, tailY - 5);
    this.ctx.closePath();
    this.ctx.fillStyle = 'rgba(255,255,255,0.95)';
    this.ctx.fill();
    this.ctx.stroke();
  }

  private saveSnapshot(): void {
    if (!this.ctx) return;
    const snapshot = this.ctx.getImageData(0, 0, this.width, this.height);
    this.history.push(snapshot);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  undo(): boolean {
    if (!this.ctx || this.history.length === 0) return false;
    const snapshot = this.history.pop()!;
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.putImageData(snapshot, 0, 0);
    return true;
  }

  canUndo(): boolean {
    return this.history.length > 0;
  }

  getHistoryCount(): number {
    return this.history.length;
  }

  getHistoryThumbnail(index: number): ImageData | null {
    if (index < 0 || index >= this.history.length) return null;
    return this.history[index];
  }

  clear(): void {
    if (!this.ctx) return;
    this.saveSnapshot();
    this.ctx.clearRect(0, 0, this.width, this.height);
  }
}
