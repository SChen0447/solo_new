import { PhysicsState } from './PhysicsEngine';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface RendererState {
  collectedKeys: number;
  totalKeys: number;
  timeRemaining: number;
  isPaused: boolean;
  isGameOver: boolean;
  isWin: boolean;
  isHurt: boolean;
}

export class GameRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private particles: Particle[] = [];
  private animationTime = 0;
  private lastFrameTime = 0;
  private targetFPS = 60;
  private frameInterval = 1000 / this.targetFPS;

  constructor(canvas: HTMLCanvasElement, width = 960, height = 540) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
  }

  public addKeyParticles(x: number, y: number): void {
    const colors = ['#f39c12', '#f1c40f', '#e67e22'];
    const directions = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
      { x: 0.707, y: 0.707 },
      { x: -0.707, y: -0.707 }
    ];

    for (let i = 0; i < 6; i++) {
      const dir = directions[i];
      this.particles.push({
        x: x + 12,
        y: y + 12,
        vx: dir.x * 150,
        vy: dir.y * 150,
        life: 0.3,
        maxLife: 0.3,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 4
      });
    }
  }

  public addCelebrationParticles(): void {
    const colors = ['#e74c3c', '#f39c12', '#2ecc71', '#3498db'];
    for (let i = 0; i < 100; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 200;
      this.particles.push({
        x: this.width / 2,
        y: this.height / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 100,
        life: 2,
        maxLife: 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 4 + Math.random() * 6
      });
    }
  }

  public update(dt: number): void {
    this.animationTime += dt;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 500 * dt;
      p.life -= dt;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  public render(
    timestamp: number,
    physicsState: PhysicsState,
    rendererState: RendererState
  ): boolean {
    if (timestamp - this.lastFrameTime < this.frameInterval) {
      return false;
    }
    this.lastFrameTime = timestamp;

    const dt = Math.min((timestamp - this.lastFrameTime) / 1000, 1 / 30);
    this.update(dt);

    this.ctx.clearRect(0, 0, this.width, this.height);

    this.drawBackground();
    this.drawPlatforms(physicsState);
    this.drawMovingPlatforms(physicsState);
    this.drawGears(physicsState);
    this.drawSprings(physicsState);
    this.drawLasers(physicsState);
    this.drawKeys(physicsState);
    this.drawDoors(physicsState);
    this.drawPlayer(physicsState, rendererState.isHurt);
    this.drawParticles();

    return true;
  }

  private drawBackground(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(0.5, '#16213e');
    gradient.addColorStop(1, '#0f3460');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    this.ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < this.width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.height);
      this.ctx.stroke();
    }
    for (let y = 0; y < this.height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
      this.ctx.stroke();
    }
  }

  private drawPlatforms(physicsState: PhysicsState): void {
    for (const platform of physicsState.platforms) {
      const gradient = this.ctx.createLinearGradient(
        platform.x,
        platform.y,
        platform.x,
        platform.y + platform.height
      );
      gradient.addColorStop(0, '#16213e');
      gradient.addColorStop(1, '#0f3460');
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(platform.x, platform.y, platform.width, platform.height);

      this.ctx.strokeStyle = '#3498db';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);

      this.ctx.fillStyle = '#3498db';
      this.ctx.globalAlpha = 0.3;
      this.ctx.fillRect(platform.x, platform.y, platform.width, 2);
      this.ctx.globalAlpha = 1;
    }
  }

  private drawMovingPlatforms(physicsState: PhysicsState): void {
    for (const platform of physicsState.movingPlatforms) {
      const gradient = this.ctx.createLinearGradient(
        platform.x,
        platform.y,
        platform.x,
        platform.y + platform.height
      );
      gradient.addColorStop(0, '#0f3460');
      gradient.addColorStop(1, '#1a1a2e');
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(platform.x, platform.y, platform.width, platform.height);

      this.ctx.strokeStyle = '#9b59b6';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);

      this.ctx.fillStyle = '#9b59b6';
      this.ctx.globalAlpha = 0.5;
      this.ctx.fillRect(platform.x, platform.y, platform.width, 2);
      this.ctx.globalAlpha = 1;

      this.ctx.fillStyle = '#9b59b6';
      this.ctx.globalAlpha = 0.3;
      const centerX = platform.x + platform.width / 2;
      const centerY = platform.y + platform.height / 2;
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.globalAlpha = 1;
    }
  }

  private drawGears(physicsState: PhysicsState): void {
    for (const gear of physicsState.gears) {
      this.ctx.save();
      this.ctx.translate(gear.x, gear.y);
      this.ctx.rotate(gear.rotation);

      this.ctx.fillStyle = gear.color;
      const teeth = 8;
      const innerRadius = gear.radius * 0.7;
      const outerRadius = gear.radius;

      this.ctx.beginPath();
      for (let i = 0; i < teeth * 2; i++) {
        const angle = (i * Math.PI) / teeth;
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (i === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      }
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.fillStyle = '#1a1a2e';
      this.ctx.beginPath();
      this.ctx.arc(0, 0, gear.radius * 0.4, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = gear.color;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, gear.radius * 0.2, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.strokeStyle = '#1a1a2e';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.lineTo(gear.radius * 0.35, 0);
      this.ctx.stroke();
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.lineTo(-gear.radius * 0.35, 0);
      this.ctx.stroke();

      this.ctx.restore();
    }
  }

  private drawSprings(physicsState: PhysicsState): void {
    for (const spring of physicsState.springs) {
      const springY = spring.y + (spring.originalHeight - spring.height);

      this.ctx.fillStyle = '#7f8c8d';
      this.ctx.fillRect(spring.x, spring.y + spring.originalHeight - 4, spring.width, 4);

      this.ctx.strokeStyle = spring.color;
      this.ctx.lineWidth = 3;
      const coils = 4;
      const coilHeight = spring.height / coils;

      this.ctx.beginPath();
      for (let i = 0; i <= coils; i++) {
        const y = springY + i * coilHeight;
        const x = i % 2 === 0 ? spring.x + 5 : spring.x + spring.width - 5;
        if (i === 0) {
          this.ctx.moveTo(spring.x + spring.width / 2, springY);
        }
        this.ctx.lineTo(x, y + coilHeight / 2);
      }
      this.ctx.lineTo(spring.x + spring.width / 2, springY + spring.height);
      this.ctx.stroke();

      this.ctx.fillStyle = spring.color;
      this.ctx.fillRect(spring.x - 2, springY, spring.width + 4, 4);
    }
  }

  private drawLasers(physicsState: PhysicsState): void {
    for (const laser of physicsState.lasers) {
      const glowIntensity = 0.5 + 0.5 * Math.sin(this.animationTime * 10);

      this.ctx.shadowColor = laser.color;
      this.ctx.shadowBlur = 20 * glowIntensity;

      this.ctx.fillStyle = `rgba(231, 76, 60, ${0.3 + glowIntensity * 0.3})`;
      this.ctx.fillRect(laser.x - 5, laser.y, laser.width + 10, laser.height);

      this.ctx.fillStyle = laser.color;
      this.ctx.fillRect(laser.x, laser.y, laser.width, laser.height);

      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillRect(laser.x + 3, laser.y, laser.width - 6, laser.height);

      this.ctx.shadowBlur = 0;
    }
  }

  private drawKeys(physicsState: PhysicsState): void {
    const breathePhase = (Math.sin(this.animationTime * Math.PI) + 1) / 2;
    const alpha = 0.5 + breathePhase * 0.5;
    const scale = 1 + breathePhase * 0.2;

    for (const key of physicsState.keys) {
      if (key.collected) continue;

      const centerX = key.x + key.width / 2;
      const centerY = key.y + key.height / 2;

      this.ctx.save();
      this.ctx.translate(centerX, centerY);
      this.ctx.scale(scale, scale);
      this.ctx.globalAlpha = alpha;

      this.ctx.shadowColor = key.color;
      this.ctx.shadowBlur = 10;

      this.ctx.fillStyle = key.color;
      this.ctx.beginPath();
      this.ctx.arc(0, -4, 6, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = '#1a1a2e';
      this.ctx.beginPath();
      this.ctx.arc(0, -4, 3, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = key.color;
      this.ctx.fillRect(-2, 0, 4, 10);

      this.ctx.fillRect(2, 6, 4, 2);
      this.ctx.fillRect(2, 9, 3, 2);

      this.ctx.shadowBlur = 0;
      this.ctx.restore();
    }
  }

  private drawDoors(physicsState: PhysicsState): void {
    for (const door of physicsState.doors) {
      const color = door.isOpen ? door.openColor : door.color;

      if (door.isOpen) {
        this.ctx.globalAlpha = 0.5;
        this.ctx.shadowColor = color;
        this.ctx.shadowBlur = 20;
      }

      const gradient = this.ctx.createLinearGradient(
        door.x,
        door.y,
        door.x + door.width,
        door.y
      );
      gradient.addColorStop(0, color);
      gradient.addColorStop(0.5, this.lightenColor(color, 20));
      gradient.addColorStop(1, color);
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(door.x, door.y, door.width, door.height);

      this.ctx.strokeStyle = door.isOpen ? '#27ae60' : '#7f8c8d';
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(door.x, door.y, door.width, door.height);

      if (!door.isOpen) {
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.beginPath();
        this.ctx.arc(door.x + door.width - 15, door.y + door.height / 2, 5, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = '#f1c40f';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('🔒', door.x + door.width / 2, door.y + 30);
      } else {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('✓', door.x + door.width / 2, door.y + 30);
      }

      this.ctx.globalAlpha = 1;
      this.ctx.shadowBlur = 0;
    }
  }

  private drawPlayer(physicsState: PhysicsState, isHurt: boolean): void {
    const player = physicsState.player;
    let color = '#3498db';

    if (isHurt) {
      const flashPhase = Math.floor(this.animationTime * 10) % 2;
      color = flashPhase === 0 ? '#3498db' : '#ffffff';
    }

    this.ctx.shadowColor = '#3498db';
    this.ctx.shadowBlur = 10;

    const gradient = this.ctx.createLinearGradient(
      player.x,
      player.y,
      player.x,
      player.y + player.height
    );
    gradient.addColorStop(0, this.lightenColor(color, 30));
    gradient.addColorStop(0.5, color);
    gradient.addColorStop(1, this.darkenColor(color, 30));
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(player.x, player.y, player.width, player.height);

    this.ctx.strokeStyle = '#2980b9';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(player.x, player.y, player.width, player.height);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(player.x + 15, player.y + 20, 12, 12);
    this.ctx.fillRect(player.x + player.width - 27, player.y + 20, 12, 12);

    this.ctx.fillStyle = '#1a1a2e';
    const eyeOffsetX = player.vx > 0 ? 3 : player.vx < 0 ? -3 : 0;
    this.ctx.fillRect(player.x + 18 + eyeOffsetX, player.y + 24, 6, 6);
    this.ctx.fillRect(player.x + player.width - 24 + eyeOffsetX, player.y + 24, 6, 6);

    this.ctx.strokeStyle = '#1a1a2e';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(
      player.x + player.width / 2,
      player.y + player.height - 20,
      10,
      0.1 * Math.PI,
      0.9 * Math.PI
    );
    this.ctx.stroke();

    this.ctx.shadowBlur = 0;
  }

  private drawParticles(): void {
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    this.ctx.globalAlpha = 1;
  }

  private lightenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
    const B = Math.min(255, (num & 0x0000ff) + amt);
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
  }

  private darkenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, (num >> 16) - amt);
    const G = Math.max(0, ((num >> 8) & 0x00ff) - amt);
    const B = Math.max(0, (num & 0x0000ff) - amt);
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
  }

  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
  }

  public clearParticles(): void {
    this.particles = [];
  }
}
