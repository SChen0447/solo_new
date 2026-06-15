export interface TrackPoint {
  x: number;
  y: number;
  angle: number;
  distance: number;
}

export interface GuardrailSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  normal: { x: number; y: number };
}

export interface CarCorners {
  getCorners(): { x: number; y: number }[];
  state: { x: number; y: number };
}

const CONFIG = {
  TRACK_WIDTH: 60,
  TRACK_LENGTH_TARGET: 1000,
  CURVE_RADIUS_MIN: 40,
  CURVE_RADIUS_MAX: 100,
  CURVE_ANGLE_MIN: Math.PI / 2,
  CURVE_ANGLE_MAX: Math.PI,
  STRAIGHT_LENGTH_MIN: 50,
  STRAIGHT_LENGTH_MAX: 120,
  GUARDRAIL_WIDTH: 2,
  KERB_LENGTH: 10,
  DASH_INTERVAL: 30,
  DASH_LENGTH: 8,
  DASH_WIDTH: 1,
} as const;

export class Track {
  points: TrackPoint[];
  innerGuardrail: GuardrailSegment[];
  outerGuardrail: GuardrailSegment[];
  trees: { x: number; y: number }[];
  width: number;
  length: number;
  startLine: { x1: number; y1: number; x2: number; y2: number };
  private cumulativeDistances: number[];

  constructor(seed?: number) {
    this.points = [];
    this.innerGuardrail = [];
    this.outerGuardrail = [];
    this.trees = [];
    this.width = CONFIG.TRACK_WIDTH;
    this.length = 0;
    this.startLine = { x1: 0, y1: 0, x2: 0, y2: 0 };
    this.cumulativeDistances = [];
    this.regenerate();
  }

  regenerate(): void {
    this.points = [];
    this.innerGuardrail = [];
    this.outerGuardrail = [];
    this.trees = [];
    this.length = 0;
    this.cumulativeDistances = [];

    this.generateTrackGeometry();
    this.generateGuardrails();
    this.generateTrees();
  }

  private generateTrackGeometry(): void {
    let x = 0;
    let y = 0;
    let angle = 0;
    let totalLength = 0;
    const segments: { type: 'curve' | 'straight'; length: number }[] = [];

    while (totalLength < CONFIG.TRACK_LENGTH_TARGET) {
      const isCurve = segments.length === 0 ? false : Math.random() > 0.5;
      
      if (isCurve) {
        const radius = CONFIG.CURVE_RADIUS_MIN + Math.random() * (CONFIG.CURVE_RADIUS_MAX - CONFIG.CURVE_RADIUS_MIN);
        const curveAngle = CONFIG.CURVE_ANGLE_MIN + Math.random() * (CONFIG.CURVE_ANGLE_MAX - CONFIG.CURVE_ANGLE_MIN);
        const direction = Math.random() > 0.5 ? 1 : -1;
        const arcLength = radius * curveAngle;
        
        segments.push({ type: 'curve', length: arcLength });
        
        const steps = Math.ceil(arcLength / 2);
        const angleStep = (curveAngle * direction) / steps;
        const centerX = x - Math.sin(angle) * radius * direction;
        const centerY = y + Math.cos(angle) * radius * direction;
        
        for (let i = 1; i <= steps; i++) {
          const currentAngle = angle + angleStep * i;
          const px = centerX + Math.sin(currentAngle) * radius * direction;
          const py = centerY - Math.cos(currentAngle) * radius * direction;
          this.points.push({ x: px, y: py, angle: currentAngle, distance: totalLength + (arcLength * i) / steps });
        }
        
        x = this.points[this.points.length - 1].x;
        y = this.points[this.points.length - 1].y;
        angle = angle + angleStep * steps;
        totalLength += arcLength;
      } else {
        const length = CONFIG.STRAIGHT_LENGTH_MIN + Math.random() * (CONFIG.STRAIGHT_LENGTH_MAX - CONFIG.STRAIGHT_LENGTH_MIN);
        segments.push({ type: 'straight', length });
        
        const steps = Math.ceil(length / 2);
        const stepLength = length / steps;
        
        for (let i = 1; i <= steps; i++) {
          const px = x + Math.cos(angle) * stepLength * i;
          const py = y + Math.sin(angle) * stepLength * i;
          this.points.push({ x: px, y: py, angle, distance: totalLength + stepLength * i });
        }
        
        x = this.points[this.points.length - 1].x;
        y = this.points[this.points.length - 1].y;
        totalLength += length;
      }
    }

    this.length = totalLength;
    
    const firstPoint = this.points[0];
    const lastPoint = this.points[this.points.length - 1];
    const dx = firstPoint.x - lastPoint.x;
    const dy = firstPoint.y - lastPoint.y;
    const closeDistance = Math.sqrt(dx * dx + dy * dy);
    
    const closeSteps = Math.ceil(closeDistance / 2);
    for (let i = 1; i <= closeSteps; i++) {
      const t = i / closeSteps;
      const px = lastPoint.x + dx * t;
      const py = lastPoint.y + dy * t;
      const targetAngle = Math.atan2(firstPoint.y - lastPoint.y, firstPoint.x - lastPoint.x);
      const interpolatedAngle = lastPoint.angle + (targetAngle - lastPoint.angle) * t;
      this.points.push({ x: px, y: py, angle: interpolatedAngle, distance: totalLength + (closeDistance * t) });
    }
    
    this.length += closeDistance;
    this.points.push({ ...firstPoint, distance: this.length });
    
    this.cumulativeDistances = this.points.map(p => p.distance);

    const startAngle = this.points[0].angle;
    const perpX = -Math.sin(startAngle);
    const perpY = Math.cos(startAngle);
    this.startLine = {
      x1: this.points[0].x + perpX * this.width / 2,
      y1: this.points[0].y + perpY * this.width / 2,
      x2: this.points[0].x - perpX * this.width / 2,
      y2: this.points[0].y - perpY * this.width / 2,
    };
  }

