import Phaser from 'phaser';
import type { StarMapData, PlanetData, CrystalData } from './StarGenerator';

export interface StormData {
  id: string;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  growthRate: number;
  active: boolean;
}

export interface ShipState {
  x: number;
  y: number;
  angle: number;
  velocity: { x: number; y: number };
  speed: number;
  inStorm: boolean;
}

interface SpatialGridCell {
  crystals: CrystalData[];
  planets: PlanetData[];
}

export class PhysicsSystem {
  private scene: Phaser.Scene;
  private starMap: StarMapData | null = null;
  private ship: ShipState;
  private storms: StormData[] = [];
  private spatialGrid: Map<string, SpatialGridCell> = new Map();
  private gridCellSize: number = 50;
  private viewportWidth: number;
  private viewportHeight: number;
  private stormTimer: number = 0;
  private nextStormDelay: number = 0;

  public onCrystalCollected: ((crystal: CrystalData) => void) | null = null;
  public onStormDamage: (() => void) | null = null;
  public onCrystalDestroyed: ((crystal: CrystalData) => void) | null = null;
  public onStormStarted: (() => void) | null = null;

  constructor(scene: Phaser.Scene, width: number = 640, height: number = 480) {
    this.scene = scene;
    this.viewportWidth = width;
    this.viewportHeight = height;

    this.ship = {
      x: width / 2,
      y: height / 2,
      angle: -Math.PI / 2,
      velocity: { x: 0, y: 0 },
      speed: 4,
      inStorm: false
    };

    this.scheduleNextStorm();
  }

  public setStarMap(data: StarMapData): void {
    this.starMap = data;
    this.buildSpatialGrid();
  }

  private buildSpatialGrid(): void {
    this.spatialGrid.clear();

    if (!this.starMap) return;

    for (const planet of this.starMap.planets) {
      const cellKey = this.getCellKey(planet.x, planet.y);
      if (!this.spatialGrid.has(cellKey)) {
        this.spatialGrid.set(cellKey, { crystals: [], planets: [] });
      }
      this.spatialGrid.get(cellKey)!.planets.push(planet);
    }

    for (const crystal of this.starMap.crystals) {
      if (crystal.collected) continue;
      const cellKey = this.getCellKey(crystal.x, crystal.y);
      if (!this.spatialGrid.has(cellKey)) {
        this.spatialGrid.set(cellKey, { crystals: [], planets: [] });
      }
      this.spatialGrid.get(cellKey)!.crystals.push(crystal);
    }
  }

  private getCellKey(x: number, y: number): string {
    const cellX = Math.floor(x / this.gridCellSize);
    const cellY = Math.floor(y / this.gridCellSize);
    return `${cellX},${cellY}`;
  }

