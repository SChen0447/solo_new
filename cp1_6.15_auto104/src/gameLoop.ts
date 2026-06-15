import {
  GameState,
  Asteroid,
  Crystal,
  createShip,
  createAsteroid,
  createCrystal,
  createPortal,
  createCollectWaveEffect,
  createAsteroidDebrisEffect,
  createStars,
  createNebulaDots,
  Quadtree,
  checkCircleCollision,
  checkBeamCollision,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  SHIP_SPEED,
  MAX_ASTEROIDS,
  MAX_CRYSTALS,
  ENERGY_TO_UPGRADE,
  INVINCIBLE_DURATION,
  UPGRADE_FLASH_DURATION,
  createVector2
} from './entities';
import { Renderer } from './renderer';

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export type GameStatus = 'menu' | 'playing' | 'gameover';

export class GameLoop {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: GameState;
  private renderer: Renderer;
  private animationId: number | null = null;
  private lastTime: number = 0;
  private input: InputState = { up: false, down: false, left: false, right: false };
  private quadtree: Quadtree;
  private status: GameStatus = 'playing';
  private onStateChange: ((state: GameState, status: GameStatus) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.state = this.createInitialState();
    this.renderer = new Renderer(this.ctx);
    this.quadtree = new Quadtree({ x: 0, y: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT }, 4);
  }

  private createInitialState(): GameState {
    return {
      ship: createShip(),
      asteroids: [],
      crystals: [],
      portal: null,
      energy: 0,
      level: 1,
      score: 0,
      gameOver: false,
      whiteFlash: 0,
      effects: [],
      asteroidSpawnRate: 1.5,
      crystalSpawnRate: 2.0,
      asteroidSpawnTimer: 0,
      crystalSpawnTimer: 0,
      stars: createStars(30),
      nebulaDots: createNebulaDots(150)
    };
  }

  setInput(input: InputState): void {
    this.input = input;
  }

  setOnStateChange(callback: (state: GameState, status: GameStatus) => void): void {
    this.onStateChange = callback;
  }

  start(): void {
    this.lastTime = performance.now();
    this.loop();
  }

  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  restart(): void {
    this.state = this.createInitialState();
    this.status = 'playing';
    this.lastTime = performance.now();
    this.notifyStateChange();
  }

  getState(): GameState {
    return this.state;
  }

  getStatus(): GameStatus {
    return this.status;
  }

  private loop(): void {
    const currentTime = performance.now();
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.05);
    this.lastTime = currentTime;

    if (this.status === 'playing') {
      this.update(deltaTime);
    }

    this.render();
    this.notifyStateChange();