  private generateGuardrails(): void {
    const halfWidth = this.width / 2;
    
    for (let i = 0; i < this.points.length - 1; i++) {
      const p1 = this.points[i];
      const p2 = this.points[i + 1];
      
      const perpX = -Math.sin(p1.angle);
      const perpY = Math.cos(p1.angle);
      const perpX2 = -Math.sin(p2.angle);
      const perpY2 = Math.cos(p2.angle);
      
      this.outerGuardrail.push({
        x1: p1.x + perpX * halfWidth,
        y1: p1.y + perpY * halfWidth,
        x2: p2.x + perpX2 * halfWidth,
        y2: p2.y + perpY2 * halfWidth,
        normal: { x: perpX, y: perpY },
      });
      
      this.innerGuardrail.push({
        x1: p1.x - perpX * halfWidth,
        y1: p1.y - perpY * halfWidth,
        x2: p2.x - perpX2 * halfWidth,
        y2: p2.y - perpY2 * halfWidth,
        normal: { x: -perpX, y: -perpY },
      });
    }
  }

  private generateTrees(): void {
    let distAccumulator = 0;
    
    for (let i = 0; i < this.points.length - 1; i++) {
      const p = this.points[i];
      const nextP = this.points[i + 1];
      const segmentDist = nextP.distance - p.distance;
      
      distAccumulator += segmentDist;
      
      while (distAccumulator >= 30) {
        distAccumulator -= 30 + Math.random() * 20;
        
        const perpX = -Math.sin(p.angle);
        const perpY = Math.cos(p.angle);
        const side = Math.random() > 0.5 ? 1 : -1;
        const offset = this.width / 2 + 40 + Math.random() * 30;
        
        this.trees.push({
          x: p.x + perpX * offset * side,
          y: p.y + perpY * offset * side,
        });
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.drawTrackSurface(ctx);
    this.drawKerbs(ctx);
    this.drawCenterDashedLine(ctx);
    this.drawGuardrails(ctx);
    this.drawTrees(ctx);
    this.drawStartLine(ctx);
  }

  private drawTrackSurface(ctx: CanvasRenderingContext2D): void {
    if (this.points.length < 2) return;

    const halfWidth = this.width / 2;
    
    ctx.fillStyle = '#2d2d2d';
    ctx.beginPath();
    
    ctx.moveTo(
      this.points[0].x + -Math.sin(this.points[0].angle) * halfWidth,
      this.points[0].y + Math.cos(this.points[0].angle) * halfWidth
    );
    for (let i = 1; i < this.points.length; i++) {
      const p = this.points[i];
      const perpX = -Math.sin(p.angle);
      const perpY = Math.cos(p.angle);
      ctx.lineTo(p.x + perpX * halfWidth, p.y + perpY * halfWidth);
    }
    
    for (let i = this.points.length - 1; i >= 0; i--) {
      const p = this.points[i];
      const perpX = -Math.sin(p.angle);
      const perpY = Math.cos(p.angle);
      ctx.lineTo(p.x - perpX * halfWidth, p.y - perpY * halfWidth);
    }
    
    ctx.closePath();
    ctx.fill();
  }

  private drawKerbs(ctx: CanvasRenderingContext2D): void {
    const halfWidth = this.width / 2;
    const kerbWidth = 6;
    
    let distAlong = 0;
    for (let i = 0; i < this.points.length - 1; i++) {
      const p1 = this.points[i];
      const p2 = this.points[i + 1];
      const segmentDist = p2.distance - p1.distance;
      
      const perpX1 = -Math.sin(p1.angle);
      const perpY1 = Math.cos(p1.angle);
      const perpX2 = -Math.sin(p2.angle);
      const perpY2 = Math.cos(p2.angle);
      
      const segments = Math.ceil(segmentDist / CONFIG.KERB_LENGTH);
      for (let s = 0; s < segments; s++) {
        const t1 = s / segments;
        const t2 = (s + 1) / segments;
        const color = Math.floor(distAlong / CONFIG.KERB_LENGTH + s) % 2 === 0 ? '#d32f2f' : '#ffffff';
        
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(
          p1.x + (p2.x - p1.x) * t1 - perpX1 * halfWidth + perpX1 * kerbWidth,
          p1.y + (p2.y - p1.y) * t1 - perpY1 * halfWidth + perpY1 * kerbWidth
        );
        ctx.lineTo(
          p1.x + (p2.x - p1.x) * t2 - perpX2 * halfWidth + perpX2 * kerbWidth,
          p1.y + (p2.y - p1.y) * t2 - perpY2 * halfWidth + perpY2 * kerbWidth
        );
        ctx.lineTo(
          p1.x + (p2.x - p1.x) * t2 - perpX2 * halfWidth,
          p1.y + (p2.y - p1.y) * t2 - perpY2 * halfWidth
        );
        ctx.lineTo(
          p1.x + (p2.x - p1.x) * t1 - perpX1 * halfWidth,
          p1.y + (p2.y - p1.y) * t1 - perpY1 * halfWidth
        );
        ctx.closePath();
        ctx.fill();
      }
      
      distAlong += segmentDist;
    }
  }

  private drawCenterDashedLine(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = '#9e9e9e';
    ctx.lineWidth = CONFIG.DASH_WIDTH;
    
    let distAlong = 0;
    for (let i = 0; i < this.points.length - 1; i++) {
      const p1 = this.points[i];
      const p2 = this.points[i + 1];
      const segmentDist = p2.distance - p1.distance;
      
      let currentDist = distAlong;
      while (currentDist < distAlong + segmentDist) {
        const dashStart = Math.ceil(currentDist / CONFIG.DASH_INTERVAL) * CONFIG.DASH_INTERVAL;
        if (dashStart < distAlong + segmentDist) {
          const t1 = (dashStart - distAlong) / segmentDist;
          const t2 = Math.min(1, (dashStart + CONFIG.DASH_LENGTH - distAlong) / segmentDist);
          
          if (t1 >= 0 && t2 <= 1) {
            ctx.beginPath();
            ctx.moveTo(
              p1.x + (p2.x - p1.x) * t1,
              p1.y + (p2.y - p1.y) * t1
            );
            ctx.lineTo(
              p1.x + (p2.x - p1.x) * t2,
              p1.y + (p2.y - p1.y) * t2
            );
            ctx.stroke();
          }
        }
        currentDist += CONFIG.DASH_INTERVAL;
      }
      
      distAlong += segmentDist;
    }
  }

  private drawGuardrails(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = CONFIG.GUARDRAIL_WIDTH;
    
    ctx.beginPath();
    for (let i = 0; i < this.outerGuardrail.length; i++) {
      const g = this.outerGuardrail[i];
      if (i === 0) ctx.moveTo(g.x1, g.y1);
      ctx.lineTo(g.x2, g.y2);
    }
    ctx.stroke();
    
    ctx.beginPath();
    for (let i = 0; i < this.innerGuardrail.length; i++) {
      const g = this.innerGuardrail[i];
      if (i === 0) ctx.moveTo(g.x1, g.y1);
      ctx.lineTo(g.x2, g.y2);
    }
    ctx.stroke();
  }

  private drawTrees(ctx: CanvasRenderingContext2D): void {
    for (const tree of this.trees) {
      ctx.fillStyle = '#5d4037';
      ctx.fillRect(tree.x - 2, tree.y, 4, 8);
      
      ctx.fillStyle = '#2e7d32';
      ctx.beginPath();
      ctx.moveTo(tree.x, tree.y - 20);
      ctx.lineTo(tree.x - 6, tree.y);
      ctx.lineTo(tree.x + 6, tree.y);
      ctx.closePath();
      ctx.fill();
    }
  }

  private drawStartLine(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(this.startLine.x1, this.startLine.y1);
    ctx.lineTo(this.startLine.x2, this.startLine.y2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  checkCollision(car: CarCorners): { collided: boolean; normal: { x: number; y: number }; point: { x: number; y: number } } {
    const carCorners = car.getCorners();
    let minPenetration = Infinity;
    let collisionNormal = { x: 0, y: 0 };
    let collisionPoint = { x: 0, y: 0 };
    let collided = false;

    const allGuardrails = [...this.innerGuardrail, ...this.outerGuardrail];
    
    for (const rail of allGuardrails) {
      const dx = rail.x2 - rail.x1;
      const dy = rail.y2 - rail.y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len === 0) continue;

      const axes = [
        { x: -dy / len, y: dx / len },
        { x: dx / len, y: dy / len },
      ];

      for (const axis of axes) {
        let carMin = Infinity;
        let carMax = -Infinity;
        for (const corner of carCorners) {
          const proj = corner.x * axis.x + corner.y * axis.y;
          carMin = Math.min(carMin, proj);
          carMax = Math.max(carMax, proj);
        }

        const proj1 = rail.x1 * axis.x + rail.y1 * axis.y;
        const proj2 = rail.x2 * axis.x + rail.y2 * axis.y;
        const railMin = Math.min(proj1, proj2);
        const railMax = Math.max(proj1, proj2);

        if (carMax < railMin || carMin > railMax) {
          break;
        }

        const penetration = Math.min(carMax - railMin, railMax - carMin);
        if (penetration < minPenetration) {
          minPenetration = penetration;
          collisionNormal = { ...axis };
          const t = Math.max(0, Math.min(1, ((car.state.x - rail.x1) * dx + (car.state.y - rail.y1) * dy) / (len * len)));
          collisionPoint = {
            x: rail.x1 + t * dx,
            y: rail.y1 + t * dy,
          };
          collided = true;
        }
      }
    }

    if (collided) {
      const dot = car.state.x * collisionNormal.x + car.state.y * collisionNormal.y;
      const railCenterX = (this.innerGuardrail[0].x1 + this.outerGuardrail[0].x1) / 2;
      const railCenterY = (this.innerGuardrail[0].y1 + this.outerGuardrail[0].y1) / 2;
      const toCenterX = railCenterX - car.state.x;
      const toCenterY = railCenterY - car.state.y;
      if (collisionNormal.x * toCenterX + collisionNormal.y * toCenterY < 0) {
        collisionNormal.x = -collisionNormal.x;
        collisionNormal.y = -collisionNormal.y;
      }
    }

    return { collided, normal: collisionNormal, point: collisionPoint };
  }

  isPointOnTrack(x: number, y: number): boolean {
    const nearest = this.getNearestPoint(x, y);
    const dx = x - nearest.x;
    const dy = y - nearest.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance <= this.width / 2;
  }

  getNearestPoint(x: number, y: number): TrackPoint {
    let minDist = Infinity;
    let nearest = this.points[0];
    let nearestIndex = 0;

    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i];
      const dx = x - p.x;
      const dy = y - p.y;
      const dist = dx * dx + dy * dy;
      if (dist < minDist) {
        minDist = dist;
        nearest = p;
        nearestIndex = i;
      }
    }

    if (nearestIndex > 0 && nearestIndex < this.points.length - 1) {
      const prev = this.points[nearestIndex - 1];
      const next = this.points[nearestIndex + 1];
      
      const segDx = next.x - prev.x;
      const segDy = next.y - prev.y;
      const segLen = Math.sqrt(segDx * segDx + segDy * segDy);
      
      if (segLen > 0) {
        const t = Math.max(0, Math.min(1, ((x - prev.x) * segDx + (y - prev.y) * segDy) / (segLen * segLen)));
        return {
          x: prev.x + segDx * t,
          y: prev.y + segDy * t,
          angle: prev.angle + (next.angle - prev.angle) * t,
          distance: prev.distance + (next.distance - prev.distance) * t,
        };
      }
    }

    return nearest;
  }

  getProgress(x: number, y: number): number {
    const nearest = this.getNearestPoint(x, y);
    return nearest.distance / this.length;
  }

  checkLapCompletion(carX: number, carY: number, prevProgress: number): boolean {
    const currentProgress = this.getProgress(carX, carY);
    return currentProgress < 0.05 && prevProgress > 0.95;
  }
}
