export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jump: boolean;
  rewind: boolean;
  interact: boolean;
}

export class InputManager {
  private keys: Set<string> = new Set();
  private previousKeys: Set<string> = new Set();

  constructor() {
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));
    window.addEventListener('blur', () => this.clearKeys());
  }

  private handleKeyDown(e: KeyboardEvent): void {
    this.keys.add(e.code);
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE'].includes(e.code)) {
      e.preventDefault();
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.code);
  }

  private clearKeys(): void {
    this.keys.clear();
  }

  update(): void {
    this.previousKeys = new Set(this.keys);
  }

  getState(): InputState {
    return {
      left: this.keys.has('KeyA') || this.keys.has('ArrowLeft'),
      right: this.keys.has('KeyD') || this.keys.has('ArrowRight'),
      up: this.keys.has('KeyW') || this.keys.has('ArrowUp'),
      down: this.keys.has('KeyS') || this.keys.has('ArrowDown'),
      jump: this.isPressed('Space'),
      rewind: this.keys.has('Space'),
      interact: this.isPressed('KeyE')
    };
  }

  isPressed(code: string): boolean {
    return this.keys.has(code) && !this.previousKeys.has(code);
  }

  isHeld(code: string): boolean {
    return this.keys.has(code);
  }

  isReleased(code: string): boolean {
    return !this.keys.has(code) && this.previousKeys.has(code);
  }

  destroy(): void {
    window.removeEventListener('keydown', (e) => this.handleKeyDown(e));
    window.removeEventListener('keyup', (e) => this.handleKeyUp(e));
    window.removeEventListener('blur', () => this.clearKeys());
  }
}
