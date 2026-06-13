import { InputState } from './types';

export class InputManager {
  private state: InputState;
  private canvas: HTMLCanvasElement;
  private touchStartPos: { x: number; y: number } | null = null;
  private touchId: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.state = {
      up: false,
      down: false,
      left: false,
      right: false,
      jump: false,
      jumpPressed: false,
      glide: false
    };
    this.setupListeners();
  }

  private setupListeners(): void {
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));

    this.canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: false });
  }

  private onKeyDown(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    if (key === 'arrowup' || key === 'w') this.state.up = true;
    if (key === 'arrowdown' || key === 's') this.state.down = true;
    if (key === 'arrowleft' || key === 'a') this.state.left = true;
    if (key === 'arrowright' || key === 'd') this.state.right = true;
    if (key === ' ' || key === 'spacebar') {
      if (!this.state.jump) this.state.jumpPressed = true;
      this.state.jump = true;
      this.state.glide = true;
    }
    e.preventDefault();
  }

  private onKeyUp(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    if (key === 'arrowup' || key === 'w') this.state.up = false;
    if (key === 'arrowdown' || key === 's') this.state.down = false;
    if (key === 'arrowleft' || key === 'a') this.state.left = false;
    if (key === 'arrowright' || key === 'd') this.state.right = false;
    if (key === ' ' || key === 'spacebar') {
      this.state.jump = false;
      this.state.glide = false;
    }
  }

  private onTouchStart(e: TouchEvent): void {
    if (this.touchId !== null) return;
    const touch = e.touches[0];
    this.touchId = touch.identifier;
    this.touchStartPos = { x: touch.clientX, y: touch.clientY };
    this.state.jumpPressed = true;
    this.state.jump = true;
    this.state.glide = true;
    e.preventDefault();
  }

  private onTouchMove(e: TouchEvent): void {
    if (this.touchId === null || !this.touchStartPos) return;
    let touch: Touch | null = null;
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === this.touchId) {
        touch = e.touches[i];
        break;
      }
    }
    if (!touch) return;
    const dx = touch.clientX - this.touchStartPos.x;
    const dy = touch.clientY - this.touchStartPos.y;
    const threshold = 30;
    this.state.left = dx < -threshold;
    this.state.right = dx > threshold;
    this.state.up = dy < -threshold;
    this.state.down = dy > threshold;
    e.preventDefault();
  }

  private onTouchEnd(e: TouchEvent): void {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === this.touchId) {
        this.touchId = null;
        this.touchStartPos = null;
        this.state.up = false;
        this.state.down = false;
        this.state.left = false;
        this.state.right = false;
        this.state.jump = false;
        this.state.glide = false;
        break;
      }
    }
    e.preventDefault();
  }

  public getState(): InputState {
    const snapshot: InputState = { ...this.state };
    this.state.jumpPressed = false;
    return snapshot;
  }

  public destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown.bind(this));
    window.removeEventListener('keyup', this.onKeyUp.bind(this));
  }
}
