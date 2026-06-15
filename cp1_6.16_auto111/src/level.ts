import type { Phantom } from './phantom_recorder';
import type { Particle } from './renderer';

export interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Wall {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PressurePlate {
  x: number;
  y: number;
  width: number;
  height: number;
  size: number;
  pressed: boolean;
  pressAnim: number;
  bridgeIndex: number;
}

export interface LightningBridge {
  x: number;
  y: number;
  width: number;
  height: number;
  active: boolean;
  plateIndices: number[];
}

export interface TimeCrystal {
  x: number;
  y: number;
  width: number;
  height: number;
  size: number;
  activated: boolean;
  anchorX: number;
  anchorY: number;
}

export interface SpikeTrap {
  x: number;
  y: number;
  width: number;
  height: number;
  extended: boolean;
  extendAnim: number;
  timer: number;
  nextExtend: number;
}

export interface Goal {
  x: number;
  y: number;
  radius: number;
  rotation: number;
  scale: number;
}

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  onGround: boolean;
  facingRight: boolean;
  alive: boolean;
}

export interface LevelData {
  platforms: Platform[];
  walls: Wall[];
  pressurePlates: PressurePlate[];
  lightningBridges: LightningBridge[];
  timeCrystals: TimeCrystal[];
  spikes: SpikeTrap[];
  goal: Goal;
  playerStart: { x: number; y: number };
}

export class Level {
  private data: LevelData;
  private electricParticles: Particle[] = [];
  private particleTimer: number = 0;
  private readonly CANVAS_WIDTH = 800;
  private readonly CANVAS_HEIGHT = 600;
  private readonly GRAVITY = 0.5;
  private readonly MOVE_SPEED = 3;
  private readonly JUMP_FORCE = -10;

  constructor() {
    this.data = this.createLevelData();
  }

  private createLevelData(): LevelData {
    return {
      platforms: [
        { x: 0, y: 200, width: 250, height: 20 },
        { x: 350, y: 200, width: 150, height: 20 },
        { x: 600, y: 200, width: 200, height: 20 },
        { x: 0, y: 400, width: 800, height: 20 },
        { x: 0, y: 580, width: 800, height: 20 },
      ],
      walls: [
        { x: 0, y: 0, width: 10, height: 600 },
        { x: 790, y: 0, width: 10, height: 600 },
      ],
      pressurePlates: [
        { x: 100, y: 168, width: 32, height: 32, size: 32, pressed: false, pressAnim: 0, bridgeIndex: 0 },
        { x: 400, y: 168, width: 32, height: 32, size: 32, pressed: false, pressAnim: 0, bridgeIndex: 0 },
        { x: 200, y: 368, width: 32, height: 32, size: 32, pressed: false, pressAnim: 0, bridgeIndex: 1 },
        { x: 500, y: 368, width: 32, height: 32, size: 32, pressed: false, pressAnim: 0, bridgeIndex: 1 },
      ],
      lightningBridges: [
        { x: 250, y: 206, width: 100, height: 8, active: false, plateIndices: [0, 1] },
        { x: 300, y: 406, width: 100, height: 8, active: false, plateIndices: [2, 3] },
      ],
      timeCrystals: [
        { x: 700, y: 336, width: 32, height: 32, size: 32, activated: false, anchorX: 700, anchorY: 336 },
      ],
      spikes: [
        { x: 400, y: 560, width: 120, height: 20, extended: false, extendAnim: 0, timer: 0, nextExtend: 2000 },
      ],
      goal: { x: 700, y: 550, radius: 15, rotation: 0, scale: 0 },
      playerStart: { x: 50, y: 160 }
    };
  }

  getLevelData(): LevelData {
    return this.data;
  }

  getElectricParticles(): Particle[] {
    return this.electricParticles;
  }

