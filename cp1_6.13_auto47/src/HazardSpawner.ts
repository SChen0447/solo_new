import { Meteor, LavaFlow, Vector2, HexCoord, TileState } from './types';
import {
  METEOR_MIN_INTERVAL,
  METEOR_MAX_INTERVAL,
  METEOR_FALL_DURATION,
  METEOR_SHOCKWAVE_RADIUS,
  METEOR_SHOCKWAVE_DURATION,
  MAP_RADIUS,
  HEX_SIZE,
  HEX_WIDTH
} from './constants';
import { TileMap } from './TileMap';
import { ParticleSystem } from './ParticleSystem';

export class HazardSpawner {
  private meteors: Meteor[] = [];
  private lavaFlows: LavaFlow[] = [];
  private meteorTimer: number = 0;
  private nextMeteorInterval: number;
  private nextId: number = 1;
  private lavaTimer: number = 0;
  private tileMap: TileMap;
  private particles: ParticleSystem;

  constructor(tileMap: TileMap, particles: ParticleSystem) {
    this.tileMap = tileMap;
    this.particles = particles;
    this.nextMeteorInterval = METEOR_MIN_INTERVAL + Math.random() * (METEOR_MAX_INTERVAL - METEOR_MIN_INTERVAL);
  }

  public update(deltaTime: number): void {
    this.meteorTimer += deltaTime;
    if (this.meteorTimer >= this.nextMeteorInterval) {
      this.spawnMeteor();
      this.meteorTimer = 0;
      this.nextMeteorInterval = METEOR_MIN_INTERVAL + Math.random() * (METEOR_MAX_INTERVAL - METEOR_MIN_INTERVAL);
    }

    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i];
      if (!m.exploded) {
        m.progress += deltaTime / m.duration;
        const t = Math.min(1, m.progress);
        const easeT = 1 - Math.pow(1 - t, 2);
        m.position.x = m.startPos.x + (m.targetPos.x - m.startPos.x) * easeT;
        m.position.y = m.startPos.y + (m.targetPos.y - m.startPos.y) * easeT;

        if (Math.random() < 0.8) {
          this.particles.spawnMeteorTrail(m.position);
        }

        if (m.progress >= 1) {
          m.exploded = true;
          m.shockwaveRadius = 0;
          m.shockwaveProgress = 0;
          this.particles.spawnShockwave(m.targetPos);
          this.particles.spawnLavaBurst(m.targetPos, 20);
        }
      } else {
        m.shockwaveProgress += deltaTime / METEOR_SHOCKWAVE_DURATION;
        m.shockwaveRadius = METEOR_SHOCKWAVE_RADIUS * Math.min(1, m.shockwaveProgress);
        if (m.shockwaveProgress >= 1) {
          this.meteors.splice(i, 1);
        }
      }
    }

    this.lavaTimer += deltaTime;
    if (this.lavaTimer >= 0.3) {
      this.lavaTimer = 0;
      this.updateLavaFlows();
    }
  }

  private spawnMeteor(): void {
    const angle = Math.random() * Math.PI * 2;
    const dist = MAP_RADIUS * HEX_WIDTH * 0.7;
    const startOffset = 600;

    const tiles = this.tileMap.getTiles().filter(t =>
      t.state === TileState.STABLE || t.state === TileState.WARNING
    );
    if (tiles.length === 0) return;

    const targetTile = tiles[Math.floor(Math.random() * tiles.length)];
    const targetPixel = TileMap.hexToPixel(targetTile.coord);

    const startX = targetPixel.x + Math.cos(angle) * startOffset;
    const startY = targetPixel.y + Math.sin(angle) * startOffset - 400;

    this.meteors.push({
      id: this.nextId++,
      startPos: { x: startX, y: startY },
      targetPos: { ...targetPixel },
      position: { x: startX, y: startY },
      progress: 0,
      duration: METEOR_FALL_DURATION,
      exploded: false,
      shockwaveRadius: 0,
      shockwaveProgress: 0
    });
  }

  private updateLavaFlows(): void {
    const mapRadiusPx = MAP_RADIUS * HEX_WIDTH * 0.9;

    if (Math.random() < 0.6) {
      const side = Math.random() < 0.5 ? 'left' : 'right';
      const y = (Math.random() - 0.5) * mapRadiusPx * 1.2;
      const speedBase = 60 + Math.random() * 40;
      this.lavaFlows.push({
        id: this.nextId++,
        side,
        position: {
          x: side === 'left' ? -mapRadiusPx - 60 : mapRadiusPx + 60,
          y
        },
        velocity: {
          x: side === 'left' ? speedBase : -speedBase,
          y: (Math.random() - 0.5) * 20
        }
      });
    }

    for (let i = this.lavaFlows.length - 1; i >= 0; i--) {
      const lf = this.lavaFlows[i];
      lf.position.x += lf.velocity.x * 0.3;
      lf.position.y += lf.velocity.y * 0.3;
      const tile = this.tileMap.getTileAtPixel(lf.position);
      if (tile && (tile.state === TileState.STABLE || tile.state === TileState.WARNING)) {
        this.lavaFlows.splice(i, 1);
        continue;
      }
      if (Math.abs(lf.position.x) > mapRadiusPx + 200) {
        this.lavaFlows.splice(i, 1);
      }
    }
  }

  public getMeteors(): Meteor[] {
    return this.meteors;
  }

  public getLavaFlows(): LavaFlow[] {
    return this.lavaFlows;
  }

  public getActiveShockwaves(): Meteor[] {
    return this.meteors.filter(m => m.exploded && m.shockwaveProgress < 1);
  }

  public reset(): void {
    this.meteors = [];
    this.lavaFlows = [];
    this.meteorTimer = 0;
    this.lavaTimer = 0;
    this.nextMeteorInterval = METEOR_MIN_INTERVAL + Math.random() * (METEOR_MAX_INTERVAL - METEOR_MIN_INTERVAL);
  }
}
