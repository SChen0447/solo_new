import type { EnvironmentState } from './environment';
import type { Creature } from './creature';
import { Species } from './creature';

interface SmokeParticle {
  x: number;
  y: number;
  velocityY: number;
  alpha: number;
  size: number;
}

interface EnergyParticle {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  progress: number;
  size: number;
  color: string;
  active: boolean;
}

const COLORS = {
  bgStart: '#0d1b2a',
  bgEnd: '#1b2838',
  ventInner: '#ffeb3b',
  ventOuter: '#ff5722',
  energyStart: '#ff5722',
  energyEnd: '#ffeb3b',
  smoke: 'rgba(255, 255, 255, 0.06)',
  species: {
    [Species.ARCHAEA]: '#4caf50',
    [Species.TUBE_WORM]: '#e91e63',
    [Species.SHRIMP]: '#ff9800'
  }
};

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private smokeParticles: SmokeParticle[] = [];
  private energyParticles: EnergyParticle[] = [];
  private maxSmokeParticles: number = 50;
  private maxEnergyParticles: number = 100;

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.initializeSmokeParticles();
  }

  private initializeSmokeParticles(): void {
    for (let i = 0; i < this.maxSmokeParticles; i++) {
      this.smokeParticles.push(this.createSmokeParticle());
    }
  }

  private createSmokeParticle(): SmokeParticle {
    return {
      x: this.width / 2 + (Math.random() - 0.5) * 60,
      y: this.height / 2 - 20,
      velocityY: -0.5 - Math.random() * 0.5,
      alpha: 0.03 + Math.random() * 0.03,
      size: 3 + Math.random() * 4
    };
  }

  private createEnergyParticle(targetX: number, targetY: number, ventX: number, ventY: number): EnergyParticle {
    const t = Math.random();
    const r = 2 + Math.random() * 2;
    const color = this.interpolateColor(COLORS.energyStart, COLORS.energyEnd, t);
    
    return {
      x: ventX,
      y: ventY,
      targetX,
      targetY,
      progress: 0,
      size: r,
      color,
      active: true
    };
  }

  private interpolateColor(color1: string, color2: string, t: number): string {
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);
    
    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);
    
    return `rgb(${r}, ${g}, ${b})`;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : { r: 0, g: 0, b: 0 };
  }

  public render(envState: EnvironmentState, creatures: readonly Creature[]): void {
    this.clear();
    this.drawBackground();
    this.drawVent(envState);
    this.updateAndDrawSmoke();
    this.updateAndDrawEnergyParticles(envState, creatures);
    this.drawCreatures(creatures);
  }

  private clear(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  private drawBackground(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, COLORS.bgStart);
    gradient.addColorStop(1, COLORS.bgEnd);
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawVent(envState: EnvironmentState): void {
    const { ventPosition, ventRadius } = envState;
    
    const glowGradient = this.ctx.createRadialGradient(
      ventPosition.x, ventPosition.y, 0,
      ventPosition.x, ventPosition.y, ventRadius * 2
    );
    glowGradient.addColorStop(0, 'rgba(255, 235, 59, 0.4)');
    glowGradient.addColorStop(0.5, 'rgba(255, 87, 34, 0.2)');
    glowGradient.addColorStop(1, 'rgba(255, 87, 34, 0)');
    
    this.ctx.fillStyle = glowGradient;
    this.ctx.beginPath();
    this.ctx.arc(ventPosition.x, ventPosition.y, ventRadius * 2, 0, Math.PI * 2);
    this.ctx.fill();
    
    const ventGradient = this.ctx.createRadialGradient(
      ventPosition.x, ventPosition.y, 0,
      ventPosition.x, ventPosition.y, ventRadius
    );
    ventGradient.addColorStop(0, COLORS.ventInner);
    ventGradient.addColorStop(0.6, COLORS.ventOuter);
    ventGradient.addColorStop(1, '#d32f2f');
    
    this.ctx.fillStyle = ventGradient;
    this.ctx.beginPath();
    this.ctx.arc(ventPosition.x, ventPosition.y, ventRadius, 0, Math.PI * 2);
    this.ctx.fill();
    
    const energyGradient = this.ctx.createRadialGradient(
      ventPosition.x, ventPosition.y, 0,
      ventPosition.x, ventPosition.y, envState.energySourceRadius
    );
    energyGradient.addColorStop(0, 'rgba(255, 235, 59, 0.1)');
    energyGradient.addColorStop(1, 'rgba(255, 235, 59, 0)');
    
    this.ctx.fillStyle = energyGradient;
    this.ctx.beginPath();
    this.ctx.arc(ventPosition.x, ventPosition.y, envState.energySourceRadius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private updateAndDrawSmoke(): void {
    for (let i = 0; i < this.smokeParticles.length; i++) {
      const particle = this.smokeParticles[i];
      
      particle.y += particle.velocityY;
      particle.x += (Math.random() - 0.5) * 0.3;
      particle.alpha -= 0.0005;
      
      if (particle.y < 0 || particle.alpha <= 0) {
        this.smokeParticles[i] = this.createSmokeParticle();
        continue;
      }
      
      this.ctx.fillStyle = `rgba(255, 255, 255, ${particle.alpha})`;
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private updateAndDrawEnergyParticles(envState: EnvironmentState, creatures: readonly Creature[]): void {
    if (creatures.length > 0 && Math.random() < 0.3) {
      const inactiveCount = this.energyParticles.filter(p => !p.active).length;
      if (inactiveCount < this.maxEnergyParticles) {
        const targetCreature = creatures[Math.floor(Math.random() * creatures.length)];
        const dist = Math.sqrt(
          Math.pow(targetCreature.x - envState.ventPosition.x, 2) +
          Math.pow(targetCreature.y - envState.ventPosition.y, 2)
        );
        if (dist < 150) {
          this.energyParticles.push(
            this.createEnergyParticle(
              targetCreature.x,
              targetCreature.y,
              envState.ventPosition.x,
              envState.ventPosition.y
            )
          );
        }
      }
    }

    for (let i = this.energyParticles.length - 1; i >= 0; i--) {
      const particle = this.energyParticles[i];
      
      if (!particle.active) {
        this.energyParticles.splice(i, 1);
        continue;
      }
      
      particle.progress += 0.01;
      
      if (particle.progress >= 1) {
        particle.active = false;
        continue;
      }
      
      const t = particle.progress;
      const easeT = t * t * (3 - 2 * t);
      
      particle.x = envState.ventPosition.x + (particle.targetX - envState.ventPosition.x) * easeT;
      particle.y = envState.ventPosition.y + (particle.targetY - envState.ventPosition.y) * easeT;
      
      this.ctx.fillStyle = particle.color;
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size * (1 - t * 0.5), 0, Math.PI * 2);
      this.ctx.fill();
      
      if (particle.progress > 0.1) {
        const trailLength = 5;
        this.ctx.strokeStyle = particle.color;
        this.ctx.lineWidth = 1;
        this.ctx.globalAlpha = 0.3 * (1 - t);
        this.ctx.beginPath();
        this.ctx.moveTo(particle.x, particle.y);
        
        const prevT = Math.max(0, particle.progress - 0.05);
        const prevEaseT = prevT * prevT * (3 - 2 * prevT);
        const prevX = envState.ventPosition.x + (particle.targetX - envState.ventPosition.x) * prevEaseT;
        const prevY = envState.ventPosition.y + (particle.targetY - envState.ventPosition.y) * prevEaseT;
        
        this.ctx.lineTo(prevX, prevY);
        this.ctx.stroke();
        this.ctx.globalAlpha = 1;
      }
    }
  }

  private drawCreatures(creatures: readonly Creature[]): void {
    for (const creature of creatures) {
      const energyRatio = creature.energy / 100;
      this.ctx.globalAlpha = 0.5 + energyRatio * 0.5;
      
      switch (creature.species) {
        case Species.ARCHAEA:
          this.drawHexagon(creature.x, creature.y, 8, COLORS.species[Species.ARCHAEA]);
          break;
        case Species.TUBE_WORM:
          this.drawTubeWorm(creature.x, creature.y, COLORS.species[Species.TUBE_WORM]);
          break;
        case Species.SHRIMP:
          this.drawShrimp(creature.x, creature.y, 10, COLORS.species[Species.SHRIMP]);
          break;
      }
    }
    this.ctx.globalAlpha = 1;
  }

  private drawHexagon(x: number, y: number, size: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const px = x + size * Math.cos(angle);
      const py = y + size * Math.sin(angle);
      
      if (i === 0) {
        this.ctx.moveTo(px, py);
      } else {
        this.ctx.lineTo(px, py);
      }
    }
    
    this.ctx.closePath();
    this.ctx.fill();
    
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
  }

  private drawTubeWorm(x: number, y: number, color: string): void {
    const width = 4;
    const height = 16;
    
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x - width / 2, y - height / 2, width, height);
    
    this.ctx.fillStyle = '#ffc107';
    this.ctx.beginPath();
    this.ctx.arc(x, y - height / 2, width, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x - width / 2, y - height / 2, width, height);
  }

  private drawShrimp(x: number, y: number, size: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    
    this.ctx.moveTo(x, y - size / 2);
    this.ctx.lineTo(x - size / 2, y + size / 2);
    this.ctx.lineTo(x + size / 2, y + size / 2);
    
    this.ctx.closePath();
    this.ctx.fill();
    
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
    
    this.ctx.fillStyle = '#fff';
    this.ctx.beginPath();
    this.ctx.arc(x, y, 2, 0, Math.PI * 2);
    this.ctx.fill();
  }

  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
  }
}