  update(dt: number, timestamp: number, player: PlayerState, phantoms: Phantom[], input: { jump: boolean; left: boolean; right: boolean }): {
    playerDied: boolean;
    crystalActivated: { x: number; y: number } | null;
    goalReached: boolean;
    phantomDestroyed: number | null;
  } {
    let playerDied = false;
    let crystalActivated: { x: number; y: number } | null = null;
    let goalReached = false;
    let phantomDestroyed: number | null = null;

    if (player.alive && !this.isRewinding) {
      if (input.left) {
        player.vx = -this.MOVE_SPEED;
        player.facingRight = false;
      } else if (input.right) {
        player.vx = this.MOVE_SPEED;
        player.facingRight = true;
      } else {
        player.vx *= 0.8;
      }
      if (input.jump && player.onGround) {
        player.vy = this.JUMP_FORCE;
        player.onGround = false;
      }
      player.vy += this.GRAVITY;
      if (player.vy > 15) player.vy = 15;
      player.x += player.vx;
      this.resolveHorizontalCollision(player);
      player.y += player.vy;
      player.onGround = false;
      this.resolveVerticalCollision(player);
    }

    for (const plate of this.data.pressurePlates) {
      plate.pressed = false;
      if (this.checkCollision(player, plate)) {
        plate.pressed = true;
      }
      for (const phantom of phantoms) {
        if (this.checkCollision(phantom, plate)) {
          plate.pressed = true;
        }
      }
      if (plate.pressed && plate.pressAnim < 1) {
        plate.pressAnim = Math.min(1, plate.pressAnim + dt / 150);
      } else if (!plate.pressed && plate.pressAnim > 0) {
        plate.pressAnim = Math.max(0, plate.pressAnim - dt / 150);
      }
    }

    for (const bridge of this.data.lightningBridges) {
      bridge.active = bridge.plateIndices.some(i => this.data.pressurePlates[i].pressed);
    }

    this.particleTimer += dt;
    if (this.particleTimer >= 50) {
      this.particleTimer = 0;
      for (const bridge of this.data.lightningBridges) {
        if (bridge.active) {
          for (let i = 0; i < 2; i++) {
            const dir = i === 0 ? -1 : 1;
            this.electricParticles.push({
              x: bridge.x + Math.random() * bridge.width,
              y: bridge.y + Math.random() * bridge.height,
              vx: dir * (1 + Math.random() * 2),
              vy: 0,
              life: 500,
              maxLife: 500,
              color: '#00FFFF',
              size: 2 + Math.random() * 2
            });
          }
        }
      }
    }

    for (let i = this.electricParticles.length - 1; i >= 0; i--) {
      const p = this.electricParticles[i];
      p.x += p.vx;
      p.life -= dt;
      if (p.life <= 0) {
        this.electricParticles.splice(i, 1);
      }
    }

    for (const crystal of this.data.timeCrystals) {
      if (!crystal.activated && this.checkCollision(player, crystal)) {
        crystal.activated = true;
        crystalActivated = { x: crystal.x + crystal.size / 2, y: crystal.y + crystal.size / 2 };
      }
    }

    for (const spike of this.data.spikes) {
      spike.timer += dt;
      if (spike.timer >= spike.nextExtend) {
        spike.extended = !spike.extended;
        spike.timer = 0;
        spike.nextExtend = spike.extended ? 1000 : (1500 + Math.random() * 1000);
      }
      if (spike.extended && spike.extendAnim < 1) {
        spike.extendAnim = Math.min(1, spike.extendAnim + dt / 200);
      } else if (!spike.extended && spike.extendAnim > 0) {
        spike.extendAnim = Math.max(0, spike.extendAnim - dt / 200);
      }
      if (spike.extendAnim >= 0.8 && player.alive) {
        if (this.checkSpikeCollision(player, spike)) {
          playerDied = true;
        }
      }
      if (spike.extendAnim >= 0.8) {
        for (const phantom of phantoms) {
          if (this.checkSpikeCollision(phantom, spike)) {
            phantomDestroyed = phantom.id;
          }
        }
      }
    }

    if (player.alive && this.checkGoalCollision(player)) {
      goalReached = true;
    }

    this.data.goal.rotation += dt * 0.003;
    if (this.data.goal.scale < 1) {
      this.data.goal.scale = Math.min(1, this.data.goal.scale + dt * 0.002);
    }
    this.data.goal.scale = 0.9 + Math.sin(timestamp * 0.003) * 0.1;

    return { playerDied, crystalActivated, goalReached, phantomDestroyed };
  }

  private resolveHorizontalCollision(player: PlayerState): void {
    for (const platform of this.data.platforms) {
      if (this.checkCollision(player, platform)) {
        if (player.vx > 0) {
          player.x = platform.x - player.width;
        } else if (player.vx < 0) {
          player.x = platform.x + platform.width;
        }
        player.vx = 0;
      }
    }
    for (const wall of this.data.walls) {
      if (this.checkCollision(player, wall)) {
        if (player.vx > 0) {
          player.x = wall.x - player.width;
        } else if (player.vx < 0) {
          player.x = wall.x + wall.width;
        }
        player.vx = 0;
      }
    }
    for (const bridge of this.data.lightningBridges) {
      if (bridge.active && this.checkCollision(player, bridge)) {
        if (player.vx > 0) {
          player.x = bridge.x - player.width;
        } else if (player.vx < 0) {
          player.x = bridge.x + bridge.width;
        }
        player.vx = 0;
      }
    }
  }

  private resolveVerticalCollision(player: PlayerState): void {
    for (const platform of this.data.platforms) {
      if (this.checkCollision(player, platform)) {
        if (player.vy > 0) {
          player.y = platform.y - player.height;
          player.onGround = true;
        } else if (player.vy < 0) {
          player.y = platform.y + platform.height;
        }
        player.vy = 0;
      }
    }
    for (const bridge of this.data.lightningBridges) {
      if (bridge.active && this.checkCollision(player, bridge)) {
        if (player.vy > 0) {
          player.y = bridge.y - player.height;
          player.onGround = true;
        } else if (player.vy < 0) {
          player.y = bridge.y + bridge.height;
        }
        player.vy = 0;
      }
    }
  }

  private checkCollision(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }): boolean {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
  }

  private checkSpikeCollision(entity: { x: number; y: number; width: number; height: number }, spike: SpikeTrap): boolean {
    const hitbox = {
      x: spike.x + 2,
      y: spike.y + spike.height * (1 - spike.extendAnim) + 2,
      width: spike.width - 4,
      height: spike.height * spike.extendAnim - 4
    };
    return this.checkCollision(entity, hitbox);
  }

  private checkGoalCollision(player: PlayerState): boolean {
    const cx = player.x + player.width / 2;
    const cy = player.y + player.height / 2;
    const dx = cx - this.data.goal.x;
    const dy = cy - this.data.goal.y;
    return Math.sqrt(dx * dx + dy * dy) < this.data.goal.radius + 10;
  }

  getLastAnchor(): { x: number; y: number } | null {
    for (let i = this.data.timeCrystals.length - 1; i >= 0; i--) {
      if (this.data.timeCrystals[i].activated) {
        return {
          x: this.data.timeCrystals[i].anchorX,
          y: this.data.timeCrystals[i].anchorY
        };
      }
    }
    return null;
  }

  reset(): void {
    this.data = this.createLevelData();
    this.electricParticles = [];
    this.particleTimer = 0;
  }

  setIsRewinding(value: boolean): void {
    this.isRewinding = value;
  }

  private isRewinding: boolean = false;
}
