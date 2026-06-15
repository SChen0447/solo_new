import { PhysicsInput, CollisionEvent } from './PhysicsEngine';
import { AudioManager } from './AudioManager';

export interface KeyCollectionEvent {
  keyId: string;
  position: { x: number; y: number };
}

export interface PlayerControllerEvents {
  onJump?: () => void;
  onCollision?: () => void;
  onKeyCollected?: (event: KeyCollectionEvent) => void;
  onDoorReached?: () => void;
  onSpringBounce?: () => void;
  onDeath?: () => void;
  onWin?: () => void;
}

export class PlayerController {
  private input: PhysicsInput = {
    left: false,
    right: false,
    jump: false,
    jumpPressed: false
  };

  private keys: Set<string> = new Set();
  private audioManager: AudioManager;
  private events: PlayerControllerEvents;
  private touchLeftActive = false;
  private touchRightActive = false;
  private touchJumpActive = false;

  constructor(audioManager: AudioManager, events: PlayerControllerEvents = {}) {
    this.audioManager = audioManager;
    this.events = events;
  }

  public attachKeyboardListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  public detachKeyboardListeners(): void {
    if (typeof window === 'undefined') return;

    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.repeat) return;

    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        this.input.left = true;
        this.keys.add(e.code);
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.input.right = true;
        this.keys.add(e.code);
        break;
      case 'Space':
      case 'ArrowUp':
      case 'KeyW':
        if (!this.input.jump) {
          this.input.jumpPressed = true;
        }
        this.input.jump = true;
        this.keys.add(e.code);
        break;
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        this.input.left = false;
        this.keys.delete(e.code);
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.input.right = false;
        this.keys.delete(e.code);
        break;
      case 'Space':
      case 'ArrowUp':
      case 'KeyW':
        this.input.jump = false;
        this.input.jumpPressed = false;
        this.keys.delete(e.code);
        break;
    }
  };

  public setTouchLeft(active: boolean): void {
    this.touchLeftActive = active;
    this.input.left = active || this.keys.has('ArrowLeft') || this.keys.has('KeyA');
  }

  public setTouchRight(active: boolean): void {
    this.touchRightActive = active;
    this.input.right = active || this.keys.has('ArrowRight') || this.keys.has('KeyD');
  }

  public setTouchJump(active: boolean): void {
    if (active && !this.touchJumpActive) {
      this.input.jumpPressed = true;
      this.input.jump = true;
    } else if (!active) {
      this.input.jump = false;
      this.input.jumpPressed = false;
    }
    this.touchJumpActive = active;
  }

  public getInput(): PhysicsInput {
    const input = { ...this.input };
    this.input.jumpPressed = false;
    return input;
  }

  public processEvents(events: CollisionEvent[]): void {
    for (const event of events) {
      switch (event.type) {
        case 'ground':
          this.audioManager.playSound('jump');
          this.events.onJump?.();
          break;
        case 'gear':
          this.audioManager.playSound('collision');
          this.events.onCollision?.();
          break;
        case 'spring':
          this.audioManager.playSound('bounce');
          this.events.onSpringBounce?.();
          break;
        case 'laser':
          this.audioManager.playSound('fail');
          this.events.onDeath?.();
          break;
        case 'key':
          this.audioManager.playSound('collect');
          this.events.onKeyCollected?.({
            keyId: event.data as string,
            position: { x: 0, y: 0 }
          });
          break;
        case 'door':
          this.audioManager.playSound('win');
          this.events.onDoorReached?.();
          this.events.onWin?.();
          break;
      }
    }
  }

  public reset(): void {
    this.input = {
      left: false,
      right: false,
      jump: false,
      jumpPressed: false
    };
    this.keys.clear();
    this.touchLeftActive = false;
    this.touchRightActive = false;
    this.touchJumpActive = false;
  }
}
