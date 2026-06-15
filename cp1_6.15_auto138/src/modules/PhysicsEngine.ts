export interface Vector2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PhysicsBody extends Rect {
  vx: number;
  vy: number;
  onGround: boolean;
  jumpCount: number;
  maxJumps: number;
}

export interface Platform extends Rect {
  type: 'fixed' | 'moving';
  color: string;
}

export interface MovingPlatform extends Platform {
  speed: number;
  range: number;
  direction: number;
  startX: number;
}

export interface Gear {
  x: number;
  y: number;
  radius: number;
  rotationSpeed: number;
  rotation: number;
  color: string;
}

export interface Spring extends Rect {
  springConstant: number;
  bounceBoost: number;
  color: string;
  compressed: boolean;
  compressTimer: number;
  originalHeight: number;
}

export interface Laser extends Rect {
  color: string;
}

export interface Key extends Rect {
  id: string;
  color: string;
  collected: boolean;
}

export interface Door extends Rect {
  color: string;
  openColor: string;
  isOpen: boolean;
}

export interface PhysicsInput {
  left: boolean;
  right: boolean;
  jump: boolean;
  jumpPressed: boolean;
}

export interface CollisionEvent {
  type: 'gear' | 'spring' | 'laser' | 'key' | 'door' | 'ground';
  data?: unknown;
}

export interface PhysicsState {
  player: PhysicsBody;
  platforms: Platform[];
  movingPlatforms: MovingPlatform[];
  gears: Gear[];
  springs: Spring[];
  lasers: Laser[];
  keys: Key[];
  doors: Door[];
  events: CollisionEvent[];
}

const GRAVITY = 980;
const FRICTION = 0.3;
const MOVE_SPEED = 300;
const JUMP_VELOCITY = 500;
const MAX_JUMPS = 2;

export class PhysicsEngine {
  private state: PhysicsState;

  constructor(initialState: PhysicsState) {
    this.state = JSON.parse(JSON.stringify(initialState));
  }

  public update(dt: number, input: PhysicsInput): PhysicsState {
    const player = this.state.player;
    const events: CollisionEvent[] = [];

    if (input.left) {
      player.vx = -MOVE_SPEED;
    } else if (input.right) {
      player.vx = MOVE_SPEED;
    } else {
      player.vx *= 1 - FRICTION;
      if (Math.abs(player.vx) < 1) player.vx = 0;
    }

    if (input.jumpPressed && player.jumpCount < player.maxJumps) {
      player.vy = -JUMP_VELOCITY;
      player.jumpCount++;
      events.push({ type: 'ground' });
    }

    player.vy += GRAVITY * dt;

    this.updateMovingPlatforms(dt);
    this.updateGears(dt);
    this.updateSprings(dt);

    player.x += player.vx * dt;
    this.handleHorizontalCollisions(player, events);

    player.y += player.vy * dt;
    this.handleVerticalCollisions(player, events);

    this.handleBounds(player);

    this.checkGearCollisions(player, events);
    this.checkSpringCollisions(player, events);
    this.checkLaserCollisions(player, events);
    this.checkKeyCollisions(player, events);
    this.checkDoorCollisions(player, events);

    this.state.events = events;
    return this.state;
  }

  private updateMovingPlatforms(dt: number): void {
    for (const platform of this.state.movingPlatforms) {
      platform.x += platform.speed * platform.direction * dt;
      if (platform.x > platform.startX + platform.range) {
        platform.direction = -1;
      } else if (platform.x < platform.startX - platform.range) {
        platform.direction = 1;
      }
    }
  }

  private updateGears(dt: number): void {
    for (const gear of this.state.gears) {
      gear.rotation += gear.rotationSpeed * dt;
    }
  }

  private updateSprings(dt: number): void {
    for (const spring of this.state.springs) {
      if (spring.compressed) {
        spring.compressTimer -= dt;
        const compressProgress = 1 - spring.compressTimer / 0.1;
        if (compressProgress <= 0.5) {
          spring.height = spring.originalHeight * (1 - 0.7 * (compressProgress * 2));
        } else {
          spring.height = spring.originalHeight * (0.3 + 0.7 * ((compressProgress - 0.5) * 2));
        }
        if (spring.compressTimer <= 0) {
          spring.compressed = false;
          spring.height = spring.originalHeight;
        }
      }
    }
  }

