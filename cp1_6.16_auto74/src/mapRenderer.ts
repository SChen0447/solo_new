import { CellType, GridData, Point } from './mapGenerator';

const COLORS = {
  background: '#1a1a2e',
  wall: '#0f0f23',
  floor: '#e0e0e0',
  floorStroke: '#8e8e8e',
  corridor: '#4a4a4a',
  start: '#00ff88',
  end: '#ff3355',
  path: '#ffffff',
  gridLine: '#2a2a4e',
};

export class MapRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gridData: GridData | null = null;
  private cellSize: number = 16;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private scale: number = 1;
  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private dragOffsetX: number = 0;
  private dragOffsetY: number = 0;

  private startPoint: Point | null = null;
  private endPoint: Point | null = null;
  private pathPoints: Point[] = [];
  private pathAnimProgress: number = 0;
  private pathAnimRunning: boolean = false;
  private animFrameId: number = 0;
  private lastFrameTime: number = 0;
  private blinkPhase: number = 0;

  onCellClick: ((x: number, y: number) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;

    this.setupEvents();
    this.startRenderLoop();
  }

  private setupEvents(): void {
    this.canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.onMouseUp.bind(this));
    this.canvas.addEventListener('contextmenu', this.onContextMenu.bind(this));
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.3, Math.min(5, this.scale * delta));

    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    this.offsetX = mx - (mx - this.offsetX) * (newScale / this.scale);
    this.offsetY = my - (my - this.offsetY) * (newScale / this.scale);
    this.scale = newScale;
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button === 0) {
      this.isDragging = true;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      this.dragOffsetX = this.offsetX;
      this.dragOffsetY = this.offsetY;
      this.canvas.style.cursor = 'grabbing';
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if (this.isDragging) {
      this.offsetX = this.dragOffsetX + (e.clientX - this.dragStartX);
      this.offsetY = this.dragOffsetY + (e.clientY - this.dragStartY);
    }
  }

  private onMouseUp(): void {
    this.isDragging = false;
    this.canvas.style.cursor = 'default';
  }

  private onContextMenu(e: MouseEvent): void {
    e.preventDefault();
    if (!this.gridData || !this.onCellClick) return;

    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const cellX = Math.floor((mx - this.offsetX) / (this.cellSize * this.scale));
    const cellY = Math.floor((my - this.offsetY) / (this.cellSize * this.scale));

    if (cellX >= 0 && cellX < this.gridData.width && cellY >= 0 && cellY < this.gridData.height) {
      this.onCellClick(cellX, cellY);
    }
  }

  setGridData(gridData: GridData): void {
    this.gridData = gridData;
    this.startPoint = null;
    this.endPoint = null;
    this.pathPoints = [];
    this.pathAnimRunning = false;
    this.centerMap();
  }

  setStartPoint(p: Point): void {
    this.startPoint = p;
    if (this.gridData) {
      this.gridData.grid[p.y][p.x] = CellType.START;
    }
  }

  setEndPoint(p: Point): void {
    this.endPoint = p;
    if (this.gridData) {
      this.gridData.grid[p.y][p.x] = CellType.END;
    }
  }

  setPath(path: Point[]): void {
    this.pathPoints = path;
    this.pathAnimProgress = 0;
    this.pathAnimRunning = true;
    this.lastFrameTime = performance.now();
  }

  clearPath(): void {
    if (this.gridData && this.startPoint) {
      this.gridData.grid[this.startPoint.y][this.startPoint.x] = CellType.FLOOR;
    }
    if (this.gridData && this.endPoint) {
      this.gridData.grid[this.endPoint.y][this.endPoint.x] = CellType.FLOOR;
    }
    this.startPoint = null;
    this.endPoint = null;
    this.pathPoints = [];
    this.pathAnimProgress = 0;
    this.pathAnimRunning = false;
  }

  private centerMap(): void {
    if (!this.gridData) return;
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const mw = this.gridData.width * this.cellSize;
    const mh = this.gridData.height * this.cellSize;

    this.scale = Math.min(cw / (mw + 40), ch / (mh + 40), 2);
    this.offsetX = (cw - mw * this.scale) / 2;
    this.offsetY = (ch - mh * this.scale) / 2;
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    if (this.gridData) this.centerMap();
  }

  private startRenderLoop(): void {
    const loop = (time: number) => {
      this.render(time);
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  private render(time: number): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, w, h);

    if (!this.gridData) return;

    this.blinkPhase = (Math.sin(time * 0.005) + 1) / 2;

    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);

    this.drawGrid();
    this.drawCells();
    this.drawPathAnimation(time);
    this.drawStartEnd();

    ctx.restore();
  }

  private drawGrid(): void {
    if (!this.gridData) return;
    const ctx = this.ctx;
    const cs = this.cellSize;
    const gw = this.gridData.width;
    const gh = this.gridData.height;

    ctx.strokeStyle = COLORS.gridLine;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 0.5;

    ctx.beginPath();
    for (let x = 0; x <= gw; x++) {
      ctx.moveTo(x * cs, 0);
      ctx.lineTo(x * cs, gh * cs);
    }
    for (let y = 0; y <= gh; y++) {
      ctx.moveTo(0, y * cs);
      ctx.lineTo(gw * cs, y * cs);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  private drawCells(): void {
    if (!this.gridData) return;
    const ctx = this.ctx;
    const cs = this.cellSize;
    const grid = this.gridData.grid;

    for (let y = 0; y < this.gridData.height; y++) {
      for (let x = 0; x < this.gridData.width; x++) {
        const cell = grid[y][x];
        const px = x * cs;
        const py = y * cs;

        switch (cell) {
          case CellType.WALL:
            ctx.fillStyle = COLORS.wall;
            ctx.fillRect(px, py, cs, cs);
            break;
          case CellType.FLOOR:
            ctx.fillStyle = COLORS.floor;
            ctx.fillRect(px, py, cs, cs);
            ctx.strokeStyle = COLORS.floorStroke;
            ctx.lineWidth = 1;
            ctx.strokeRect(px + 0.5, py + 0.5, cs - 1, cs - 1);
            break;
          case CellType.CORRIDOR:
            ctx.fillStyle = COLORS.corridor;
            ctx.fillRect(px, py, cs, cs);
            break;
          case CellType.PATH:
            ctx.fillStyle = COLORS.corridor;
            ctx.fillRect(px, py, cs, cs);
            break;
        }
      }
    }
  }

  private drawStartEnd(): void {
    if (!this.gridData) return;
    const ctx = this.ctx;
    const cs = this.cellSize;

    if (this.startPoint) {
      const px = this.startPoint.x * cs + cs / 2;
      const py = this.startPoint.y * cs + cs / 2;
      const r = cs * 0.4;

      ctx.fillStyle = COLORS.start;
      ctx.globalAlpha = 0.5 + this.blinkPhase * 0.5;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.2 + this.blinkPhase * 0.3;
      ctx.beginPath();
      ctx.arc(px, py, r * 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (this.endPoint) {
      const px = this.endPoint.x * cs + cs / 2;
      const py = this.endPoint.y * cs + cs / 2;
      const r = cs * 0.4;

      ctx.fillStyle = COLORS.end;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.2;
      ctx.beginPath();
      ctx.arc(px, py, r * 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  private drawPathAnimation(time: number): void {
    if (this.pathPoints.length < 2) return;

    const ctx = this.ctx;
    const cs = this.cellSize;

    if (this.pathAnimRunning) {
      const dt = time - this.lastFrameTime;
      this.lastFrameTime = time;
      const speed = (cs * 2) / 1000;
      this.pathAnimProgress += speed * dt;

      const totalLen = this.calculatePathLength();
      if (this.pathAnimProgress >= totalLen) {
        this.pathAnimProgress = totalLen;
        this.pathAnimRunning = false;
      }
    }

    const drawLen = this.pathAnimProgress;
    let accumulated = 0;

    ctx.strokeStyle = COLORS.path;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.85;

    ctx.beginPath();
    ctx.moveTo(
      this.pathPoints[0].x * cs + cs / 2,
      this.pathPoints[0].y * cs + cs / 2
    );

    for (let i = 1; i < this.pathPoints.length; i++) {
      const prev = this.pathPoints[i - 1];
      const curr = this.pathPoints[i];
      const segLen = Math.sqrt(
        (curr.x - prev.x) ** 2 + (curr.y - prev.y) ** 2
      ) * cs;

      if (accumulated + segLen <= drawLen) {
        ctx.lineTo(curr.x * cs + cs / 2, curr.y * cs + cs / 2);
        accumulated += segLen;
      } else {
        const remain = drawLen - accumulated;
        const t = remain / segLen;
        const ix = (prev.x + (curr.x - prev.x) * t) * cs + cs / 2;
        const iy = (prev.y + (curr.y - prev.y) * t) * cs + cs / 2;
        ctx.lineTo(ix, iy);
        break;
      }
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    for (let i = 0; i < this.pathPoints.length; i++) {
      const p = this.pathPoints[i];
      const px = p.x * cs + cs / 2;
      const py = p.y * cs + cs / 2;
      const distFromStart = this.pathDistToPoint(i);

      if (distFromStart <= drawLen) {
        ctx.fillStyle = COLORS.path;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  private pathDistToPoint(index: number): number {
    let dist = 0;
    const cs = this.cellSize;
    for (let i = 1; i <= index && i < this.pathPoints.length; i++) {
      const prev = this.pathPoints[i - 1];
      const curr = this.pathPoints[i];
      dist += Math.sqrt((curr.x - prev.x) ** 2 + (curr.y - prev.y) ** 2) * cs;
    }
    return dist;
  }

  private calculatePathLength(): number {
    let len = 0;
    const cs = this.cellSize;
    for (let i = 1; i < this.pathPoints.length; i++) {
      const prev = this.pathPoints[i - 1];
      const curr = this.pathPoints[i];
      len += Math.sqrt((curr.x - prev.x) ** 2 + (curr.y - prev.y) ** 2) * cs;
    }
    return len;
  }

  destroy(): void {
    cancelAnimationFrame(this.animFrameId);
  }
}
