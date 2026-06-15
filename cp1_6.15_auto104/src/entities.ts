export interface Vector2 {
  x: number;
  y: number;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type EntityType = 'ship' | 'asteroid' | 'crystal' | 'portal';

export interface Entity {
  id: number;
  position: Vector2;
  velocity: Vector2;
  radius: number;
  type: EntityType;
}

export interface TrailParticle {
  position: Vector2;
  alpha: number;
  size: number;
}

export interface Ship extends Entity {
  type: 'ship';
  angle: number;
  health: number;
  invincible: boolean;
  invincibleTimer: number;
  trail: TrailParticle[];
}

export interface Asteroid extends Entity {
  type: 'asteroid';
  vertices: Vector2[];
  rotation: number;
  rotationSpeed: number;
}

export interface Crystal extends Entity {
  type: 'crystal';
  color: string;
  rotation: number;
}

export interface Portal extends Entity {
  type: 'portal';
  rotation: number;
}

export interface CollectWaveEffect {
  type: 'collectWave';
  position: Vector2;
  color: string;
  radius: number;
  maxRadius: number;
  alpha: number;
  duration: number;
  elapsed: number;
}

export interface AsteroidDebrisEffect {
  type: 'debris';
  position: Vector2;
  velocity: Vector2;
  vertices: Vector2[];
  rotation: number;
  rotationSpeed: number;
  alpha: number;
  duration: number;
  elapsed: number;
}

export type Effect = CollectWaveEffect | AsteroidDebrisEffect;

export interface GameState {
  ship: Ship;
  asteroids: Asteroid[];
  crystals: Crystal[];
  portal: Portal | null;
  energy: number;
  level: number;
  score: number;
  gameOver: boolean;
  whiteFlash: number;
  effects: Effect[];
  asteroidSpawnRate: number;
  crystalSpawnRate: number;
  asteroidSpawnTimer: number;
  crystalSpawnTimer: number;
  stars: Star[];
  nebulaDots: NebulaDot[];
}

export interface Star {
  position: Vector2;
  radius: number;
  baseAlpha: number;
  blinkPhase: number;
  blinkSpeed: number;
}

export interface NebulaDot {
  position: Vector2;
  radius: number;
  alpha: number;
  driftSpeed: Vector2;
}

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
export const SHIP_SPEED = 2;
export const SHIP_BASE = 20;
export const SHIP_HEIGHT = 25;
export const BEAM_LENGTH = 40;
export const BEAM_WIDTH = 20;
export const CRYSTAL_RADIUS = 8;
export const CRYSTAL_COLORS = ['#ff6b6b', '#ffd93d', '#4fc3f7'];
export const ASTEROID_MIN_RADIUS = 20;
export const ASTEROID_MAX_RADIUS = 40;
export const PORTAL_WIDTH = 60;
export const PORTAL_HEIGHT = 80;
export const MAX_ASTEROIDS = 30;
export const MAX_CRYSTALS = 15;
export const ENERGY_TO_UPGRADE = 10;
export const INITIAL_HEALTH = 3;
export const INVINCIBLE_DURATION = 0.5;
export const UPGRADE_FLASH_DURATION = 0.3;

let entityIdCounter = 0;

export function createVector2(x: number, y: number): Vector2 {
  return { x, y };
}

export function createShip(): Ship {
  return {
    id: entityIdCounter++,
    type: 'ship',
    position: createVector2(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2),
    velocity: createVector2(0, 0),
    radius: Math.max(SHIP_BASE, SHIP_HEIGHT) / 2,
    angle: -Math.PI / 2,
    health: INITIAL_HEALTH,
    invincible: false,
    invincibleTimer: 0,
    trail: []
  };
}

function generateAsteroidVertices(radius: number): Vector2[] {
  const vertices: Vector2[] = [];
  const numVertices = 8 + Math.floor(Math.random() * 5);
  for (let i = 0; i < numVertices; i++) {
    const angle = (i / numVertices) * Math.PI * 2;
    const r = radius * (0.7 + Math.random() * 0.6);
    vertices.push(createVector2(Math.cos(angle) * r, Math.sin(angle) * r));
  }
  return vertices;
}

export function createAsteroid(): Asteroid {
  const radius = ASTEROID_MIN_RADIUS + Math.random() * (ASTEROID_MAX_RADIUS - ASTEROID_MIN_RADIUS);
  const edge = Math.floor(Math.random() * 4);
  let x: number, y: number;
  let angle: number;

  switch (edge) {
    case 0:
      x = Math.random() * CANVAS_WIDTH;
      y = -radius;
      angle = Math.PI / 4 + Math.random() * Math.PI / 2;
      break;
    case 1:
      x = CANVAS_WIDTH + radius;
      y = Math.random() * CANVAS_HEIGHT;
      angle = Math.PI * 3 / 4 + Math.random() * Math.PI / 2;
      break;
    case 2:
      x = Math.random() * CANVAS_WIDTH;
      y = CANVAS_HEIGHT + radius;
      angle = -Math.PI * 3 / 4 + Math.random() * Math.PI / 2;
      break;
    default:
      x = -radius;
      y = Math.random() * CANVAS_HEIGHT;
      angle = -Math.PI / 4 + Math.random() * Math.PI / 2;
  }

  const speed = 1 + Math.random();
  return {
    id: entityIdCounter++,
    type: 'asteroid',
    position: createVector2(x, y),
    velocity: createVector2(Math.cos(angle) * speed, Math.sin(angle) * speed),
    radius,
    vertices: generateAsteroidVertices(radius),
    rotation: 0,
    rotationSpeed: (Math.random() - 0.5) * 0.02
  };
}

export function createCrystal(): Crystal {
  const color = CRYSTAL_COLORS[Math.floor(Math.random() * CRYSTAL_COLORS.length)];
  return {
    id: entityIdCounter++,
    type: 'crystal',
    position: createVector2(
      50 + Math.random() * (CANVAS_WIDTH - 100),
      50 + Math.random() * (CANVAS_HEIGHT - 100)
    ),
    velocity: createVector2(
      (Math.random() - 0.5) * 0.3,
      (Math.random() - 0.5) * 0.3
    ),
    radius: CRYSTAL_RADIUS,
    color,
    rotation: 0
  };
}

export function createPortal(): Portal {
  return {
    id: entityIdCounter++,
    type: 'portal',
    position: createVector2(
      100 + Math.random() * (CANVAS_WIDTH - 200),
      100 + Math.random() * (CANVAS_HEIGHT - 200)
    ),
    velocity: createVector2(0, 0),
    radius: Math.max(PORTAL_WIDTH, PORTAL_HEIGHT) / 2,
    rotation: 0
  };
}

export function createCollectWaveEffect(position: Vector2, color: string): CollectWaveEffect {
  return {
    type: 'collectWave',
    position: { ...position },
    color,
    radius: CRYSTAL_RADIUS,
    maxRadius: 30,
    alpha: 1,
    duration: 0.4,
    elapsed: 0
  };
}

export function createAsteroidDebrisEffect(position: Vector2, count: number): AsteroidDebrisEffect[] {
  const effects: AsteroidDebrisEffect[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
    const speed = 1 + Math.random() * 2;
    const debrisSize = 5 + Math.random() * 8;
    effects.push({
      type: 'debris',
      position: { ...position },
      velocity: createVector2(Math.cos(angle) * speed, Math.sin(angle) * speed),
      vertices: generateAsteroidVertices(debrisSize),
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.1,
      alpha: 1,
      duration: 0.6,
      elapsed: 0
    });
  }
  return effects;
}

export function createStars(count: number): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      position: createVector2(Math.random() * CANVAS_WIDTH, Math.random() * CANVAS_HEIGHT),
      radius: 2 + Math.random(),
      baseAlpha: 0.5 + Math.random() * 0.5,
      blinkPhase: Math.random() * Math.PI * 2,
      blinkSpeed: (Math.PI * 2) / (2 + Math.random() * 2)
    });
  }
  return stars;
}

