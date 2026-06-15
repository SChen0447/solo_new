interface TrackSegment {
  y: number;
}

export class GameEngine {
  private width: number;
  private height: number;

  private trackWidth: number = 240;
  private segmentWidth: number = 60;
  private segmentHeight: number = 30;
  private segmentGap: number = 10;

  private baseSpeed: number = 5;
  private speed: number = 5;
  private score: number = 0;

  private segments: TrackSegment[] = [];
  private segmentSpacing: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.segmentSpacing = this.segmentHeight + this.segmentGap;
    this.initSegments();
  }

  private initSegments(): void {
    this.segments = [];
    const count: number = Math.ceil(this.height / this.segmentSpacing) + 4;
    for (let i = 0; i < count; i++) {
      this.segments.push({ y: -i * this.segmentSpacing });
    }
  }

  public getTrackLeft(): number {
    return (this.width - this.trackWidth) / 2;
  }

  public getTrackRight(): number {
    return (this.width + this.trackWidth) / 2;
  }

  public getSpeed(): number {
    return this.speed;
  }

  public getScore(): number {
    return this.score;
  }

  public addScore(value: number): void {
    this.score += value;
    const multiplier: number = Math.floor(this.score / 50);
    this.speed = this.baseSpeed * Math.pow(1.1, multiplier);
  }

  public reset(): void {
    this.score = 0;
    this.speed = this.baseSpeed;
    this.initSegments();
  }

  public checkAABBCollision(
    x1: number, y1: number, w1: number, h1: number,
    x2: number, y2: number, w2: number, h2: number
  ): boolean {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
  }

  public update(deltaTime: number): void {
    const moveAmount: number = this.speed * deltaTime;
    for (let i = 0; i < this.segments.length; i++) {
      this.segments[i].y += moveAmount;
    }
    while (this.segments.length > 0 && this.segments[this.segments.length - 1].y > this.height + this.segmentSpacing) {
      this.segments.pop();
    }
    while (this.segments.length === 0 || this.segments[0].y > -this.segmentSpacing) {
      const newY: number = (this.segments.length === 0 ? -this.segmentSpacing : this.segments[0].y) - this.segmentSpacing;
      this.segments.unshift({ y: newY });
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    const trackLeft: number = this.getTrackLeft();
    ctx.save();
    ctx.shadowColor = '#7c3aed';
    ctx.shadowBlur = 6;
    for (let i = 0; i < this.segments.length; i++) {
      const seg = this.segments[i];
      const xCount: number = Math.floor(this.trackWidth / this.segmentWidth);
      for (let j = 0; j < xCount; j++) {
        const x: number = trackLeft + j * this.segmentWidth;
        ctx.fillStyle = 'rgba(26, 10, 46, 0.85)';
        ctx.fillRect(x, seg.y, this.segmentWidth - 2, this.segmentHeight);
        ctx.strokeStyle = '#7c3aed';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, seg.y, this.segmentWidth - 2, this.segmentHeight);
      }
    }
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#7c3aed';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(trackLeft, 0);
    ctx.lineTo(trackLeft, this.height);
    ctx.moveTo(trackLeft + this.trackWidth, 0);
    ctx.lineTo(trackLeft + this.trackWidth, this.height);
    ctx.stroke();
    ctx.restore();
  }
}
