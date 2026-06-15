import { eventBus } from '../eventBus';
import type { Rect, PhysicsObject, CollisionResult, ObjectType, PhysicsDebugState } from '../types';

export class PhysicsModule {
  private objects: Map<string, PhysicsObject> = new Map();
  private readonly GRAVITY: number = 520;
  private readonly GROUND_Y: number = 600;
  private readonly RESTITUTION: number = 0.3;
  private readonly CHARACTER_MASS: number = 1;
  private debugState: PhysicsDebugState = {
    collisionEnabled: true,
    showBounds: false,
    particlesEnabled: true
  };
  private objectIdCounter: number = 0;

  constructor() {
    this.setupDefaultObjects();
    this.setupDebugListener();
  }

  private setupDebugListener(): void {
    eventBus.on('PHYSICS_DEBUG', (event) => {
      if (event.type === 'PHYSICS_DEBUG') {
        const payload = event.payload;
        if (payload.collisionEnabled !== undefined) {
          this.debugState.collisionEnabled = payload.collisionEnabled;
        }
        if (payload.showBounds !== undefined) {
          this.debugState.showBounds = payload.showBounds;
        }
        if (payload.particlesEnabled !== undefined) {
          this.debugState.particlesEnabled = payload.particlesEnabled;
        }
      }
    });
  }

  private setupDefaultObjects(): void {
    this.addObject('box', 600, this.GROUND_Y - 40, 40, 40, 2, '#c88a5a');
    this.addObject('box', 750, this.GROUND_Y - 40, 40, 40, 2, '#c88a5a');
    this.addObject('vase', 900, this.GROUND_Y - 30, 20, 30, 0.5, '#e07a5f', 3);
    this.addObject('vase', 1050, this.GROUND_Y - 30, 20, 30, 0.5, '#e07a5f', 3);
    this.addObject('spring', 500, this.GROUND_Y - 15, 50, 15, 10, '#81b29a', undefined, 0.85);
    this.addObject('spring', 1200, this.GROUND_Y - 15, 50, 15, 10, '#81b29a', undefined, 0.85);
  }

  private addObject(
    type: ObjectType,
    x: number,
    y: number,
    width: number,
    height: number,
    mass: number,
    color: string,
    hp?: number,
    elasticity?: number
  ): string {
    const id = `obj_${++this.objectIdCounter}`;
    const obj: PhysicsObject = {
      id,
      type,
      rect: { x, y, width, height },
      mass,
      velocity: { x: 0, y: 0 },
      color,
      isActive: true
    };

    if (hp !== undefined) {
      obj.hp = hp;
      obj.maxHp = hp;
    }
    if (elasticity !== undefined) {
      obj.elasticity = elasticity;
    }

    this.objects.set(id, obj);
    return id;
  }

  public getObjects(): PhysicsObject[] {
    return Array.from(this.objects.values()).filter(o => o.isActive);
  }

  public getDebugState(): PhysicsDebugState {
    return { ...this.debugState };
  }

  public update(dt: number, characterRect: Rect, characterVelocity: { x: number; y: number }, attackHitbox: Rect | null): {
    characterResponse: { vx: number; vy: number; x: number; y: number } | null;
  } {
    let characterResponse: { vx: number; vy: number; x: number; y: number } | null = null;

    this.objects.forEach(obj => {
      if (!obj.isActive) return;

      if (obj.type !== 'spring') {
        obj.velocity.y += this.GRAVITY * dt;
      }

      obj.rect.x += obj.velocity.x * dt;
      obj.rect.y += obj.velocity.y * dt;

      if (obj.rect.y + obj.rect.height >= this.GROUND_Y) {
        obj.rect.y = this.GROUND_Y - obj.rect.height;
        obj.velocity.y = 0;
        obj.velocity.x *= 0.9;
      }

      if (Math.abs(obj.velocity.x) < 0.1) {
        obj.velocity.x = 0;
      }
    });

    if (this.debugState.collisionEnabled) {
      this.objects.forEach(obj => {
        if (!obj.isActive) return;

        const collision = this.aabbCollision(characterRect, obj.rect);
        if (collision.collided) {
          const response = this.handleCollision(characterRect, characterVelocity, obj, collision);
          if (response) {
            characterResponse = response;
          }

          eventBus.emit({
            type: 'COLLISION',
            payload: { objectId: obj.id, objectType: obj.type }
          });
        }
      });

      if (attackHitbox) {
        this.objects.forEach(obj => {
          if (!obj.isActive || obj.type !== 'vase') return;

          const attackCollision = this.aabbCollision(attackHitbox, obj.rect);
          if (attackCollision.collided) {
            this.damageObject(obj, 1);

            eventBus.emit({
              type: 'ATTACK_HIT',
              payload: {
                x: attackHitbox.x + attackHitbox.width / 2,
                y: attackHitbox.y + attackHitbox.height / 2
              }
            });

            eventBus.emit({
              type: 'EFFECT',
              payload: {
                type: 'spark',
                x: attackHitbox.x + attackHitbox.width / 2,
                y: attackHitbox.y + attackHitbox.height / 2
              }
            });
          }
        });
      }
    }

    return { characterResponse };
  }

