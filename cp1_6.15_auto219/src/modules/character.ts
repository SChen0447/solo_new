import { eventBus } from '../eventBus';
import { skeletonAnimations } from '../data/animations';
import type { ActionType, Joint, SkeletonFrame, CharacterState, Rect } from '../types';

export class CharacterModule {
  private state: CharacterState;
  private currentFrame: number = 0;
  private frameTimer: number = 0;
  private targetAction: ActionType = 'idle';
  private transitionProgress: number = 0;
  private isTransitioning: boolean = false;
  private readonly TRANSITION_DURATION: number = 0.3;
  private readonly MOVE_SPEED: number = 120;
  private readonly JUMP_VELOCITY: number = -350;
  private readonly GRAVITY: number = 520;
  private readonly GROUND_Y: number = 600;
  private readonly COLLISION_WIDTH: number = 40;
  private readonly COLLISION_HEIGHT: number = 120;
  private horizontalDirection: number = 0;
  private actionCallback: ((event: { type: string; payload: any }) => void) | null = null;

  constructor(initialX: number = 400) {
    this.state = {
      position: { x: initialX, y: this.GROUND_Y - this.COLLISION_HEIGHT },
      velocity: { x: 0, y: 0 },
      hp: 100,
      maxHp: 100,
      attack: 100,
      maxAttack: 100,
      currentAction: 'idle',
      collisionRect: {
        x: initialX - this.COLLISION_WIDTH / 2,
        y: this.GROUND_Y - this.COLLISION_HEIGHT,
        width: this.COLLISION_WIDTH,
        height: this.COLLISION_HEIGHT
      },
      facingRight: true,
      isGrounded: true
    };

    this.setupEventListener();
  }

  private setupEventListener(): void {
    this.actionCallback = (event) => {
      if (event.type === 'ACTION') {
        this.handleAction(event.payload as ActionType);
      }
    };
    eventBus.on('ACTION', this.actionCallback);
  }

  private handleAction(action: ActionType): void {
    if (action === 'walk') {
      if (this.state.currentAction !== 'jump' && this.state.currentAction !== 'attack') {
        this.startTransition(action);
      }
    } else if (action === 'jump') {
      if (this.state.isGrounded) {
        this.state.velocity.y = this.JUMP_VELOCITY;
        this.state.isGrounded = false;
        this.startTransition(action);
        eventBus.emit({
          type: 'JUMP',
          payload: {
            x: this.state.position.x,
            y: this.state.position.y + this.COLLISION_HEIGHT
          }
        });
      }
    } else if (action === 'attack') {
      this.startTransition(action);
      this.state.attack = Math.max(0, this.state.attack - 10);
    } else if (action === 'crouch') {
      this.startTransition(action);
    } else if (action === 'idle') {
      if (this.state.currentAction !== 'jump' && this.state.currentAction !== 'attack') {
        this.startTransition(action);
      }
    } else if (action === 'hurt' || action === 'fall') {
      this.startTransition(action);
    }
  }

  private startTransition(target: ActionType): void {
    if (this.state.currentAction === target) return;
    this.targetAction = target;
    this.isTransitioning = true;
    this.transitionProgress = 0;
  }

  public setHorizontalDirection(dir: number): void {
    this.horizontalDirection = dir;
    if (dir > 0) {
      this.state.facingRight = true;
    } else if (dir < 0) {
      this.state.facingRight = false;
    }
  }

  public getState(): CharacterState {
    return { ...this.state };
  }

  public getCollisionRect(): Rect {
    return { ...this.state.collisionRect };
  }

  public getCurrentJoints(): Joint[] {
    const animation = skeletonAnimations[this.state.currentAction];
    const frames = animation.frames;
    const currentFrameData = frames[Math.floor(this.currentFrame) % frames.length];

    if (this.isTransitioning) {
      const targetAnimation = skeletonAnimations[this.targetAction];
      const targetFrames = targetAnimation.frames;
      const targetFrameData = targetFrames[0];
      return this.lerpJoints(currentFrameData.joints, targetFrameData.joints, this.transitionProgress);
    }

    return currentFrameData.joints.map(j => ({ ...j }));
  }

