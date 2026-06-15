import {
  GameState,
  Asteroid,
  Crystal,
  Portal,
  Effect,
  CollectWaveEffect,
  AsteroidDebrisEffect,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  SHIP_BASE,
  SHIP_HEIGHT,
  PORTAL_WIDTH,
  PORTAL_HEIGHT,
  CRYSTAL_RADIUS,
  UPGRADE_FLASH_DURATION
} from './entities';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private gameOverTime: number = 0;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  render(state: GameState): void {
    this.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.drawBackground();
    this.drawNebulaDots(state);
    this.drawStars(state);
    this.drawCrystals(state.crystals);
    this.drawPortal(state.portal);
    this.drawAsteroids(state.asteroids);
    this.drawShipTrail(state.ship);
    this.drawShip(state.ship);
    this.drawEffects(state.effects);
    this.drawWhiteFlash(state.whiteFlash);

    if (state.gameOver) {
      this.drawGameOver(state.score);
    }
  }

  private drawBackground(): void {
    const gradient = this.ctx.createRadialGradient(
      CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 0,
      CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH * 0.7
    );
    gradient.addColorStop(0, '#1a1a3e');
    gradient.addColorStop(1, '#0a0a1a');

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  private drawNebulaDots(state: GameState): void {
    for (const dot of state.nebulaDots) {
      this.ctx.beginPath();
      this.ctx.arc(dot.position.x, dot.position.y, dot.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(255, 255, 255, ${dot.alpha})`;
      this.ctx.fill();
    }
  }

  private drawStars(state: GameState): void {
    for (const star of state.stars) {
      const alpha = star.baseAlpha * (0.5 + 0.5 * Math.sin(star.blinkPhase));
      const gradient = this.ctx.createRadialGradient(
        star.position.x, star.position.y, 0,
        star.position.x, star.position.y, star.radius * 2
      );
      gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

      this.ctx.beginPath();
      this.ctx.arc(star.position.x, star.position.y, star.radius * 2, 0, Math.PI * 2);
      this.ctx.fillStyle = gradient;
      this.ctx.fill();
    }
  }

  private drawCrystals(crystals: Crystal[]): void {
    for (const crystal of crystals) {
      this.ctx.save();
      this.ctx.translate(crystal.position.x, crystal.position.y);
      this.ctx.rotate(crystal.rotation);

      this.ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(angle) * CRYSTAL_RADIUS;
        const y = Math.sin(angle) * CRYSTAL_RADIUS;
        if (i === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      }
      this.ctx.closePath();

      this.ctx.fillStyle = crystal.color;
      this.ctx.fill();
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();

      this.ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(angle) * CRYSTAL_RADIUS * 0.5;
        const y = Math.sin(angle) * CRYSTAL_RADIUS * 0.5;
        if (i === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      }
      this.ctx.closePath();
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      this.ctx.fill();

      this.ctx.restore();
    }
  }

  private drawPortal(portal: Portal | null): void {
    if (!portal) return;

    this.ctx.save();
    this.ctx.translate(portal.position.x, portal.position.y);
    this.ctx.rotate(portal.rotation);

    const gradient = this.ctx.createLinearGradient(-PORTAL_WIDTH / 2, 0, PORTAL_WIDTH / 2, 0);
    gradient.addColorStop(0, '#9c27b0');
    gradient.addColorStop(0.5, '#e91e63');
    gradient.addColorStop(1, '#9c27b0');

    this.ctx.beginPath();
    this.ctx.ellipse(0, 0, PORTAL_WIDTH / 2, PORTAL_HEIGHT / 2, 0, 0, Math.PI * 2);
    this.ctx.strokeStyle = gradient;
    this.ctx.lineWidth = 4;
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.ellipse(0, 0, PORTAL_WIDTH / 2 - 6, PORTAL_HEIGHT / 2 - 6, 0, 0, Math.PI * 2);
    this.ctx.strokeStyle = 'rgba(233, 30, 99, 0.5)';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    this.ctx.save();
    this.ctx.rotate(-portal.rotation * 2);
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      const x = Math.cos(angle) * PORTAL_WIDTH / 4;
      const y = Math.sin(angle) * PORTAL_HEIGHT / 4;
      this.ctx.beginPath();
      this.ctx.arc(x, y, 3, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      this.ctx.fill();
    }
    this.ctx.restore();

    this.ctx.restore();
  }

  private drawAsteroids(asteroids: Asteroid[]): void {
    for (const asteroid of asteroids) {
      this.ctx.save();
      this.ctx.translate(asteroid.position.x, asteroid.position.y);
      this.ctx.rotate(asteroid.rotation);

      this.ctx.beginPath();
      const vertices = asteroid.vertices;
      for (let i = 0; i < vertices.length; i++) {
        const v = vertices[i];
        if (i === 0) {
          this.ctx.moveTo(v.x, v.y);
        } else {
          this.ctx.lineTo(v.x, v.y);
        }
      }
      this.ctx.closePath();

      this.ctx.fillStyle = '#8d6e63';
      this.ctx.fill();
      this.ctx.strokeStyle = '#6d4c41';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      for (let i = 0; i < vertices.length; i += 2) {
        const v = vertices[i];
        const craterRadius = asteroid.radius * 0.1 + Math.random() * 2;
        this.ctx.beginPath();
        this.ctx.arc(v.x * 0.5, v.y * 0.5, craterRadius, 0, Math.PI * 2);
        this.ctx.fillStyle = '#6d4c41';
        this.ctx.fill();
      }

      this.ctx.restore();
    }
  }

  private drawShipTrail(ship: Ship): void {
    for (const particle of ship.trail) {
      this.ctx.beginPath();
      this.ctx.arc(particle.position.x, particle.position.y, particle.size, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(0, 188, 212, ${particle.alpha})`;
      this.ctx.fill();
    }
  }

  private drawShip(ship: Ship): void {
    this.ctx.save();
    this.ctx.translate(ship.position.x, ship.position.y);
    this.ctx.rotate(ship.angle);

    let alpha = 1;
    if (ship.invincible) {
      const blinkPeriod = 0.1;
      const blinkPhase = (ship.invincibleTimer % blinkPeriod) / blinkPeriod;
      alpha = 0.3 + 0.7 * (blinkPhase < 0.5 ? 1 : 0);
    }

    this.ctx.globalAlpha = alpha;

    this.ctx.beginPath();
    this.ctx.moveTo(0, 0);
    const beamTip = 40;
    const beamHalfWidth = 10;
    this.ctx.lineTo(beamTip, -beamHalfWidth);
    this.ctx.lineTo(beamTip, beamHalfWidth);
    this.ctx.closePath();
    const beamGradient = this.ctx.createLinearGradient(0, 0, beamTip, 0);
    beamGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
    beamGradient.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
    this.ctx.fillStyle = beamGradient;
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.moveTo(SHIP_HEIGHT / 2, 0);
    this.ctx.lineTo(-SHIP_HEIGHT / 2, -SHIP_BASE / 2);
    this.ctx.lineTo(-SHIP_HEIGHT / 3, 0);
    this.ctx.lineTo(-SHIP_HEIGHT / 2, SHIP_BASE / 2);
    this.ctx.closePath();

    this.ctx.fillStyle = '#00e5ff';
    this.ctx.fill();
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 1.5;
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.arc(SHIP_HEIGHT / 6, 0, 4, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.fill();

    this.ctx.globalAlpha = 1;
    this.ctx.restore();
  }

  private drawEffects(effects: Effect[]): void {
    for (const effect of effects) {
      if (effect.type === 'collectWave') {
        this.drawCollectWave(effect);
      } else if (effect.type === 'debris') {
        this.drawDebris(effect);
      }
    }
  }

  private drawCollectWave(effect: CollectWaveEffect): void {
    this.ctx.beginPath();
    this.ctx.arc(effect.position.x, effect.position.y, effect.radius, 0, Math.PI * 2);
    this.ctx.strokeStyle = effect.color;
    this.ctx.globalAlpha = effect.alpha;
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
    this.ctx.globalAlpha = 1;
  }

  private drawDebris(effect: AsteroidDebrisEffect): void {
    this.ctx.save();
    this.ctx.translate(effect.position.x, effect.position.y);
    this.ctx.rotate(effect.rotation);
    this.ctx.globalAlpha = effect.alpha;

    this.ctx.beginPath();
    const vertices = effect.vertices;
    for (let i = 0; i < vertices.length; i++) {
      const v = vertices[i];
      if (i === 0) {
        this.ctx.moveTo(v.x, v.y);
      } else {
        this.ctx.lineTo(v.x, v.y);
      }
    }
    this.ctx.closePath();

    this.ctx.fillStyle = '#5d4037';
    this.ctx.fill();

    this.ctx.globalAlpha = 1;
    this.ctx.restore();
  }

  private drawWhiteFlash(flashTime: number): void {
    if (flashTime <= 0) return;

    const alpha = flashTime / UPGRADE_FLASH_DURATION;
    this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  private drawGameOver(score: number): void {
    this.gameOverTime += 1 / 60;
    const pulsePeriod = 1.2;
    const pulsePhase = (this.gameOverTime % pulsePeriod) / pulsePeriod;
    const scale = 1 + 0.1 * Math.sin(pulsePhase * Math.PI * 2);

    this.ctx.save();
    this.ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    this.ctx.scale(scale, scale);

    this.ctx.font = 'bold 40px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillStyle = '#ff0000';
    this.ctx.fillText('游戏结束', 0, -30);

    this.ctx.font = 'bold 20px sans-serif';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText(`最终分数: ${score}`, 0, 20);

    this.ctx.font = '16px sans-serif';
    this.ctx.fillStyle = '#aaaaaa';
    this.ctx.fillText('按空格键重新开始', 0, 60);

    this.ctx.restore();
  }
}
