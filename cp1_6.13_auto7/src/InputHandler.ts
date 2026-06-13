export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  attack: boolean;
  usePotion: boolean;
  interact: boolean;
}

export type InputCallback = (direction: 'up' | 'down' | 'left' | 'right') => void;
export type ActionCallback = () => void;

export class InputHandler {
  private keys: Set<string>;
  private moveCooldown: number;
  private lastMoveTime: number;
  private onMove?: InputCallback;
  private onAttack?: ActionCallback;
  private onUsePotion?: ActionCallback;
  private onInteract?: ActionCallback;
  private onConfirm?: ActionCallback;

  constructor(moveCooldown: number = 120) {
    this.keys = new Set();
    this.moveCooldown = moveCooldown;
    this.lastMoveTime = 0;
  }

  setOnMove(callback: InputCallback): void {
    this.onMove = callback;
  }

  setOnAttack(callback: ActionCallback): void {
    this.onAttack = callback;
  }

  setOnUsePotion(callback: ActionCallback): void {
    this.onUsePotion = callback;
  }

  setOnInteract(callback: ActionCallback): void {
    this.onInteract = callback;
  }

  setOnConfirm(callback: ActionCallback): void {
    this.onConfirm = callback;
  }

  attach(): void {
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));
  }

  detach(): void {
    window.removeEventListener('keydown', this.handleKeyDown.bind(this));
    window.removeEventListener('keyup', this.handleKeyUp.bind(this));
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    this.keys.add(key);

    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', ' ', 'enter'].includes(key)) {
      e.preventDefault();
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    this.keys.delete(key);
  }

  update(currentTime: number): void {
    if (currentTime - this.lastMoveTime < this.moveCooldown) return;

    let direction: 'up' | 'down' | 'left' | 'right' | null = null;

    if (this.keys.has('arrowup') || this.keys.has('w')) {
      direction = 'up';
    } else if (this.keys.has('arrowdown') || this.keys.has('s')) {
      direction = 'down';
    } else if (this.keys.has('arrowleft') || this.keys.has('a')) {
      direction = 'left';
    } else if (this.keys.has('arrowright') || this.keys.has('d')) {
      direction = 'right';
    }

    if (direction && this.onMove) {
      this.onMove(direction);
      this.lastMoveTime = currentTime;
    }

    if (this.keys.has(' ') && this.onAttack) {
      this.onAttack();
      this.keys.delete(' ');
    }

    if (this.keys.has('q') && this.onUsePotion) {
      this.onUsePotion();
      this.keys.delete('q');
    }

    if (this.keys.has('e') && this.onInteract) {
      this.onInteract();
      this.keys.delete('e');
    }

    if (this.keys.has('enter') && this.onConfirm) {
      this.onConfirm();
      this.keys.delete('enter');
    }
  }

  isKeyPressed(key: string): boolean {
    return this.keys.has(key.toLowerCase());
  }

  getInputState(): InputState {
    return {
      up: this.keys.has('arrowup') || this.keys.has('w'),
      down: this.keys.has('arrowdown') || this.keys.has('s'),
      left: this.keys.has('arrowleft') || this.keys.has('a'),
      right: this.keys.has('arrowright') || this.keys.has('d'),
      attack: this.keys.has(' '),
      usePotion: this.keys.has('q'),
      interact: this.keys.has('e')
    };
  }
}
