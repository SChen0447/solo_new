import { eventBus } from '../eventBus';
import type { ActionType } from '../types';

interface KeyState {
  pressed: boolean;
  timestamp: number;
}

export class InputModule {
  private keyStates: Map<string, KeyState> = new Map();
  private keyToAction: Map<string, ActionType> = new Map([
    ['KeyA', 'walk'],
    ['KeyD', 'walk'],
    ['KeyW', 'jump'],
    ['Space', 'attack'],
    ['KeyS', 'crouch'],
  ]);
  private horizontalDirection: number = 0;
  private isAttacking: boolean = false;
  private attackCooldown: number = 0;
  private readonly ATTACK_COOLDOWN_MS: number = 500;

  constructor() {
    this.setupListeners();
  }

  private setupListeners(): void {
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.repeat) return;

    this.keyStates.set(e.code, {
      pressed: true,
      timestamp: Date.now()
    });

    this.processAction(e.code, true);
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.keyStates.set(e.code, {
      pressed: false,
      timestamp: Date.now()
    });

    this.processAction(e.code, false);
  }

  private processAction(keyCode: string, isPressed: boolean): void {
    const now = Date.now();

    if (keyCode === 'KeyA') {
      this.horizontalDirection = isPressed
        ? (this.keyStates.get('KeyD')?.pressed ? 0 : -1)
        : (this.keyStates.get('KeyD')?.pressed ? 1 : 0);

      if (this.horizontalDirection === 0 && !this.keyStates.get('KeyW')?.pressed) {
        this.emitAction('idle');
      } else if (this.horizontalDirection !== 0) {
        this.emitAction('walk');
      }
    }

    if (keyCode === 'KeyD') {
      this.horizontalDirection = isPressed
        ? (this.keyStates.get('KeyA')?.pressed ? 0 : 1)
        : (this.keyStates.get('KeyA')?.pressed ? -1 : 0);

      if (this.horizontalDirection === 0 && !this.keyStates.get('KeyW')?.pressed) {
        this.emitAction('idle');
      } else if (this.horizontalDirection !== 0) {
        this.emitAction('walk');
      }
    }

    if (keyCode === 'KeyW' && isPressed) {
      this.emitAction('jump');
    }

    if (keyCode === 'KeyW' && !isPressed) {
      if (this.horizontalDirection !== 0) {
        this.emitAction('walk');
      } else {
        this.emitAction('idle');
      }
    }

    if (keyCode === 'Space' && isPressed) {
      if (now >= this.attackCooldown) {
        this.isAttacking = true;
        this.attackCooldown = now + this.ATTACK_COOLDOWN_MS;
        this.emitAction('attack');
        setTimeout(() => {
          this.isAttacking = false;
          if (this.horizontalDirection !== 0) {
            this.emitAction('walk');
          } else {
            this.emitAction('idle');
          }
        }, 300);
      }
    }

    if (keyCode === 'KeyS') {
      if (isPressed) {
        this.emitAction('crouch');
      } else {
        if (this.horizontalDirection !== 0) {
          this.emitAction('walk');
        } else {
          this.emitAction('idle');
        }
      }
    }
  }

  private emitAction(action: ActionType): void {
    eventBus.emit({
      type: 'ACTION',
      payload: action
    });
  }

  public getHorizontalDirection(): number {
    return this.horizontalDirection;
  }

  public isKeyPressed(keyCode: string): boolean {
    return this.keyStates.get(keyCode)?.pressed ?? false;
  }

  public update(dt: number): void {
    // 用于处理持续按键的逻辑
  }

  public destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown.bind(this));
    window.removeEventListener('keyup', this.handleKeyUp.bind(this));
    this.keyStates.clear();
  }
}
