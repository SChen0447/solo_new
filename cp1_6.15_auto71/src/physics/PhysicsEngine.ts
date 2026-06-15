import Matter from 'matter-js';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const GROUND_HEIGHT = 20;
const IMPACT_THRESHOLD = 5;
const SETTLE_SPEED_THRESHOLD = 0.5;
const SETTLE_TIME_THRESHOLD = 2000;
const MAX_FRAGMENTS = 150;

export interface BrickMetadata {
  id: string;
  color: string;
  isSettled: boolean;
  settleStartTime: number | null;
  isBroken: boolean;
  alpha: number;
  createdAt: number;
}

export interface CollisionEvent {
  brick: Matter.Body;
  impactForce: number;
  collisionNormal: { x: number; y: number };
}

type OnBrickBreakCallback = (event: CollisionEvent) => void;
type OnAllSettledCallback = () => void;

export class PhysicsEngine {
  private engine: Matter.Engine;
  private world: Matter.World;
  private runner: Matter.Runner | null = null;
  private bricks: Map<string, Matter.Body> = new Map();
  private brickMetadata: Map<string, BrickMetadata> = new Map();
  private settledBricksQueue: string[] = [];
  private ground: Matter.Body | null = null;
  private ball: Matter.Body | null = null;
  private onBrickBreakCallback: OnBrickBreakCallback | null = null;
  private onAllSettledCallback: OnAllSettledCallback | null = null;
  private lastUpdateTime: number = 0;
  private isRunning: boolean = false;

  constructor() {
    this.engine = Matter.Engine.create({
      gravity: { x: 0, y: 1 },
    });
    this.world = this.engine.world;
    this.setupCollisionDetection();
  }

  init(): void {
    this.createGround();
    this.startRunner();
    this.isRunning = true;
  }

  private createGround(): void {
    this.ground = Matter.Bodies.rectangle(
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT - GROUND_HEIGHT / 2,
      CANVAS_WIDTH,
      GROUND_HEIGHT,
      {
        isStatic: true,
        label: 'ground',
        render: {
          fillStyle: '#4a2c2a',
        },
      }
    );
    Matter.Composite.add(this.world, this.ground);
  }

  private setupCollisionDetection(): void {
    Matter.Events.on(this.engine, 'collisionStart', (event) => {
      const pairs = event.pairs;
      
      for (const pair of pairs) {
        const { bodyA, bodyB } = pair;
        
        const brick = this.getBrickFromCollision(bodyA, bodyB);
        if (!brick || !this.ball) continue;
        
        const impactForce = this.calculateImpactForce(pair);
        if (impactForce < IMPACT_THRESHOLD) continue;
        
        const metadata = this.brickMetadata.get(brick.label);
        if (!metadata || metadata.isBroken || metadata.isSettled) continue;
        
        const collisionNormal = this.getCollisionNormal(pair, brick);
        
        metadata.isBroken = true;
        
        this.applyBreakVelocity(brick, collisionNormal, impactForce);
        
        if (this.onBrickBreakCallback) {
          this.onBrickBreakCallback({
            brick,
            impactForce,
            collisionNormal,
          });
        }
      }
    });
  }

  private getBrickFromCollision(bodyA: Matter.Body, bodyB: Matter.Body): Matter.Body | null {
    if (bodyA.label.startsWith('brick_') && this.bricks.has(bodyA.label)) {
      return bodyA;
    }
    if (bodyB.label.startsWith('brick_') && this.bricks.has(bodyB.label)) {
      return bodyB;
    }
    return null;
  }

  private calculateImpactForce(pair: Matter.Pair): number {
    const totalImpulse = pair.collision.totalImpulse;
    if (!totalImpulse) return 0;
    return Math.sqrt(totalImpulse.x ** 2 + totalImpulse.y ** 2);
  }

  private getCollisionNormal(pair: Matter.Pair, brick: Matter.Body): { x: number; y: number } {
    const normal = pair.collision.normal;
    const otherBody = pair.bodyA === brick ? pair.bodyB : pair.bodyA;
    
    const dx = otherBody.position.x - brick.position.x;
    const dy = otherBody.position.y - brick.position.y;
    const dot = dx * normal.x + dy * normal.y;
    
    if (dot < 0) {
      return { x: -normal.x, y: -normal.y };
    }
    return { x: normal.x, y: normal.y };
  }

  private applyBreakVelocity(brick: Matter.Body, normal: { x: number; y: number }, force: number): void {
    const angleOffset = (Math.random() - 0.5) * Math.PI / 3;
    const baseAngle = Math.atan2(normal.y, normal.x);
    const finalAngle = baseAngle + angleOffset;
    
    const speed = 5 + force * 0.5;
    const vx = Math.cos(finalAngle) * speed;
    const vy = Math.sin(finalAngle) * speed;
    
    Matter.Body.setVelocity(brick, { x: vx, y: vy });
    Matter.Body.setAngularVelocity(brick, (Math.random() - 0.5) * 0.2);
  }

  setBall(ball: Matter.Body): void {
    this.ball = ball;
  }

  getBall(): Matter.Body | null {
    return this.ball;
  }