export function createNebulaDots(count: number): NebulaDot[] {
  const dots: NebulaDot[] = [];
  for (let i = 0; i < count; i++) {
    dots.push({
      position: createVector2(Math.random() * CANVAS_WIDTH, Math.random() * CANVAS_HEIGHT),
      radius: 0.5 + Math.random(),
      alpha: 0.2 + Math.random() * 0.6,
      driftSpeed: createVector2((Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2)
    });
  }
  return dots;
}

export class Quadtree {
  private bounds: Rectangle;
  private capacity: number;
  private objects: Entity[];
  private divided: boolean;
  private northwest?: Quadtree;
  private northeast?: Quadtree;
  private southwest?: Quadtree;
  private southeast?: Quadtree;

  constructor(bounds: Rectangle, capacity: number = 4) {
    this.bounds = bounds;
    this.capacity = capacity;
    this.objects = [];
    this.divided = false;
  }

  clear(): void {
    this.objects = [];
    this.divided = false;
    this.northwest = undefined;
    this.northeast = undefined;
    this.southwest = undefined;
    this.southeast = undefined;
  }

  private subdivide(): void {
    const { x, y, width, height } = this.bounds;
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    this.northwest = new Quadtree({ x, y, width: halfWidth, height: halfHeight }, this.capacity);
    this.northeast = new Quadtree({ x: x + halfWidth, y, width: halfWidth, height: halfHeight }, this.capacity);
    this.southwest = new Quadtree({ x, y: y + halfHeight, width: halfWidth, height: halfHeight }, this.capacity);
    this.southeast = new Quadtree({ x: x + halfWidth, y: y + halfHeight, width: halfWidth, height: halfHeight }, this.capacity);

    this.divided = true;
  }

  private contains(entity: Entity): boolean {
    const { position, radius } = entity;
    return (
      position.x + radius >= this.bounds.x &&
      position.x - radius <= this.bounds.x + this.bounds.width &&
      position.y + radius >= this.bounds.y &&
      position.y - radius <= this.bounds.y + this.bounds.height
    );
  }

  insert(entity: Entity): boolean {
    if (!this.contains(entity)) {
      return false;
    }

    if (this.objects.length < this.capacity) {
      this.objects.push(entity);
      return true;
    }

    if (!this.divided) {
      this.subdivide();
    }

    return (
      this.northwest!.insert(entity) ||
      this.northeast!.insert(entity) ||
      this.southwest!.insert(entity) ||
      this.southeast!.insert(entity)
    );
  }

  query(range: Rectangle, found: Entity[] = []): Entity[] {
    if (!this.intersects(range)) {
      return found;
    }

    for (const obj of this.objects) {
      if (this.isInRange(obj, range)) {
        found.push(obj);
      }
    }

    if (this.divided) {
      this.northwest!.query(range, found);
      this.northeast!.query(range, found);
      this.southwest!.query(range, found);
      this.southeast!.query(range, found);
    }

    return found;
  }

  private intersects(range: Rectangle): boolean {
    return !(
      range.x + range.width < this.bounds.x ||
      range.x > this.bounds.x + this.bounds.width ||
      range.y + range.height < this.bounds.y ||
      range.y > this.bounds.y + this.bounds.height
    );
  }

  private isInRange(entity: Entity, range: Rectangle): boolean {
    const { position, radius } = entity;
    return (
      position.x + radius >= range.x &&
      position.x - radius <= range.x + range.width &&
      position.y + radius >= range.y &&
      position.y - radius <= range.y + range.height
    );
  }
}

export function checkCircleCollision(a: Entity, b: Entity): boolean {
  const dx = a.position.x - b.position.x;
  const dy = a.position.y - b.position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < a.radius + b.radius;
}

export function getShipBeamTriangle(ship: Ship): Vector2[] {
  const { position, angle } = ship;
  const tipX = position.x + Math.cos(angle) * BEAM_LENGTH;
  const tipY = position.y + Math.sin(angle) * BEAM_LENGTH;
  const perpAngle = angle + Math.PI / 2;
  const halfWidth = BEAM_WIDTH / 2;
  return [
    position,
    createVector2(tipX + Math.cos(perpAngle) * halfWidth, tipY + Math.sin(perpAngle) * halfWidth),
    createVector2(tipX - Math.cos(perpAngle) * halfWidth, tipY - Math.sin(perpAngle) * halfWidth)
  ];
}

export function pointInTriangle(point: Vector2, triangle: Vector2[]): boolean {
  const [p0, p1, p2] = triangle;
  const area = 0.5 * (-p1.y * p2.x + p0.y * (-p1.x + p2.x) + p0.x * (p1.y - p2.y) + p1.x * p2.y);
  const sign = area < 0 ? -1 : 1;
  const s = (p0.y * p2.x - p0.x * p2.y + (p2.y - p0.y) * point.x + (p0.x - p2.x) * point.y) * sign;
  const t = (p0.x * p1.y - p0.y * p1.x + (p0.y - p1.y) * point.x + (p1.x - p0.x) * point.y) * sign;
  return s > 0 && t > 0 && (s + t) < 2 * area * sign;
}

export function checkBeamCollision(ship: Ship, crystal: Crystal): boolean {
  const triangle = getShipBeamTriangle(ship);
  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const point = createVector2(
      crystal.position.x + (i % 2 === 0 ? crystal.radius : -crystal.radius) * 0.5,
      crystal.position.y + (i % 3 === 0 ? crystal.radius : -crystal.radius) * 0.5
    );
    if (pointInTriangle(point, triangle)) {
      return true;
    }
  }
  return pointInTriangle(crystal.position, triangle);
}