  public getWorldJoints(): Joint[] {
    const localJoints = this.getCurrentJoints();
    const offsetX = this.state.position.x;
    const offsetY = this.state.position.y + 60;
    const scaleX = this.state.facingRight ? 1 : -1;

    return localJoints.map(j => ({
      ...j,
      x: offsetX + j.x * scaleX,
      y: offsetY + j.y
    }));
  }

  private lerpJoints(from: Joint[], to: Joint[], t: number): Joint[] {
    return from.map((joint, i) => ({
      ...joint,
      x: joint.x + (to[i].x - joint.x) * t,
      y: joint.y + (to[i].y - joint.y) * t
    }));
  }

  public update(dt: number): void {
    if (this.isTransitioning) {
      this.transitionProgress += dt / this.TRANSITION_DURATION;
      if (this.transitionProgress >= 1) {
        this.transitionProgress = 1;
        this.isTransitioning = false;
        this.state.currentAction = this.targetAction;
        this.currentFrame = 0;
        this.frameTimer = 0;
      }
    }

    const animation = skeletonAnimations[this.state.currentAction];
    this.frameTimer += dt;
    const frameDuration = 1 / animation.frameRate;
    if (this.frameTimer >= frameDuration) {
      this.frameTimer -= frameDuration;
      this.currentFrame = (this.currentFrame + 1) % animation.frames.length;
    }

    this.state.velocity.x = this.horizontalDirection * this.MOVE_SPEED;

    if (!this.state.isGrounded) {
      this.state.velocity.y += this.GRAVITY * dt;
    }

    this.state.position.x += this.state.velocity.x * dt;
    this.state.position.y += this.state.velocity.y * dt;

    if (this.state.position.y >= this.GROUND_Y - this.COLLISION_HEIGHT) {
      this.state.position.y = this.GROUND_Y - this.COLLISION_HEIGHT;
      this.state.velocity.y = 0;
      if (!this.state.isGrounded && this.state.currentAction === 'jump') {
        this.state.isGrounded = true;
        if (this.horizontalDirection !== 0) {
          this.startTransition('walk');
        } else {
          this.startTransition('idle');
        }
      }
      this.state.isGrounded = true;
    }

    this.state.collisionRect = {
      x: this.state.position.x - this.COLLISION_WIDTH / 2,
      y: this.state.position.y,
      width: this.COLLISION_WIDTH,
      height: this.COLLISION_HEIGHT
    };

    if (this.state.attack < this.state.maxAttack) {
      this.state.attack = Math.min(this.state.maxAttack, this.state.attack + 5 * dt);
    }
  }

  public setPosition(x: number, y: number): void {
    this.state.position.x = x;
    this.state.position.y = y;
    this.state.collisionRect.x = x - this.COLLISION_WIDTH / 2;
    this.state.collisionRect.y = y;
  }

  public setVelocity(vx: number, vy: number): void {
    this.state.velocity.x = vx;
    this.state.velocity.y = vy;
  }

  public takeDamage(amount: number): void {
    this.state.hp = Math.max(0, this.state.hp - amount);
    this.startTransition('hurt');
    setTimeout(() => {
      if (this.state.hp <= 0) {
        this.startTransition('fall');
      } else if (this.horizontalDirection !== 0) {
        this.startTransition('walk');
      } else {
        this.startTransition('idle');
      }
    }, 300);
  }

  public getAttackHitbox(): Rect | null {
    if (this.state.currentAction !== 'attack') return null;

    const attackRange = 60;
    const hitboxWidth = 50;
    const hitboxHeight = 40;

    return {
      x: this.state.facingRight
        ? this.state.position.x + 20
        : this.state.position.x - 20 - hitboxWidth,
      y: this.state.position.y + 30,
      width: hitboxWidth,
      height: hitboxHeight
    };
  }

  public destroy(): void {
    if (this.actionCallback) {
      eventBus.off('ACTION', this.actionCallback);
    }
  }
}
