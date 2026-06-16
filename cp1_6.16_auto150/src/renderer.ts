import {
  GameEngine,
  GameState,
  Position,
  Unit,
  Mage,
  SkillType,
  BOARD_SIZE,
  CELL_SIZE,
  ActionRecord,
} from './gameEngine.js';

export interface ActiveAnimation {
  type: 'move' | 'attack' | 'skill' | 'death';
  startTime: number;
  duration: number;
  action?: ActionRecord;
}

export interface SkillEffect {
  type: 'fire' | 'ice' | 'thunder' | 'wind';
  position: Position;
  startTime: number;
  duration: number;
}

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

type HighlightType = 'move' | 'attack' | 'skill' | 'selected';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private engine: GameEngine;
  private highlights: Map<string, HighlightType> = new Map();
  private selectedUnitId: string | null = null;
  private animations: ActiveAnimation[] = [];
  private skillEffects: SkillEffect[] = [];
  private particles: Particle[] = [];
  private animatingUnitPositions: Map<string, { from: Position; to: Position; startTime: number; duration: number> = new Map();
  private lastTime: number = 0;
  private animationFrameId: number | null = null;

  constructor(canvas: HTMLCanvasElement, engine: GameEngine) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;
    this.engine = engine;
  }

  start(): void {
    this.lastTime = performance.now();
    this.loop();
  }

  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private loop = (): void => {
    const now = performance.now();
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    this.update(dt, now);
    this.render(now);

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private update(dt: number, now: number): void {
    this.particles = this.particles.filter((p) => {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 200 * dt;
      return p.life > 0;
    });

    this.animatingUnitPositions.forEach((anim, id) => {
      if (now - anim.startTime > anim.duration) {
        this.animatingUnitPositions.delete(id);
      }
    });

    this.skillEffects = this.skillEffects.filter(
      (effect) => now - effect.startTime < effect.duration
    );

    this.animations = this.animations.filter(
      (anim) => now - anim.startTime < anim.duration
    );
  }

  setHighlights(positions: Position[], type: HighlightType): void {
    this.highlights.clear();
    positions.forEach((p) => {
      this.highlights.set(`${p.x},${p.y}`, type);
    });
  }

  clearHighlights(): void {
    this.highlights.clear();
  }

  setSelectedUnit(unitId: string | null): void {
    this.selectedUnitId = unitId;
  }

  playMoveAnimation(unitId: string, from: Position, to: Position, duration: number = 200): void {
    this.animatingUnitPositions.set(unitId, {
      from,
      to,
      startTime: performance.now(),
      duration,
    });
  }

  playFireEffect(position: Position): void {
    const centerX = position.x * CELL_SIZE + CELL_SIZE / 2;
    const centerY = position.y * CELL_SIZE + CELL_SIZE / 2;

    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20;
      const speed = 50 + Math.random() * 100;
      this.particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 50,
        life: 0.8 + Math.random() * 0.2,
        maxLife: 1,
        color: Math.random() > 0.5 ? '#FF5722' : '#FF9800',
        size: 3 + Math.random() * 3,
      });
    }

    this.skillEffects.push({
      type: 'fire',
      position,
      startTime: performance.now(),
      duration: 1000,
    });
  }

  playIceEffect(position: Position): void {
    this.skillEffects.push({
      type: 'ice',
      position,
      startTime: performance.now(),
      duration: 600,
    });
  }

  playThunderEffect(position: Position): void {
    this.skillEffects.push({
      type: 'thunder',
      position,
      startTime: performance.now(),
      duration: 300,
    });
  }

  playWindEffect(from: Position, to: Position): void {
    const centerX = from.x * CELL_SIZE + CELL_SIZE / 2;
    const centerY = from.y * CELL_SIZE + CELL_SIZE / 2;

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    for (let i = 0; i < 15; i++) {
      const offset = Math.random() * CELL_SIZE * 0.4;
      this.particles.push({
        x: centerX - (dx / dist) * offset + (Math.random() - 0.5) * 20,
        y: centerY - (dy / dist) * offset + (Math.random() - 0.5) * 20,
        vx: (dx / dist) * (80 + Math.random() * 60),
        vy: (dy / dist) * (80 + Math.random() * 60),
        life: 0.5 + Math.random() * 0.3,
        maxLife: 0.8,
        color: '#81C784',
        size: 4 + Math.random() * 4,
      });
    }
  }

  playAttackEffect(from: Position, to: Position): void {
    const fromX = from.x * CELL_SIZE + CELL_SIZE / 2;
    const fromY = from.y * CELL_SIZE + CELL_SIZE / 2;
    const toX = to.x * CELL_SIZE + CELL_SIZE / 2;
    const toY = to.y * CELL_SIZE + CELL_SIZE / 2;

    for (let i = 0; i < 10; i++) {
      const t = i / 10;
      this.particles.push({
        x: fromX + (toX - fromX) * t,
        y: fromY + (toY - fromY) * t,
        vx: (Math.random() - 0.5) * 60,
        vy: (Math.random() - 0.5) * 60,
        life: 0.3 + Math.random() * 0.2,
        maxLife: 0.5,
        color: '#FFEB3B',
        size: 3,
      });
    }
  }

  getUnitScreenPos(unit: Unit, now: number): { x: number; y: number } {
    const anim = this.animatingUnitPositions.get(unit.id);
    if (anim) {
      const t = Math.min(1, (now - anim.startTime) / anim.duration);
      const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2);
      return {
        x: (anim.from.x + (anim.to.x - anim.from.x) * easeT) * CELL_SIZE,
        y: (anim.from.y + (anim.to.y - anim.from.y) * easeT) * CELL_SIZE,
      };
    }
    return {
      x: unit.position.x * CELL_SIZE,
      y: unit.position.y * CELL_SIZE,
    };
  }

  private render(now: number): void {
    const state = this.engine.getState();

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawBoard();
    this.drawIceZones(state, now);
    this.drawHighlights();
    this.drawUnits(state, now);
    this.drawSkillEffects(now);
    this.drawParticles();

    if (this.selectedUnitId) {
      const unit = this.engine.getUnitById(this.selectedUnitId);
      if (unit && unit.isAlive) {
        const pos = this.getUnitScreenPos(unit, now);
        this.ctx.strokeStyle = '#FFEB3B';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(pos.x + 2, pos.y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
      }
    }

    if (state.winner) {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.fillStyle = '#FFEB3B';
      this.ctx.font = 'bold 32px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(
        `玩家 ${state.winner} 获胜！`,
        this.canvas.width / 2,
        this.canvas.height / 2
      );
    }
  }

  private drawBoard(): void {
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const px = x * CELL_SIZE;
        const py = y * CELL_SIZE;

        this.ctx.fillStyle = '#3E2723';
        this.ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);

        if (x % 2 === 0 && y % 2 === 0) {
          this.ctx.fillStyle = '#4E342E';
          this.ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
        }

        this.ctx.strokeStyle = '#5D4037';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(px + 0.5, py + 0.5, CELL_SIZE - 1, CELL_SIZE - 1);
      }
    }
  }

  private drawIceZones(state: GameState, now: number): void {
    state.iceZones.forEach((zone) => {
      const px = zone.position.x * CELL_SIZE;
      const py = zone.position.y * CELL_SIZE;
      this.ctx.fillStyle = 'rgba(79, 195, 247, 0.3)';
      this.ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);

      const pulse = 0.5 + 0.5 * Math.sin(now / 300);
      this.ctx.strokeStyle = `rgba(79, 195, 247, ${0.5 * pulse})`;
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(px + 2, py + 2, CELL_SIZE - 4, CELL_SIZE - 4);
    });
  }

  private drawHighlights(): void {
    this.highlights.forEach((type, key) => {
      const [x, y] = key.split(',').map(Number);
      const px = x * CELL_SIZE;
      const py = y * CELL_SIZE;

      let color = '';
      switch (type) {
        case 'move':
          color = 'rgba(76, 175, 80, 0.4)';
          break;
        case 'attack':
          color = 'rgba(244, 67, 54, 0.4)';
          break;
        case 'skill':
          color = 'rgba(156, 39, 176, 0.4)';
          break;
        case 'selected':
          color = 'rgba(255, 235, 59, 0.3)';
          break;
      }

      this.ctx.fillStyle = color;
      this.ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
    });
  }

  private drawUnits(state: GameState, now: number): void {
    state.units.forEach((unit) => {
      if (!unit.isAlive) return;

      const pos = this.getUnitScreenPos(unit, now);
      const centerX = pos.x + CELL_SIZE / 2;
      const centerY = pos.y + CELL_SIZE / 2;

      if (unit.type === 'mage') {
        this.ctx.fillStyle = unit.owner === 1 ? '#2196F3' : '#F44336';
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, 14, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('法', centerX, centerY);
      } else {
        this.ctx.fillStyle = unit.owner === 1 ? '#64B5F6' : '#EF5350';
        this.ctx.fillRect(pos.x + 8, pos.y + 8, CELL_SIZE - 16, CELL_SIZE - 16);
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(pos.x + 8, pos.y + 8, CELL_SIZE - 16, CELL_SIZE - 16);

        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('召', centerX, centerY);
      }

      if (unit.slowedTurns > 0) {
        this.ctx.fillStyle = 'rgba(79, 195, 247, 0.6)';
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, 18, 0, Math.PI * 2);
        this.ctx.fill();
      }

      const barWidth = CELL_SIZE - 8;
      const barHeight = 5;
      const barX = pos.x + 4;
      const barY = pos.y + CELL_SIZE - 9;

      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      this.ctx.fillRect(barX, barY, barWidth, barHeight);

      const hpRatio = Math.max(0, unit.hp / unit.maxHp);
      const hpColor = hpRatio > 0.5 ? '#4CAF50' : hpRatio > 0.25 ? '#FFC107' : '#F44336';
      this.ctx.fillStyle = hpColor;
      this.ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);
    });
  }

  private drawSkillEffects(now: number): void {
    this.skillEffects.forEach((effect) => {
      const elapsed = now - effect.startTime;
      const progress = Math.min(1, elapsed / effect.duration);

      const centerX = effect.position.x * CELL_SIZE + CELL_SIZE / 2;
      const centerY = effect.position.y * CELL_SIZE + CELL_SIZE / 2;

      switch (effect.type) {
        case 'fire': {
          const alpha = 1 - progress;
          const radius = 10 + progress * 20;
          const gradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
          gradient.addColorStop(0, `rgba(255, 152, 0, ${alpha})`);
          gradient.addColorStop(1, `rgba(255, 87, 34, ${alpha * 0.5})`);
          this.ctx.fillStyle = gradient;
          this.ctx.beginPath();
          this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          this.ctx.fill();
          break;
        }
        case 'ice': {
          const alpha = 0.4 + 0.3 * Math.sin(now / 100);
          this.ctx.fillStyle = `rgba(79, 195, 247, ${alpha})`;
          this.ctx.fillRect(
            effect.position.x * CELL_SIZE + 4,
            effect.position.y * CELL_SIZE + 4,
            CELL_SIZE - 8,
            CELL_SIZE - 8
          );
          this.ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
          this.ctx.lineWidth = 2;
          this.ctx.strokeRect(
            effect.position.x * CELL_SIZE + 4,
            effect.position.y * CELL_SIZE + 4,
            CELL_SIZE - 8,
            CELL_SIZE - 8
          );
          break;
        }
        case 'thunder': {
          const alpha = 1 - progress;
          this.ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
          this.ctx.lineWidth = 3;
          this.ctx.beginPath();
          this.ctx.moveTo(centerX, 0);
          let currentY = 0;
          let targetY = centerY + CELL_SIZE / 2;
          while (currentY < targetY) {
            currentY += 10 + Math.random() * 15;
            this.ctx.lineTo(centerX + (Math.random() - 0.5) * 15, Math.min(currentY, targetY));
          }
          this.ctx.stroke();

          this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.3})`;
          this.ctx.beginPath();
          this.ctx.arc(centerX, centerY, 15 + progress * 10, 0, Math.PI * 2);
          this.ctx.fill();
          break;
        }
        case 'wind': {
          break;
        }
      }
    });
  }

  private drawParticles(): void {
    this.particles.forEach((p) => {
      const alpha = Math.max(0, p.life / p.maxLife);
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      this.ctx.fill();
    });
    this.ctx.globalAlpha = 1;
  }

  getCellFromScreen(screenX: number, screenY: number): Position | null {
    const rect = this.canvas.getBoundingClientRect();
    const x = Math.floor((screenX - rect.left) / CELL_SIZE);
    const y = Math.floor((screenY - rect.top) / CELL_SIZE);
    if (x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE) {
      return { x, y };
    }
    return null;
  }
}
