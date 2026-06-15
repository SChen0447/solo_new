import type { EditorModule, TrackData, Point } from './editorModule';
import type { PhysicsModule, CarState } from './physicsModule';

export class RenderModule {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private chartCanvas: HTMLCanvasElement;
  private chartCtx: CanvasRenderingContext2D;
  private editor: EditorModule;
  private physics: PhysicsModule;

  private readonly bgColor = '#1A1A2E';
  private readonly gridColor = '#2D2D44';
  private readonly trackFillColor = '#3A3A55';
  private readonly boundaryColor = 'rgba(0, 255, 136, 0.5)';
  private readonly carBodyColor1 = '#4A90D9';
  private readonly carBodyColor2 = '#357ABD';
  private readonly wheelColor = '#000000';
  private readonly speedColor = '#00FF88';
  private readonly gridSize = 40;

  private width = 0;
  private height = 0;

  constructor(editor: EditorModule, physics: PhysicsModule) {
    this.editor = editor;
    this.physics = physics;

    this.canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.chartCanvas = document.getElementById('chartCanvas') as HTMLCanvasElement;
    this.chartCtx = this.chartCanvas.getContext('2d')!;
  }

  resize(): void {
    const container = this.canvas.parentElement!;
    const dpr = window.devicePixelRatio || 1;
    this.width = container.clientWidth;
    this.height = container.clientHeight;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const chartContainer = this.chartCanvas.parentElement!;
    this.chartCanvas.width = chartContainer.clientWidth * dpr;
    this.chartCanvas.height = chartContainer.clientHeight * dpr;
    this.chartCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  render(mode: 'edit' | 'drive'): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    this.drawGrid(ctx);
    this.drawTrack(ctx);

    if (mode === 'edit') {
      this.drawControlPoints(ctx);
    }

    if (mode === 'drive' && this.editor.pathPoints.length >= 2) {
      this.drawCar(ctx, this.physics.car);
    }

    if (mode === 'drive') {
      this.drawDashboard(ctx, this.physics.car);
    }

    this.drawSpeedChart();
  }

  private drawGrid(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = this.gridColor;
    ctx.lineWidth = 0.5;

    for (let x = 0; x < this.width; x += this.gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }
    for (let y = 0; y < this.height; y += this.gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }
  }

  private drawTrack(ctx: CanvasRenderingContext2D): void {
    const track = this.editor.getTrackData();
    if (track.pathPoints.length < 2) return;

    ctx.beginPath();
    ctx.moveTo(track.leftBoundary[0].x, track.leftBoundary[0].y);
    for (let i = 1; i < track.leftBoundary.length; i++) {
      ctx.lineTo(track.leftBoundary[i].x, track.leftBoundary[i].y);
    }
    for (let i = track.rightBoundary.length - 1; i >= 0; i--) {
      ctx.lineTo(track.rightBoundary[i].x, track.rightBoundary[i].y);
    }
    ctx.closePath();
    ctx.fillStyle = this.trackFillColor;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(track.pathPoints[0].x, track.pathPoints[0].y);
    for (let i = 1; i < track.pathPoints.length; i++) {
      ctx.lineTo(track.pathPoints[i].x, track.pathPoints[i].y);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 8]);
    ctx.stroke();
    ctx.setLineDash([]);

