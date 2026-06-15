export interface Obstacle {
  x: number;
  y: number;
  size: number;
  pulsePhase: number;
}

export interface Point {
  x: number;
  y: number;
  radius: number;
  rotation: number;
}

export class Obstacles {
  private width: number;
  private height: number;

  private trackWidth: number = 240;
  private laneGap: number = 60;

  private obstacleSize: number = 25;
  private obstacleColor: string = '#d94a4a';
  private pulseDuration: number = 0.8;

  private pointRadius: number = 6;
  private pointColor: string = '#ffdd57';
  private rotationSpeed: number = (Math.PI * 2) / 0.5;

  private obstacles: Obstacle[] = [];
  private points: Point[] = [];

  private obstacleSpawnTimer: number = 0;
  private obstacleMinInterval: number = 30;
  private obstacleMaxInterval: number = 60;
  private nextObstacleInterval: number;

  private pointSpawnTimer: number = 0;
  private pointMinInterval: number = 15;
  private pointMaxInterval: number = 30;
  private nextPointInterval: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.nextObstacleInterval = this.randomRange(this.obstacleMinInterval, this.obstacleMaxInterval);
    this.nextPointInterval = this.randomRange(this.pointMinInterval, this.pointMaxInterval);
  }

  private randomRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  private getTrackLeft(): number {
    return (this.width - this.trackWidth) / 2;
  }

  private getLaneX(lane: number): number {
    const trackLeft: number = this.getTrackLeft();
    return trackLeft + this.laneGap / 2 + lane * this.laneGap;
  }

  public getObstacles(): Obstacle[] {
    return this.obstacles;
  }

  public getPoints(): Point[] {
    return this.points;
  }

  public reset(): void {
    this.obstacles = [];
    this.points = [];
    this.obstacleSpawnTimer = 0;
    this.pointSpawnTimer = 0;
    this.nextObstacleInterval = this.randomRange(this.obstacleMinInterval, this.obstacleMaxInterval);
    this.nextPointInterval = this.randomRange(this.pointMinInterval, this.pointMaxInterval);
  }

  public update(deltaTime: number, speed: number): void {
    const dt: number = deltaTime * (1 / 60);
    const moveAmount: number = speed * deltaTime;

    this.obstacleSpawnTimer += deltaTime;
    if (this.obstacleSpawnTimer >= this.nextObstacleInterval) {
      this.obstacleSpawnTimer = 0;
      this.nextObstacleInterval = this.randomRange(this.obstacleMinInterval, this.obstacleMaxInterval);
      const lane: number = Math.floor(Math.random() * 3);
      this.obstacles.push({
        x: this.getLaneX(lane),
        y: -this.obstacleSize,
        size: this.obstacleSize,
        pulsePhase: Math.random() * Math.PI * 2
      });
    }

    this.pointSpawnTimer += deltaTime;
    if (this.pointSpawnTimer >= this.nextPointInterval) {
      this.pointSpawnTimer = 0;
      this.nextPointInterval = this.randomRange(this.pointMinInterval, this.pointMaxInterval);
      const lane: number = Math.floor(Math.random() * 3);
      this.points.push({
        x: this.getLaneX(lane),
        y: -this.pointRadius,
        radius: this.pointRadius,
        rotation: 0
      });
    }

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      this.obstacles[i].y += moveAmount;
      this.obstacles[i].pulsePhase += (Math.PI * 2 / this.pulseDuration) * dt;
      if (this.obstacles[i].y - this.obstacleSize > this.height) {
        this.obstacles.splice(i, 1);
      }
    }

    for (let i = this.points.length - 1; i >= 0; i--) {
      this.points[i].y += moveAmount;
      this.points[i].rotation += this.rotationSpeed * dt;
      if (this.points[i].y - this.pointRadius > this.height) {
        this.points.splice(i, 1);
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.obstacles.length; i++) {
      const obs = this.obstacles[i];
      const pulse: number = 0.5 + 0.5 * Math.sin(obs.pulsePhase);
      const glowSize: number = 8 + pulse * 8;
      ctx.save();
      ctx.shadowColor = this.obstacleColor;
      ctx.shadowBlur = glowSize;
      ctx.fillStyle = this.obstacleColor;
      const half: number = obs.size / 2;
      ctx.fillRect(obs.x - half, obs.y - half, obs.size, obs.size);
      ctx.strokeStyle = '#ff7a7a';
      ctx.lineWidth = 1 + pulse;
      ctx.strokeRect(obs.x - half, obs.y - half, obs.size, obs.size);
      ctx.restore();
    }

    for (let i = 0; i < this.points.length; i++) {
      const pt = this.points[i];
      ctx.save();
      ctx.translate(pt.x, pt.y);
      ctx.rotate(pt.rotation);
      ctx.shadowColor = this.pointColor;
      ctx.shadowBlur = 12;
      ctx.fillStyle = this.pointColor;
      ctx.beginPath();
      ctx.arc(0, 0, pt.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-pt.radius * 0.8, 0);
      ctx.lineTo(pt.radius * 0.8, 0);
      ctx.moveTo(0, -pt.radius * 0.8);
      ctx.lineTo(0, pt.radius * 0.8);
      ctx.stroke();
      ctx.restore();
    }
  }
}
