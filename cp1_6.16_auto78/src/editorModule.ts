export interface Point {
  x: number;
  y: number;
}

export interface TrackData {
  controlPoints: Point[];
  pathPoints: Point[];
  leftBoundary: Point[];
  rightBoundary: Point[];
  trackWidth: number;
  totalLength: number;
  curveCount: number;
}

export class EditorModule {
  controlPoints: Point[] = [];
  trackWidth = 60;
  pathPoints: Point[] = [];
  leftBoundary: Point[] = [];
  rightBoundary: Point[] = [];
  totalLength = 0;
  curveCount = 0;

  private draggingIndex = -1;
  private isDragging = false;
  private canvas: HTMLCanvasElement | null = null;
  private gridSnap = true;
  private gridSize = 40;

  dragTipText = '';

  private wasJustDragging = false;

  bindCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
  }

  addControlPoint(p: Point): void {
    const snapped = this.snap(p);
    this.controlPoints.push(snapped);
    this.recalculate();
  }

  removeLastControlPoint(): void {
    this.controlPoints.pop();
    this.recalculate();
  }

  clearTrack(): void {
    this.controlPoints = [];
    this.recalculate();
  }

  getTrackData(): TrackData {
    return {
      controlPoints: [...this.controlPoints],
      pathPoints: [...this.pathPoints],
      leftBoundary: [...this.leftBoundary],
      rightBoundary: [...this.rightBoundary],
      trackWidth: this.trackWidth,
      totalLength: this.totalLength,
      curveCount: this.curveCount,
    };
  }

  recalculate(): void {
    if (this.controlPoints.length < 2) {
      this.pathPoints = [];
      this.leftBoundary = [];
      this.rightBoundary = [];
      this.totalLength = 0;
      this.curveCount = 0;
      this.updateUI();
      return;
    }

    this.pathPoints = this.generateBezierPath(this.controlPoints, 20);
    this.computeBoundaries();
    this.computeStats();
    this.updateUI();
  }

  private generateBezierPath(points: Point[], segmentsPerSpan: number): Point[] {
    const result: Point[] = [];

    if (points.length === 2) {
      const dist = this.dist(points[0], points[1]);
      const segs = Math.max(2, Math.floor(dist / 5));
      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        result.push({
          x: points[0].x + (points[1].x - points[0].x) * t,
          y: points[0].y + (points[1].y - points[0].y) * t,
        });
      }
      return result;
    }

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[Math.min(points.length - 1, i + 1)];
      const p3 = points[Math.min(points.length - 1, i + 2)];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      for (let j = 0; j < segmentsPerSpan; j++) {
        const t = j / segmentsPerSpan;
        result.push(this.cubicBezier(p1, { x: cp1x, y: cp1y }, { x: cp2x, y: cp2y }, p2, t));
      }
    }
    result.push(points[points.length - 1]);
    return result;
  }

  private cubicBezier(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const t2 = t * t;
    const t3 = t2 * t;
    return {
      x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
      y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y,
    };
  }

  private computeBoundaries(): void {
    this.leftBoundary = [];
    this.rightBoundary = [];
    const hw = this.trackWidth / 2;

    for (let i = 0; i < this.pathPoints.length; i++) {
      let nx = 0;
      let ny = 0;
      if (i === 0) {
        const dx = this.pathPoints[1].x - this.pathPoints[0].x;
        const dy = this.pathPoints[1].y - this.pathPoints[0].y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        nx = -dy / len;
        ny = dx / len;
      } else if (i === this.pathPoints.length - 1) {
        const dx = this.pathPoints[i].x - this.pathPoints[i - 1].x;
        const dy = this.pathPoints[i].y - this.pathPoints[i - 1].y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        nx = -dy / len;
        ny = dx / len;
      } else {
        const dx = this.pathPoints[i + 1].x - this.pathPoints[i - 1].x;
        const dy = this.pathPoints[i + 1].y - this.pathPoints[i - 1].y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        nx = -dy / len;
        ny = dx / len;
      }
      this.leftBoundary.push({ x: this.pathPoints[i].x + nx * hw, y: this.pathPoints[i].y + ny * hw });
      this.rightBoundary.push({ x: this.pathPoints[i].x - nx * hw, y: this.pathPoints[i].y - ny * hw });
    }
  }

  private computeStats(): void {
    this.totalLength = 0;
    for (let i = 1; i < this.pathPoints.length; i++) {
      this.totalLength += this.dist(this.pathPoints[i - 1], this.pathPoints[i]);
    }

    this.curveCount = 0;
    if (this.controlPoints.length >= 3) {
      for (let i = 1; i < this.controlPoints.length - 1; i++) {
        const prev = this.controlPoints[i - 1];
        const curr = this.controlPoints[i];
        const next = this.controlPoints[i + 1];
        const v1x = curr.x - prev.x;
        const v1y = curr.y - prev.y;
        const v2x = next.x - curr.x;
        const v2y = next.y - curr.y;
        const cross = v1x * v2y - v1y * v2x;
        if (Math.abs(cross) > 1) {
          this.curveCount++;
        }
      }
    }
  }

  private updateUI(): void {
    const lenEl = document.getElementById('track-length');
    const crvEl = document.getElementById('track-curves');
    if (lenEl) lenEl.textContent = Math.round(this.totalLength).toString();
    if (crvEl) crvEl.textContent = this.curveCount.toString();
  }

  isPointOnTrack(p: Point): boolean {
    if (this.pathPoints.length < 2) return false;
    const hw = this.trackWidth / 2;
    let minDist = Infinity;
    for (let i = 0; i < this.pathPoints.length; i++) {
      const d = this.dist(p, this.pathPoints[i]);
      if (d < minDist) minDist = d;
    }
    return minDist <= hw + 5;
  }

  getClosestPathPointIndex(p: Point): number {
    let minDist = Infinity;
    let minIdx = 0;
    for (let i = 0; i < this.pathPoints.length; i++) {
      const d = this.dist(p, this.pathPoints[i]);
      if (d < minDist) {
        minDist = d;
        minIdx = i;
      }
    }
    return minIdx;
  }

  getStartPoint(): Point {
    if (this.pathPoints.length > 0) return { ...this.pathPoints[0] };
    return { x: 200, y: 300 };
  }

  getStartAngle(): number {
    if (this.pathPoints.length >= 2) {
      const dx = this.pathPoints[1].x - this.pathPoints[0].x;
      const dy = this.pathPoints[1].y - this.pathPoints[0].y;
      return Math.atan2(dy, dx);
    }
    return 0;
  }

  private snap(p: Point): Point {
    if (!this.gridSnap) return { ...p };
    return {
      x: Math.round(p.x / this.gridSize) * this.gridSize,
      y: Math.round(p.y / this.gridSize) * this.gridSize,
    };
  }

  private dist(a: Point, b: Point): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private findControlPoint(mx: number, my: number): number {
    for (let i = 0; i < this.controlPoints.length; i++) {
      if (this.dist({ x: mx, y: my }, this.controlPoints[i]) < 12) return i;
    }
    return -1;
  }

  private getCanvasPos(e: MouseEvent): Point {
    if (!this.canvas) return { x: 0, y: 0 };
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  private onMouseDown(e: MouseEvent): void {
    this.wasJustDragging = false;
    const pos = this.getCanvasPos(e);
    const idx = this.findControlPoint(pos.x, pos.y);
    if (idx >= 0) {
      this.draggingIndex = idx;
      this.isDragging = true;
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging || this.draggingIndex < 0) return;
    this.wasJustDragging = true;
    const pos = this.getCanvasPos(e);
    this.controlPoints[this.draggingIndex] = this.snap(pos);

    if (this.draggingIndex > 0) {
      const prev = this.controlPoints[this.draggingIndex - 1];
      const curr = this.controlPoints[this.draggingIndex];
      const d = this.dist(prev, curr);
      const angle = Math.atan2(curr.y - prev.y, curr.x - prev.x) * 180 / Math.PI;
      this.dragTipText = `距离: ${Math.round(d)}px  角度: ${Math.round(angle)}°`;
    } else if (this.controlPoints.length > 1) {
      const next = this.controlPoints[this.draggingIndex + 1];
      const curr = this.controlPoints[this.draggingIndex];
      const d = this.dist(curr, next);
      const angle = Math.atan2(next.y - curr.y, next.x - curr.x) * 180 / Math.PI;
      this.dragTipText = `距离: ${Math.round(d)}px  角度: ${Math.round(angle)}°`;
    }

    this.recalculate();
  }

  private onMouseUp(): void {
    this.isDragging = false;
    this.draggingIndex = -1;
    this.dragTipText = '';
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const mx = touch.clientX - rect.left;
    const my = touch.clientY - rect.top;
    const idx = this.findControlPoint(mx, my);
    if (idx >= 0) {
      this.draggingIndex = idx;
      this.isDragging = true;
    }
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (!this.isDragging || this.draggingIndex < 0 || e.touches.length === 0) return;
    const touch = e.touches[0];
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const pos = {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
    this.controlPoints[this.draggingIndex] = this.snap(pos);
    this.recalculate();
  }

  private onTouchEnd(): void {
    this.isDragging = false;
    this.draggingIndex = -1;
    this.dragTipText = '';
  }

  handleCanvasClick(mx: number, my: number): void {
    if (this.wasJustDragging) {
      this.wasJustDragging = false;
      return;
    }
    const idx = this.findControlPoint(mx, my);
    if (idx < 0) {
      this.addControlPoint({ x: mx, y: my });
    }
  }

  getDraggingInfo(): { index: number; isDragging: boolean } {
    return { index: this.draggingIndex, isDragging: this.isDragging };
  }
}
