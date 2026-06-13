import { Particle, Vector2 } from './types';
import { MAX_PARTICLES, COLORS } from './constants';

export class ParticleSystem {
  private particles: Particle[] = [];
  private nextId: number = 0;

  public getParticles(): Particle[] {
    return this.particles;
  }

  public update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= deltaTime;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.position.x += p.velocity.x * deltaTime;
      p.position.y += p.velocity.y * deltaTime;

      if (p.type === 'lava' || p.type === 'trail' || p.type === 'crystal') {
        p.velocity.y += 200 * deltaTime;
      }
      if (p.type === 'steam') {
        p.velocity.y -= 100 * deltaTime;
        p.velocity.x *= 0.98;
      }
      if (p.type === 'smoke') {
        p.velocity.y -= 50 * deltaTime;
        p.velocity.x *= 0.96;
      }
    }
  }

  private spawnParticle(
    position: Vector2,
    velocity: Vector2,
    life: number,
    size: number,
    color: string,
    type: Particle['type']
  ): void {
    if (this.particles.length >= MAX_PARTICLES) return;
    this.particles.push({
      id: this.nextId++,
      position: { ...position },
      velocity: { ...velocity },
      life,
      maxLife: life,
      size,
      color,
      type
    });
  }

  public spawnLavaBurst(position: Vector2, count: number = 12): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = 80 + Math.random() * 120;
      const colors = [COLORS.LAVA_RED, COLORS.LAVA_ORANGE, COLORS.LAVA_YELLOW];
      this.spawnParticle(
        position,
        { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed - 50 },
        0.6 + Math.random() * 0.4,
        3 + Math.random() * 4,
        colors[Math.floor(Math.random() * colors.length)],
        'lava'
      );
    }
  }

  public spawnMeteorTrail(position: Vector2): void {
    for (let i = 0; i < 3; i++) {
      const colors = [COLORS.LAVA_ORANGE, COLORS.LAVA_YELLOW, '#ff8800'];
      this.spawnParticle(
        {
          x: position.x + (Math.random() - 0.5) * 10,
          y: position.y + (Math.random() - 0.5) * 10
        },
        {
          x: (Math.random() - 0.5) * 40,
          y: (Math.random() - 0.5) * 40
        },
        0.3 + Math.random() * 0.3,
        4 + Math.random() * 5,
        colors[Math.floor(Math.random() * colors.length)],
        'trail'
      );
    }
  }

  public spawnShockwave(position: Vector2): void {
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20;
      this.spawnParticle(
        position,
        { x: Math.cos(angle) * 200, y: Math.sin(angle) * 200 },
        0.5,
        6,
        COLORS.LAVA_ORANGE,
        'shockwave'
      );
    }
  }

  public spawnCrystalBreak(position: Vector2): void {
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 100;
      this.spawnParticle(
        position,
        { x: Math.cos(angle) * speed, y: -Math.abs(Math.sin(angle) * speed) - 40 },
        0.8 + Math.random() * 0.4,
        3 + Math.random() * 4,
        Math.random() > 0.5 ? COLORS.CRYSTAL_GOLD : COLORS.CRYSTAL_GLOW,
        'crystal'
      );
    }
  }

  public spawnSteam(position: Vector2): void {
    for (let i = 0; i < 5; i++) {
      this.spawnParticle(
        {
          x: position.x + (Math.random() - 0.5) * 20,
          y: position.y
        },
        {
          x: (Math.random() - 0.5) * 60,
          y: -150 - Math.random() * 50
        },
        0.5 + Math.random() * 0.3,
        8 + Math.random() * 8,
        COLORS.STEAM,
        'steam'
      );
    }
  }

  public spawnSmoke(position: Vector2): void {
    this.spawnParticle(
      {
        x: position.x + (Math.random() - 0.5) * 15,
        y: position.y
      },
      {
        x: (Math.random() - 0.5) * 20,
        y: -40
      },
      0.8,
      6 + Math.random() * 6,
      'rgba(80,80,80,0.6)',
      'smoke'
    );
  }

  public reset(): void {
    this.particles = [];
    this.nextId = 0;
  }
}
