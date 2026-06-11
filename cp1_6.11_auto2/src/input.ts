export type InputAction = 'gravityWave' | 'restart';

export interface InputState {
  mouseX: number;
  mouseY: number;
  isMouseDown: boolean;
  dragStartX: number;
  dragStartY: number;
  isDragging: boolean;
  keys: Set<string>;
}

export class InputManager {
  private canvas: HTMLCanvasElement;
  private state: InputState;
  private actionListeners: Map<InputAction, () => void>;
  private dragWaveTimer: number | null;
  private dragWaveInterval: number;
  private readonly DRAG_THRESHOLD = 10;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.state = {
      mouseX: 0,
      mouseY: 0,
      isMouseDown: false,
      dragStartX: 0,
      dragStartY: 0,
      isDragging: false,
      keys: new Set()
    };
    this.actionListeners = new Map();
    this.dragWaveTimer = null;
    this.dragWaveInterval = 400;
    this.bindEvents();
  }

  private bindEvents(): void {
    const getCanvasPos = (e: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    this.canvas.addEventListener('mousemove', (e) => {
      const pos = getCanvasPos(e);
      this.state.mouseX = pos.x;
      this.state.mouseY = pos.y;

      if (this.state.isMouseDown && !this.state.isDragging) {
        const dx = this.state.mouseX - this.state.dragStartX;
        const dy = this.state.mouseY - this.state.dragStartY;
        if (Math.sqrt(dx * dx + dy * dy) >= this.DRAG_THRESHOLD) {
          this.state.isDragging = true;
          this.startDragWave();
        }
      }
    });

    this.canvas.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const pos = getCanvasPos(e);
      this.state.isMouseDown = true;
      this.state.dragStartX = pos.x;
      this.state.dragStartY = pos.y;
      this.state.isDragging = false;
      this.triggerAction('gravityWave');
    });

    this.canvas.addEventListener('mouseup', () => {
      this.state.isMouseDown = false;
      this.state.isDragging = false;
      this.stopDragWave();
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.state.isMouseDown = false;
      this.state.isDragging = false;
      this.stopDragWave();
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
      const rect = this.canvas.getBoundingClientRect();
      this.state.mouseX = Math.max(0, Math.min(this.state.mouseX, rect.width));
      this.state.mouseY = Math.max(0, Math.min(this.state.mouseY, rect.height));
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

  private startDragWave(): void {
    if (this.dragWaveTimer !== null) return;
    this.dragWaveTimer = window.setInterval(() => {
      if (this.state.isMouseDown && this.state.isDragging) {
        this.triggerAction('gravityWave');
      } else {
        this.stopDragWave();
      }
    }, this.dragWaveInterval);
  }

  private stopDragWave(): void {
    if (this.dragWaveTimer !== null) {
      clearInterval(this.dragWaveTimer);
      this.dragWaveTimer = null;
    }
  }

  destroy(): void {
    this.stopDragWave();
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