    this.animationId = requestAnimationFrame(() => this.loop());
  }

  private update(deltaTime: number): void {
    const { ship } = this.state;

    this.updateNebula(deltaTime);
    this.updateShip(deltaTime);
    this.updateShipTrail();
    this.updateInvincibility(deltaTime);
    this.updateAsteroids(deltaTime);
    this.updateCrystals(deltaTime);
    this.updatePortal(deltaTime);
    this.updateEffects(deltaTime);
    this.spawnEntities(deltaTime);
    this.checkCollisions();
    this.updateWhiteFlash(deltaTime);
  }

  private updateNebula(deltaTime: number): void {
    for (const dot of this.state.nebulaDots) {
      dot.position.x += dot.driftSpeed.x * deltaTime * 60;
      dot.position.y += dot.driftSpeed.y * deltaTime * 60;

      if (dot.position.x < 0) dot.position.x = CANVAS_WIDTH;
      if (dot.position.x > CANVAS_WIDTH) dot.position.x = 0;
      if (dot.position.y < 0) dot.position.y = CANVAS_HEIGHT;
      if (dot.position.y > CANVAS_HEIGHT) dot.position.y = 0;
    }

    for (const star of this.state.stars) {
      star.blinkPhase += star.blinkSpeed * deltaTime;
    }
  }

  private updateShip(deltaTime: number): void {
    const { ship } = this.state;
    let dx = 0, dy = 0;

    if (this.input.up) dy -= 1;
    if (this.input.down) dy += 1;
    if (this.input.left) dx -= 1;
    if (this.input.right) dx += 1;

    if (dx !== 0 || dy !== 0) {
      const length = Math.sqrt(dx * dx + dy * dy);
      dx /= length;
      dy /= length;
      ship.angle = Math.atan2(dy, dx);
    }

    ship.velocity.x = dx * SHIP_SPEED;
    ship.velocity.y = dy * SHIP_SPEED;

    ship.position.x += ship.velocity.x * deltaTime * 60;
    ship.position.y += ship.velocity.y * deltaTime * 60;

    ship.position.x = Math.max(ship.radius, Math.min(CANVAS_WIDTH - ship.radius, ship.position.x));
    ship.position.y = Math.max(ship.radius, Math.min(CANVAS_HEIGHT - ship.radius, ship.position.y));
  }

  private updateShipTrail(): void {
    const { ship } = this.state;

    if (ship.velocity.x !== 0 || ship.velocity.y !== 0) {
      const trailAngle = ship.angle + Math.PI;
      const offset = 10 + Math.random() * 5;
      ship.trail.unshift({
        position: createVector2(
          ship.position.x + Math.cos(trailAngle) * offset + (Math.random() - 0.5) * 4,
          ship.position.y + Math.sin(trailAngle) * offset + (Math.random() - 0.5) * 4
        ),
        alpha: 0.8,
        size: 3 + Math.random() * 2
      });
    }

    while (ship.trail.length > 5) {
      ship.trail.pop();
    }

    for (let i = ship.trail.length - 1; i >= 0; i--) {
      const particle = ship.trail[i];
      particle.alpha -= 0.08;
      particle.size *= 0.92;
      if (particle.alpha <= 0 || particle.size < 0.5) {
        ship.trail.splice(i, 1);
      }
    }
  }

  private updateInvincibility(deltaTime: number): void {
    const { ship } = this.state;
    if (ship.invincible) {
      ship.invincibleTimer -= deltaTime;
      if (ship.invincibleTimer <= 0) {
        ship.invincible = false;
        ship.invincibleTimer = 0;
      }
    }
  }

  private updateAsteroids(deltaTime: number): void {
    for (let i = this.state.asteroids.length - 1; i >= 0; i--) {
      const asteroid = this.state.asteroids[i];
      asteroid.position.x += asteroid.velocity.x * deltaTime * 60;
      asteroid.position.y += asteroid.velocity.y * deltaTime * 60;
      asteroid.rotation += asteroid.rotationSpeed * deltaTime * 60;

      if (
        asteroid.position.x < -asteroid.radius * 2 ||
        asteroid.position.x > CANVAS_WIDTH + asteroid.radius * 2 ||
        asteroid.position.y < -asteroid.radius * 2 ||
        asteroid.position.y > CANVAS_HEIGHT + asteroid.radius * 2
      ) {
        this.state.asteroids.splice(i, 1);
      }
    }
  }

  private updateCrystals(deltaTime: number): void {
    for (const crystal of this.state.crystals) {
      crystal.position.x += crystal.velocity.x * deltaTime * 60;
      crystal.position.y += crystal.velocity.y * deltaTime * 60;
      crystal.rotation += (Math.PI * 2 / 1.2) * deltaTime;

      if (crystal.position.x < crystal.radius || crystal.position.x > CANVAS_WIDTH - crystal.radius) {
        crystal.velocity.x *= -1;
      }
      if (crystal.position.y < crystal.radius || crystal.position.y > CANVAS_HEIGHT - crystal.radius) {
        crystal.velocity.y *= -1;
      }
    }
  }

  private updatePortal(deltaTime: number): void {
    if (this.state.portal) {
      this.state.portal.rotation += (Math.PI * 2 / 2) * deltaTime;
    }
  }

  private updateEffects(deltaTime: number): void {
    for (let i = this.state.effects.length - 1; i >= 0; i--) {
      const effect = this.state.effects[i];
      effect.elapsed += deltaTime;
      const progress = effect.elapsed / effect.duration;

      if (progress >= 1) {
        this.state.effects.splice(i, 1);
        continue;
      }

      if (effect.type === 'collectWave') {
        effect.radius = 8 + (30 - 8) * progress;
        effect.alpha = 1 - progress;
      } else if (effect.type === 'debris') {
        effect.position.x += effect.velocity.x * deltaTime * 60;
        effect.position.y += effect.velocity.y * deltaTime * 60;
        effect.rotation += effect.rotationSpeed * deltaTime * 60;
        effect.alpha = 1 - progress;
      }
    }
  }

  private spawnEntities(deltaTime: number): void {
    this.state.asteroidSpawnTimer += deltaTime;
    if (this.state.asteroidSpawnTimer >= this.state.asteroidSpawnRate && this.state.asteroids.length < MAX_ASTEROIDS) {
      this.state.asteroids.push(createAsteroid());
      this.state.asteroidSpawnTimer = 0;
    }

    this.state.crystalSpawnTimer += deltaTime;
    if (this.state.crystalSpawnTimer >= this.state.crystalSpawnRate && this.state.crystals.length < MAX_CRYSTALS) {
      this.state.crystals.push(createCrystal());
      this.state.crystalSpawnTimer = 0;
    }

    if (this.state.energy >= ENERGY_TO_UPGRADE && !this.state.portal) {
      this.state.portal = createPortal();
    }
  }

  private buildQuadtree(): void {
    this.quadtree.clear();

    for (const asteroid of this.state.asteroids) {
      this.quadtree.insert(asteroid);
    }
    for (const crystal of this.state.crystals) {
      this.quadtree.insert(crystal);
    }
    if (this.state.portal) {
      this.quadtree.insert(this.state.portal);
    }
  }

  private checkCollisions(): void {
    this.buildQuadtree();

    const { ship } = this.state;
    const queryRange = {
      x: ship.position.x - ship.radius * 2,
      y: ship.position.y - ship.radius * 2,
      width: ship.radius * 4,
      height: ship.radius * 4
    };

    const nearbyEntities = this.quadtree.query(queryRange);

    for (const entity of nearbyEntities) {
      if (entity.type === 'crystal') {
        const crystal = entity as Crystal;
        if (checkBeamCollision(ship, crystal)) {
          this.collectCrystal(crystal);
        }
      } else if (entity.type === 'asteroid') {
        const asteroid = entity as Asteroid;
        if (!ship.invincible && checkCircleCollision(ship, asteroid)) {
          this.hitAsteroid(asteroid);
        }
      } else if (entity.type === 'portal') {
        if (checkCircleCollision(ship, entity)) {
          this.enterPortal();
        }
      }
    }
  }

  private collectCrystal(crystal: Crystal): void {
    const index = this.state.crystals.findIndex(c => c.id === crystal.id);
    if (index !== -1) {
      this.state.crystals.splice(index, 1);
      this.state.energy += 1;
      this.state.score += 10 * this.state.level;
      this.state.effects.push(createCollectWaveEffect(crystal.position, crystal.color));
    }
  }

  private hitAsteroid(asteroid: Asteroid): void {
    const { ship } = this.state;

    const asteroidIndex = this.state.asteroids.findIndex(a => a.id === asteroid.id);
    if (asteroidIndex !== -1) {
      this.state.asteroids.splice(asteroidIndex, 1);
      this.state.effects.push(...createAsteroidDebrisEffect(asteroid.position, 4 + Math.floor(Math.random() * 3)));
    }

    ship.health -= 1;
    ship.invincible = true;
    ship.invincibleTimer = INVINCIBLE_DURATION;

    if (ship.health <= 0) {
      this.state.gameOver = true;
      this.status = 'gameover';
    }
  }

  private enterPortal(): void {
    this.state.level += 1;
    this.state.energy = 0;
    this.state.portal = null;
    this.state.asteroids = [];
    this.state.crystals = [];
    this.state.whiteFlash = UPGRADE_FLASH_DURATION;
    this.state.asteroidSpawnRate *= 0.8;
    this.state.crystalSpawnRate *= 0.9;
    this.state.asteroidSpawnTimer = 0;
    this.state.crystalSpawnTimer = 0;
    this.state.score += 100 * (this.state.level - 1);

    this.state.ship.position = createVector2(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    this.state.ship.velocity = createVector2(0, 0);
    this.state.ship.trail = [];
  }

  private updateWhiteFlash(deltaTime: number): void {
    if (this.state.whiteFlash > 0) {
      this.state.whiteFlash -= deltaTime;
      if (this.state.whiteFlash < 0) {
        this.state.whiteFlash = 0;
      }
    }
  }

  private render(): void {
    this.renderer.render(this.state);
  }

  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange(this.state, this.status);
    }
  }
}
