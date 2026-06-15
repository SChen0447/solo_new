export interface Vec2 {
  x: number;
  y: number;
}

export interface Circle {
  x: number;
  y: number;
  radius: number;
}

export const vec2 = (x: number = 0, y: number = 0): Vec2 => ({ x, y });

export const vec2Add = (a: Vec2, b: Vec2): Vec2 => ({
  x: a.x + b.x,
  y: a.y + b.y,
});

export const vec2Sub = (a: Vec2, b: Vec2): Vec2 => ({
  x: a.x - b.x,
  y: a.y - b.y,
});

export const vec2Mul = (v: Vec2, scalar: number): Vec2 => ({
  x: v.x * scalar,
  y: v.y * scalar,
});

export const vec2Length = (v: Vec2): number =>
  Math.sqrt(v.x * v.x + v.y * v.y);

export const vec2Normalize = (v: Vec2): Vec2 => {
  const len = vec2Length(v);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
};

export const vec2Distance = (a: Vec2, b: Vec2): number =>
  vec2Length(vec2Sub(a, b));

export const vec2Dot = (a: Vec2, b: Vec2): number =>
  a.x * b.x + a.y * b.y;

export const vec2Angle = (v: Vec2): number =>
  Math.atan2(v.y, v.x);

export const vec2FromAngle = (angle: number, length: number = 1): Vec2 => ({
  x: Math.cos(angle) * length,
  y: Math.sin(angle) * length,
});

export const vec2Lerp = (a: Vec2, b: Vec2, t: number): Vec2 => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});

export const vec2Clamp = (v: Vec2, min: Vec2, max: Vec2): Vec2 => ({
  x: Math.max(min.x, Math.min(max.x, v.x)),
  y: Math.max(min.y, Math.min(max.y, v.y)),
});

export const circleCollision = (a: Circle, b: Circle): boolean => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const r = a.radius + b.radius;
  return dx * dx + dy * dy < r * r;
};

export const circleCollisionDistance = (a: Circle, b: Circle): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const r = a.radius + b.radius;
  return r - Math.sqrt(dx * dx + dy * dy);
};

export const randomRange = (min: number, max: number): number =>
  Math.random() * (max - min) + min;

export const randomInt = (min: number, max: number): number =>
  Math.floor(randomRange(min, max + 1));

export const randomChoice = <T>(arr: T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];

export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const lerp = (a: number, b: number, t: number): number =>
  a + (b - a) * t;

export const easeOut = (t: number): number =>
  1 - Math.pow(1 - t, 3);

export const easeIn = (t: number): number =>
  t * t * t;

export const easeInOut = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export const degToRad = (deg: number): number =>
  deg * (Math.PI / 180);

export const radToDeg = (rad: number): number =>
  rad * (180 / Math.PI);

export class AnimationTimer {
  private elapsed: number = 0;
  private duration: number;
  private running: boolean = false;

  constructor(duration: number, autoStart: boolean = false) {
    this.duration = duration;
    if (autoStart) this.start();
  }

  start(): void {
    this.elapsed = 0;
    this.running = true;
  }

  stop(): void {
    this.running = false;
  }

  reset(): void {
    this.elapsed = 0;
    this.running = false;
  }

  update(dt: number): number {
    if (!this.running) return this.progress();
    this.elapsed = Math.min(this.elapsed + dt, this.duration);
    if (this.elapsed >= this.duration) {
      this.running = false;
    }
    return this.progress();
  }

  progress(): number {
    return this.duration > 0 ? this.elapsed / this.duration : 1;
  }

  isComplete(): boolean {
    return this.elapsed >= this.duration;
  }

  isRunning(): boolean {
    return this.running;
  }

  getElapsed(): number {
    return this.elapsed;
  }

  getDuration(): number {
    return this.duration;
  }
}

export class Particle {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public radius: number;
  public color: string;
  public life: number;
  public maxLife: number;
  public alive: boolean = true;

  constructor(
    x: number,
    y: number,
    vx: number,
    vy: number,
    radius: number,
    color: string,
    life: number
  ) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = radius;
    this.color = color;
    this.life = life;
    this.maxLife = life;
  }

  update(dt: number): void {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    if (this.life <= 0) {
      this.alive = false;
    }
  }

  getAlpha(): number {
    return clamp(this.life / this.maxLife, 0, 1);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const alpha = this.getAlpha();
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