  private getNearbyCells(x: number, y: number, radius: number = 1): string[] {
    const cells: string[] = [];
    const centerCellX = Math.floor(x / this.gridCellSize);
    const centerCellY = Math.floor(y / this.gridCellSize);

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        cells.push(`${centerCellX + dx},${centerCellY + dy}`);
      }
    }

    return cells;
  }

  public update(delta: number, input: { up: boolean; down: boolean; left: boolean; right: boolean }): void {
    this.updateShip(delta, input);
    this.updatePlanets(delta);
    this.updateStorms(delta);
    this.checkCollisions();
    this.updateStormTimer(delta);
    this.updateCrystalPulses(delta);
  }

  private updateShip(delta: number, input: { up: boolean; down: boolean; left: boolean; right: boolean }): void {
    const acceleration = 0.3;
    const friction = 0.98;
    const maxSpeed = this.ship.speed;

    if (input.up) this.ship.velocity.y -= acceleration;
    if (input.down) this.ship.velocity.y += acceleration;
    if (input.left) this.ship.velocity.x -= acceleration;
    if (input.right) this.ship.velocity.x += acceleration;

    const speed = Math.sqrt(
      this.ship.velocity.x * this.ship.velocity.x +
      this.ship.velocity.y * this.ship.velocity.y
    );

    if (speed > maxSpeed) {
      this.ship.velocity.x = (this.ship.velocity.x / speed) * maxSpeed;
      this.ship.velocity.y = (this.ship.velocity.y / speed) * maxSpeed;
    }

    this.ship.velocity.x *= friction;
    this.ship.velocity.y *= friction;

    if (this.starMap) {
      for (const planet of this.starMap.planets) {
        const dx = planet.x - this.ship.x;
        const dy = planet.y - this.ship.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < planet.gravityRadius && dist > planet.radius) {
          const gravityStrength = 0.02 * (1 - dist / planet.gravityRadius);
          this.ship.velocity.x += (dx / dist) * gravityStrength * delta * 0.06;
          this.ship.velocity.y += (dy / dist) * gravityStrength * delta * 0.06;
          this.ship.velocity.x *= 0.99;
          this.ship.velocity.y *= 0.99;
        }
      }
    }

    this.ship.x += this.ship.velocity.x * delta * 0.06;
    this.ship.y += this.ship.velocity.y * delta * 0.06;

    this.ship.x = Math.max(16, Math.min(this.viewportWidth - 16, this.ship.x));
    this.ship.y = Math.max(16, Math.min(this.viewportHeight - 16, this.ship.y));

    if (Math.abs(this.ship.velocity.x) > 0.1 || Math.abs(this.ship.velocity.y) > 0.1) {
      this.ship.angle = Math.atan2(this.ship.velocity.y, this.ship.velocity.x);
    }
  }

  private updatePlanets(delta: number): void {
    if (!this.starMap) return;

    for (const planet of this.starMap.planets) {
      if (planet.orbitRadius > 0) {
        planet.orbitAngle += planet.orbitSpeed * delta * 0.06;
        const centerX = planet.x - Math.cos(planet.orbitAngle - planet.orbitSpeed * delta * 0.06) * planet.orbitRadius;
        const centerY = planet.y - Math.sin(planet.orbitAngle - planet.orbitSpeed * delta * 0.06) * planet.orbitRadius;
        planet.x = centerX + Math.cos(planet.orbitAngle) * planet.orbitRadius;
        planet.y = centerY + Math.sin(planet.orbitAngle) * planet.orbitRadius;
      }
    }

    this.buildSpatialGrid();
  }

  private updateStorms(delta: number): void {
    for (let i = this.storms.length - 1; i >= 0; i--) {
      const storm = this.storms[i];
      if (!storm.active) continue;

      if (storm.radius < storm.maxRadius) {
        storm.radius += storm.growthRate * delta * 0.06;
        if (storm.radius >= storm.maxRadius) {
          storm.radius = storm.maxRadius;
        }
      }

      this.checkStormCrystalCollisions(storm);
    }
  }

  private updateStormTimer(delta: number): void {
    this.stormTimer += delta;

    if (this.stormTimer >= this.nextStormDelay) {
      this.spawnStorm();
      this.scheduleNextStorm();
    }
  }

  private scheduleNextStorm(): void {
    this.stormTimer = 0;
    this.nextStormDelay = (20 + Math.random() * 10) * 1000;
  }

  private spawnStorm(): void {
    const side = Math.floor(Math.random() * 4);
    let x: number, y: number;

    switch (side) {
      case 0:
        x = Math.random() * this.viewportWidth;
        y = 10;
        break;
      case 1:
        x = Math.random() * this.viewportWidth;
        y = this.viewportHeight - 10;
        break;
      case 2:
        x = 10;
        y = Math.random() * this.viewportHeight;
        break;
      default:
        x = this.viewportWidth - 10;
        y = Math.random() * this.viewportHeight;
        break;
    }

    const storm: StormData = {
      id: `storm_${Date.now()}_${Math.random()}`,
      x,
      y,
      radius: 10,
      maxRadius: 200,
      growthRate: (200 - 10) / (5 * 60),
      active: true
    };

    this.storms.push(storm);

    if (this.onStormStarted) {
      this.onStormStarted();
    }
  }

  private checkCollisions(): void {
    if (!this.starMap) return;

    this.ship.inStorm = false;

    for (const storm of this.storms) {
      if (!storm.active) continue;
      const dx = storm.x - this.ship.x;
      const dy = storm.y - this.ship.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < storm.radius) {
        this.ship.inStorm = true;
        if (this.onStormDamage) {
          this.onStormDamage();
        }
      }
    }

    const nearbyCells = this.getNearbyCells(this.ship.x, this.ship.y, 1);

    for (const cellKey of nearbyCells) {
      const cell = this.spatialGrid.get(cellKey);
      if (!cell) continue;

      for (const crystal of cell.crystals) {
        if (crystal.collected) continue;

        const dx = crystal.x - this.ship.x;
        const dy = crystal.y - this.ship.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 25) {
          crystal.collected = true;
          if (this.onCrystalCollected) {
            this.onCrystalCollected(crystal);
          }
        }
      }
    }
  }

  private checkStormCrystalCollisions(storm: StormData): void {
    if (!this.starMap) return;

    const nearbyCells = this.getNearbyCells(storm.x, storm.y, Math.ceil(storm.maxRadius / this.gridCellSize));

    for (const cellKey of nearbyCells) {
      const cell = this.spatialGrid.get(cellKey);
      if (!cell) continue;

      for (const crystal of cell.crystals) {
        if (crystal.collected) continue;

        const dx = crystal.x - storm.x;
        const dy = crystal.y - storm.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < storm.radius) {
          crystal.collected = true;
          if (this.onCrystalDestroyed) {
            this.onCrystalDestroyed(crystal);
          }
        }
      }
    }
  }

  private updateCrystalPulses(delta: number): void {
    if (!this.starMap) return;

    for (const crystal of this.starMap.crystals) {
      crystal.pulsePhase += delta * 0.004;
    }
  }

  public getShip(): ShipState {
    return { ...this.ship };
  }

  public getStorms(): StormData[] {
    return [...this.storms];
  }

  public resize(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
  }

  public reset(): void {
    this.ship = {
      x: this.viewportWidth / 2,
      y: this.viewportHeight / 2,
      angle: -Math.PI / 2,
      velocity: { x: 0, y: 0 },
      speed: 4,
      inStorm: false
    };
    this.storms = [];
    this.stormTimer = 0;
    this.scheduleNextStorm();
  }
}