    this.drawBoundaryLine(ctx, track.leftBoundary);
    this.drawBoundaryLine(ctx, track.rightBoundary);
  }

  private drawBoundaryLine(ctx: CanvasRenderingContext2D, points: Point[]): void {
    if (points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.strokeStyle = this.boundaryColor;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private drawControlPoints(ctx: CanvasRenderingContext2D): void {
    const points = this.editor.controlPoints;
    const dragInfo = this.editor.getDraggingInfo();

    for (let i = 0; i < points.length; i++) {
      ctx.beginPath();
      ctx.arc(points[i].x, points[i].y, 7, 0, Math.PI * 2);
      if (i === dragInfo.index && dragInfo.isDragging) {
        ctx.fillStyle = '#FF6644';
      } else {
        ctx.fillStyle = '#00FF88';
      }
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#aaa';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`P${i}`, points[i].x, points[i].y - 12);
    }

    if (dragInfo.isDragging && this.editor.dragTipText) {
      const p = points[dragInfo.index];
      ctx.fillStyle = '#FFD700';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(this.editor.dragTipText, p.x, p.y - 24);
    }
  }

  private drawCar(ctx: CanvasRenderingContext2D, car: CarState): void {
    if (car.isOffTrack) {
      ctx.save();
      ctx.fillStyle = 'rgba(255, 50, 50, 0.6)';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('偏离赛道!', car.x, car.y - 30);
      ctx.fillStyle = '#aaa';
      ctx.font = '12px sans-serif';
      const countdown = Math.ceil(car.respawnTimer);
      ctx.fillText(`${countdown}秒后回到起点`, car.x, car.y - 14);
      ctx.restore();
    }

    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);

    const bodyW = 36;
    const bodyH = 18;

    const grad = ctx.createLinearGradient(-bodyW / 2, 0, bodyW / 2, 0);
    grad.addColorStop(0, this.carBodyColor1);
    grad.addColorStop(1, this.carBodyColor2);
    ctx.fillStyle = grad;
    ctx.fillRect(-bodyW / 2, -bodyH / 2, bodyW, bodyH);

    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(-bodyW / 2, -bodyH / 2, bodyW, bodyH);

    ctx.fillStyle = '#AADDFF';
    ctx.fillRect(bodyW / 2 - 6, -bodyH / 2 + 2, 5, bodyH - 4);

    const wheelW = 8;
    const wheelH = 4;
    ctx.fillStyle = this.wheelColor;
    ctx.fillRect(-bodyW / 2 + 2, -bodyH / 2 - wheelH, wheelW, wheelH);
    ctx.fillRect(-bodyW / 2 + 2, bodyH / 2, wheelW, wheelH);
    ctx.fillRect(bodyW / 2 - wheelW - 2, -bodyH / 2 - wheelH, wheelW, wheelH);
    ctx.fillRect(bodyW / 2 - wheelW - 2, bodyH / 2, wheelW, wheelH);

    ctx.restore();
  }

  private drawDashboard(ctx: CanvasRenderingContext2D, car: CarState): void {
    const panelW = 180;
    const panelH = 140;
    const panelX = this.width - panelW - 12;
    const panelY = this.height - panelH - 12;
    const radius = 10;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(panelX + radius, panelY);
    ctx.lineTo(panelX + panelW - radius, panelY);
    ctx.quadraticCurveTo(panelX + panelW, panelY, panelX + panelW, panelY + radius);
    ctx.lineTo(panelX + panelW, panelY + panelH - radius);
    ctx.quadraticCurveTo(panelX + panelW, panelY + panelH, panelX + panelW - radius, panelY + panelH);
    ctx.lineTo(panelX + radius, panelY + panelH);
    ctx.quadraticCurveTo(panelX, panelY + panelH, panelX, panelY + panelH - radius);
    ctx.lineTo(panelX, panelY + radius);
    ctx.quadraticCurveTo(panelX, panelY, panelX + radius, panelY);
    ctx.closePath();
    ctx.fillStyle = 'rgba(26, 26, 46, 0.9)';
    ctx.fill();
    ctx.strokeStyle = '#3A3A55';
    ctx.lineWidth = 1;
    ctx.stroke();

    const speedKmh = this.physics.getSpeedKmh();
    ctx.fillStyle = this.speedColor;
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(speedKmh)}`, panelX + panelW / 2, panelY + 38);
    ctx.fillStyle = '#888';
    ctx.font = '11px sans-serif';
    ctx.fillText('km/h', panelX + panelW / 2, panelY + 54);

    ctx.fillStyle = '#aaa';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`档位: ${car.gear}`, panelX + 14, panelY + 76);

    const compassCx = panelX + panelW - 44;
    const compassCy = panelY + 90;
    const compassR = 28;

    ctx.beginPath();
    ctx.arc(compassCx, compassCy, compassR, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(50,50,80,0.6)';
    ctx.fill();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.stroke();

    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const inner = i % 3 === 0 ? compassR - 8 : compassR - 4;
      ctx.beginPath();
      ctx.moveTo(compassCx + Math.cos(a) * inner, compassCy + Math.sin(a) * inner);
      ctx.lineTo(compassCx + Math.cos(a) * (compassR - 2), compassCy + Math.sin(a) * (compassR - 2));
      ctx.strokeStyle = i % 3 === 0 ? '#aaa' : '#666';
      ctx.lineWidth = i % 3 === 0 ? 1.5 : 0.8;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.moveTo(compassCx, compassCy);
    const pointerLen = compassR - 6;
    ctx.lineTo(
      compassCx + Math.cos(car.angle) * pointerLen,
      compassCy + Math.sin(car.angle) * pointerLen,
    );
    ctx.strokeStyle = '#FF4444';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(compassCx, compassCy, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#FF4444';
    ctx.fill();

    const angleDeg = ((car.angle * 180 / Math.PI) % 360 + 360) % 360;
    ctx.fillStyle = '#888';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${Math.round(angleDeg)}°`, panelX + 14, panelY + 110);

    if (this.physics.isRecording) {
      ctx.fillStyle = '#FF4444';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      const blink = Math.floor(performance.now() / 500) % 2 === 0;
      if (blink) {
        ctx.beginPath();
        ctx.arc(panelX + panelW / 2 - 20, panelY + panelH - 16, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillText('REC', panelX + panelW / 2 + 4, panelY + panelH - 12);
      }
    }

    if (this.physics.isReplaying) {
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('▶ 回放中', panelX + panelW / 2, panelY + panelH - 12);
    }

    ctx.restore();
  }

  private drawSpeedChart(): void {
    const ctx = this.chartCtx;
    const container = this.chartCanvas.parentElement!;
    const w = container.clientWidth;
    const h = container.clientHeight;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(26, 26, 46, 0.01)';
    ctx.fillRect(0, 0, w, h);

    const data = this.physics.getSpeedHistoryWithTimestamps();
    if (data.values.length < 2) {
      ctx.fillStyle = '#666';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('速度曲线 (最近10秒)', w / 2, 16);
      return;
    }

    ctx.fillStyle = '#666';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('速度 (km/h)', 4, 14);

    const padL = 8;
    const padR = 8;
    const padT = 22;
    const padB = 18;
    const chartW = w - padL - padR;
    const chartH = h - padT - padB;

    const maxSpeed = 300 * 3.6;
    const now = performance.now();
    const timeWindow = 10000;

    ctx.beginPath();
    for (let i = 0; i < data.values.length; i++) {
      const age = (now - data.times[i]) / timeWindow;
      const x = padL + chartW - age * chartW;
      const y = padT + chartH - (data.values[i] * 3.6 / maxSpeed) * chartH;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.strokeStyle = this.speedColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = padT + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + chartW, y);
      ctx.stroke();
    }

    ctx.fillStyle = '#555';
    ctx.font = '9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('-10s', padL, padT + chartH + 12);
    ctx.textAlign = 'right';
    ctx.fillText('now', padL + chartW, padT + chartH + 12);
  }
}