  private handleHorizontalCollisions(player: PhysicsBody, events: CollisionEvent[]): void {
    const allPlatforms = [...this.state.platforms, ...this.state.movingPlatforms];
    for (const platform of allPlatforms) {
      if (this.rectIntersect(player, platform)) {
        if (player.vx > 0) {
          player.x = platform.x - player.width;
        } else if (player.vx < 0) {
          player.x = platform.x + platform.width;
        }
        player.vx = 0;
      }
    }
  }

  private handleVerticalCollisions(player: PhysicsBody, events: CollisionEvent[]): void {
    player.onGround = false;
    const allPlatforms = [...this.state.platforms, ...this.state.movingPlatforms];
    for (const platform of allPlatforms) {
      if (this.rectIntersect(player, platform)) {
        if (player.vy > 0) {
          player.y = platform.y - player.height;
          player.vy = 0;
          player.onGround = true;
          player.jumpCount = 0;
          if ('startX' in platform) {
            player.x += platform.speed * platform.direction * (1 / 60);
          }
        } else if (player.vy < 0) {
          player.y = platform.y + platform.height;
          player.vy = 0;
        }
      }
    }
  }

  private handleBounds(player: PhysicsBody): void {
    if (player.x < 0) player.x = 0;
    if (player.x > 960 - player.width) player.x = 960 - player.width;
    if (player.y > 540) {
      player.y = 400;
      player.x = 50;
      player.vx = 0;
      player.vy = 0;
    }
  }

  private checkGearCollisions(player: PhysicsBody, events: CollisionEvent[]): void {
    for (const gear of this.state.gears) {
      const closestX = Math.max(player.x, Math.min(gear.x, player.x + player.width));
      const closestY = Math.max(player.y, Math.min(gear.y, player.y + player.height));
      const dx = gear.x - closestX;
      const dy = gear.y - closestY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < gear.radius) {
        const overlap = gear.radius - distance;
        const nx = dx / (distance || 1);
        const ny = dy / (distance || 1);
        player.x -= nx * overlap;
        player.y -= ny * overlap;
        player.vx = nx * 400;
        player.vy = ny * 300 - 200;
        events.push({ type: 'gear' });
      }
    }
  }

  private checkSpringCollisions(player: PhysicsBody, events: CollisionEvent[]): void {
    for (const spring of this.state.springs) {
      if (this.rectIntersect(player, spring) && player.vy > 0) {
        if (!spring.compressed) {
          spring.compressed = true;
          spring.compressTimer = 0.1;
          player.vy = -JUMP_VELOCITY * spring.bounceBoost;
          player.jumpCount = 0;
          events.push({ type: 'spring' });
        }
      }
    }
  }

  private checkLaserCollisions(player: PhysicsBody, events: CollisionEvent[]): void {
    for (const laser of this.state.lasers) {
      if (this.rectIntersect(player, laser)) {
        events.push({ type: 'laser' });
      }
    }
  }

  private checkKeyCollisions(player: PhysicsBody, events: CollisionEvent[]): void {
    for (const key of this.state.keys) {
      if (!key.collected && this.rectIntersect(player, key)) {
        key.collected = true;
        events.push({ type: 'key', data: key.id });
        const allCollected = this.state.keys.every(k => k.collected);
        if (allCollected) {
          for (const door of this.state.doors) {
            door.isOpen = true;
          }
        }
      }
    }
  }

  private checkDoorCollisions(player: PhysicsBody, events: CollisionEvent[]): void {
    for (const door of this.state.doors) {
      if (door.isOpen && this.rectIntersect(player, door)) {
        events.push({ type: 'door' });
      }
    }
  }

  private rectIntersect(a: Rect, b: Rect): boolean {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  public getState(): PhysicsState {
    return this.state;
  }

  public resetPlayer(x: number, y: number): void {
    this.state.player.x = x;
    this.state.player.y = y;
    this.state.player.vx = 0;
    this.state.player.vy = 0;
    this.state.player.jumpCount = 0;
  }

  public resetKeys(): void {
    for (const key of this.state.keys) {
      key.collected = false;
    }
    for (const door of this.state.doors) {
      door.isOpen = false;
    }
  }
}