  addBody(body: Matter.Body, metadata?: Partial<BrickMetadata>): void {
    Matter.Composite.add(this.world, body);
    
    if (body.label.startsWith('brick_')) {
      this.bricks.set(body.label, body);
      this.brickMetadata.set(body.label, {
        id: body.label,
        color: metadata?.color || '#8e44ad',
        isSettled: false,
        settleStartTime: null,
        isBroken: false,
        alpha: 1,
        createdAt: Date.now(),
        ...metadata,
      });
    }
  }

  removeBody(body: Matter.Body): void {
    Matter.Composite.remove(this.world, body);
    
    if (body.label.startsWith('brick_')) {
      this.bricks.delete(body.label);
      this.brickMetadata.delete(body.label);
      this.settledBricksQueue = this.settledBricksQueue.filter(id => id !== body.label);
    }
  }

  clearBricks(): void {
    for (const brick of this.bricks.values()) {
      Matter.Composite.remove(this.world, brick);
    }
    this.bricks.clear();
    this.brickMetadata.clear();
    this.settledBricksQueue = [];
  }

  getBricks(): Matter.Body[] {
    return Array.from(this.bricks.values());
  }

  getBrickMetadata(id: string): BrickMetadata | undefined {
    return this.brickMetadata.get(id);
  }

  getAllBrickMetadata(): BrickMetadata[] {
    return Array.from(this.brickMetadata.values());
  }

  setOnBrickBreakCallback(callback: OnBrickBreakCallback | null): void {
    this.onBrickBreakCallback = callback;
  }

  setOnAllSettledCallback(callback: OnAllSettledCallback | null): void {
    this.onAllSettledCallback = callback;
  }

  private startRunner(): void {
    this.runner = Matter.Runner.create({
      fps: 60,
    });
    Matter.Runner.run(this.runner, this.engine);
  }

  update(): void {
    if (!this.isRunning) return;
    
    const now = Date.now();
    const deltaTime = this.lastUpdateTime ? now - this.lastUpdateTime : 16;
    this.lastUpdateTime = now;
    
    this.checkSettledBricks(deltaTime);
    this.enforceFragmentLimit();
    this.checkAllSettled();
  }

  private checkSettledBricks(deltaTime: number): void {
    for (const [id, brick] of this.bricks) {
      const metadata = this.brickMetadata.get(id);
      if (!metadata) continue;
      
      const speed = Math.sqrt(brick.velocity.x ** 2 + brick.velocity.y ** 2);
      const angularSpeed = Math.abs(brick.angularVelocity);
      
      if (speed < SETTLE_SPEED_THRESHOLD && angularSpeed < SETTLE_SPEED_THRESHOLD) {
        if (metadata.settleStartTime === null) {
          metadata.settleStartTime = Date.now();
        } else if (Date.now() - metadata.settleStartTime > SETTLE_TIME_THRESHOLD && !metadata.isSettled) {
          metadata.isSettled = true;
          metadata.alpha = 0.3;
          brick.collisionFilter.category = 0x0002;
          brick.collisionFilter.mask = 0x0001;
          this.settledBricksQueue.push(id);
        }
      } else {
        metadata.settleStartTime = null;
      }
    }
  }

  private enforceFragmentLimit(): void {
    const totalBricks = this.bricks.size;
    if (totalBricks > MAX_FRAGMENTS && this.settledBricksQueue.length > 0) {
      const toRemove = totalBricks - MAX_FRAGMENTS;
      for (let i = 0; i < toRemove && this.settledBricksQueue.length > 0; i++) {
        const oldestId = this.settledBricksQueue.shift();
        if (oldestId) {
          const brick = this.bricks.get(oldestId);
          if (brick) {
            this.removeBody(brick);
          }
        }
      }
    }
  }

  private checkAllSettled(): void {
    if (this.bricks.size === 0) return;
    
    const allSettled = Array.from(this.brickMetadata.values()).every(
      (meta) => meta.isSettled
    );
    
    if (allSettled && this.onAllSettledCallback) {
      this.onAllSettledCallback();
      this.onAllSettledCallback = null;
    }
  }

  resetOnAllSettledCallback(): void {
    this.onAllSettledCallback = null;
  }

  getEngine(): Matter.Engine {
    return this.engine;
  }

  getWorld(): Matter.World {
    return this.world;
  }

  getGround(): Matter.Body | null {
    return this.ground;
  }

  destroy(): void {
    this.isRunning = false;
    if (this.runner) {
      Matter.Runner.stop(this.runner);
    }
    Matter.Engine.clear(this.engine);
  }
}

export const CANVAS_SIZE = { width: CANVAS_WIDTH, height: CANVAS_HEIGHT };
export const COLORS = {
  BRICK_COLORS: ['#c0392b', '#e74c3c', '#8e44ad', '#2980b9'],
  BALL_COLOR: '#f1c40f',
  POWER_GREEN: '#2ecc71',
  POWER_RED: '#e74c3c',
  GROUND_COLOR: '#4a2c2a',
  BG_START: '#0f0c29',
  BG_END: '#302b63',
};