  private aabbCollision(a: Rect, b: Rect): CollisionResult {
    const aCenterX = a.x + a.width / 2;
    const aCenterY = a.y + a.height / 2;
    const bCenterX = b.x + b.width / 2;
    const bCenterY = b.y + b.height / 2;

    const dx = aCenterX - bCenterX;
    const dy = aCenterY - bCenterY;

    const overlapX = (a.width + b.width) / 2 - Math.abs(dx);
    const overlapY = (a.height + b.height) / 2 - Math.abs(dy);

    if (overlapX <= 0 || overlapY <= 0) {
      return { collided: false, normal: { x: 0, y: 0 }, penetration: 0 };
    }

    if (overlapX < overlapY) {
      return {
        collided: true,
        normal: { x: dx > 0 ? 1 : -1, y: 0 },
        penetration: overlapX
      };
    } else {
      return {
        collided: true,
        normal: { x: 0, y: dy > 0 ? 1 : -1 },
        penetration: overlapY
      };
    }
  }

  private handleCollision(
    characterRect: Rect,
    characterVelocity: { x: number; y: number },
    obj: PhysicsObject,
    collision: CollisionResult
  ): { vx: number; vy: number; x: number; y: number } | null {
    if (obj.type === 'spring' && collision.normal.y < 0) {
      const bounceVelocity = -380 * (obj.elasticity || 0.85);
      return {
        vx: characterVelocity.x,
        vy: bounceVelocity,
        x: characterRect.x,
        y: obj.rect.y - characterRect.height
      };
    }

    const m1 = this.CHARACTER_MASS;
    const m2 = obj.mass;
    const e = this.RESTITUTION;

    let newCharVx = characterVelocity.x;
    let newCharVy = characterVelocity.y;
    let newObjVx = obj.velocity.x;
    let newObjVy = obj.velocity.y;

    if (collision.normal.x !== 0) {
      [newCharVx, newObjVx] = this.momentumResponse(
        characterVelocity.x, obj.velocity.x, m1, m2, e
      );
    }

    if (collision.normal.y !== 0) {
      [newCharVy, newObjVy] = this.momentumResponse(
        characterVelocity.y, obj.velocity.y, m1, m2, e
      );
    }

    const pushX = collision.normal.x * collision.penetration;
    const pushY = collision.normal.y * collision.penetration;

    const massRatio = m2 / (m1 + m2);
    const charPushX = -pushX * massRatio;
    const charPushY = -pushY * massRatio;
    const objPushX = pushX * (m1 / (m1 + m2));
    const objPushY = pushY * (m1 / (m1 + m2));

    obj.rect.x += objPushX;
    obj.rect.y += objPushY;
    obj.velocity.x = newObjVx;
    obj.velocity.y = newObjVy;

    if (obj.type === 'box' && collision.normal.x !== 0) {
      obj.velocity.x = collision.normal.x < 0 ? -40 : 40;
    }

    return {
      vx: newCharVx,
      vy: collision.normal.y < 0 ? 0 : newCharVy,
      x: characterRect.x + charPushX,
      y: characterRect.y + charPushY
    };
  }

  private momentumResponse(v1: number, v2: number, m1: number, m2: number, e: number): [number, number] {
    const newV1 = ((m1 - e * m2) * v1 + (1 + e) * m2 * v2) / (m1 + m2);
    const newV2 = ((m2 - e * m1) * v2 + (1 + e) * m1 * v1) / (m1 + m2);
    return [newV1, newV2];
  }

  private damageObject(obj: PhysicsObject, damage: number): void {
    if (obj.hp === undefined) return;

    obj.hp -= damage;
    if (obj.hp <= 0) {
      obj.isActive = false;

      eventBus.emit({
        type: 'VASE_BROKEN',
        payload: {
          x: obj.rect.x + obj.rect.width / 2,
          y: obj.rect.y + obj.rect.height / 2,
          color: obj.color
        }
      });

      eventBus.emit({
        type: 'EFFECT',
        payload: {
          type: 'debris',
          x: obj.rect.x + obj.rect.width / 2,
          y: obj.rect.y + obj.rect.height / 2,
          color: obj.color
        }
      });
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    this.objects.forEach(obj => {
      if (!obj.isActive) return;

      ctx.fillStyle = obj.color;

      if (obj.type === 'box') {
        ctx.fillRect(obj.rect.x, obj.rect.y, obj.rect.width, obj.rect.height);
        ctx.strokeStyle = '#8b5a2b';
        ctx.lineWidth = 2;
        ctx.strokeRect(obj.rect.x, obj.rect.y, obj.rect.width, obj.rect.height);
      } else if (obj.type === 'vase') {
        ctx.beginPath();
        ctx.ellipse(
          obj.rect.x + obj.rect.width / 2,
          obj.rect.y + obj.rect.height / 2,
          obj.rect.width / 2,
          obj.rect.height / 2,
          0, 0, Math.PI * 2
        );
        ctx.fill();
        ctx.fillStyle = '#c06050';
        ctx.fillRect(obj.rect.x + 2, obj.rect.y, obj.rect.width - 4, 5);
      } else if (obj.type === 'spring') {
        ctx.fillRect(obj.rect.x, obj.rect.y, obj.rect.width, obj.rect.height);
        ctx.fillStyle = '#6a9a82';
        for (let i = 0; i < 3; i++) {
          ctx.fillRect(obj.rect.x + 5 + i * 15, obj.rect.y + 3, 10, 2);
        }
      }

      if (this.debugState.showBounds) {
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 1;
        ctx.strokeRect(obj.rect.x, obj.rect.y, obj.rect.width, obj.rect.height);
      }
    });
  }

  public destroy(): void {
    this.objects.clear();
  }
}
