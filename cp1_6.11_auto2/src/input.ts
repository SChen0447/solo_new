export type InputAction = 'gravityWave' | 'restart';

export interface InputState {
  mouseX: number;
  mouseY: number;
  isMouseDown: boolean;
  keys: Set<string>;
}

export class InputManager {
  private canvas: HTMLCanvasElement;
  private state: InputState;
  private actionListeners: Map<InputAction, () => void>;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.state = {
      mouseX: 0,
      mouseY: 0,
      isMouseDown: false,
      keys: new Set()
    };
    this.actionListeners = new Map();
    this.bindEvents();
  }

  private bindEvents(): void {
    const rect = this.canvas.getBoundingClientRect();
    
    this.canvas.addEventListener('mousemove', (e) => {
      this.state.mouseX = e.clientX - rect.left;
      this.state.mouseY = e.clientY - rect.top;
    });

    this.canvas.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.state.isMouseDown = true;
      this.triggerAction('gravityWave');
    });

    this.canvas.addEventListener('mouseup', () => {
      this.state.isMouseDown = false;
    });

    this.canvas.addEventListener('click', (e) => {
      e.preventDefault();
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.state.keys.add(e.code);
        this.triggerAction('gravityWave');
      } else if (e.code === 'KeyR') {
        this.triggerAction('restart');
      } else {
        this.state.keys.add(e.code);
      }
    });

    window.addEventListener('keyup', (e) => {
      this.state.keys.delete(e.code);
    });

    window.addEventListener('resize', () => {
      const newRect = this.canvas.getBoundingClientRect();
      this.state.mouseX = Math.max(0, Math.min(this.state.mouseX, newRect.width));
      this.state.mouseY = Math.max(0, Math.min(this.state.mouseY, newRect.height));
    });
  }

  on(action: InputAction, callback: () => void): void {
    this.actionListeners.set(action, callback);
  }

  off(action: InputAction): void {
    this.actionListeners.delete(action);
  }

  private triggerAction(action: InputAction): void {
    const callback = this.actionListeners.get(action);
    if (callback) {
      callback();
    }
  }

  getMousePosition(): { x: number; y: number } {
    return {
      x: this.state.mouseX,
      y: this.state.mouseY
    };
  }

  isKeyPressed(code: string): boolean {
    return this.state.keys.has(code);
  }

  updateCanvasRect(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.state.mouseX = Math.max(0, Math.min(this.state.mouseX, rect.width));
    this.state.mouseY = Math.max(0, Math.min(this.state.mouseY, rect.height));
  }
}
