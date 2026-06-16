export type Direction = 'up' | 'down' | 'left' | 'right';

export type PlayerId = 'red' | 'blue' | 'green' | 'purple';

export interface PlayerControls {
  up: string[];
  down: string[];
  left: string[];
  right: string[];
}

export const PLAYER_CONTROLS: Record<PlayerId, PlayerControls> = {
  red: {
    up: ['KeyW', 'w', 'W'],
    down: ['KeyS', 's', 'S'],
    left: ['KeyA', 'a', 'A'],
    right: ['KeyD', 'd', 'D']
  },
  blue: {
    up: ['ArrowUp'],
    down: ['ArrowDown'],
    left: ['ArrowLeft'],
    right: ['ArrowRight']
  },
  green: {
    up: ['KeyI', 'i', 'I'],
    down: ['KeyK', 'k', 'K'],
    left: ['KeyJ', 'j', 'J'],
    right: ['KeyL', 'l', 'L']
  },
  purple: {
    up: ['KeyT', 't', 'T'],
    down: ['KeyG', 'g', 'G'],
    left: ['KeyF', 'f', 'F'],
    right: ['KeyH', 'h', 'H']
  }
};

export type DirectionCallback = (playerId: PlayerId, direction: Direction) => void;

export class InputHandler {
  private pressedKeys: Set<string> = new Set();
  private directionCallback: DirectionCallback | null = null;
  private playerDirections: Map<PlayerId, Direction> = new Map();
  private activePlayers: PlayerId[] = [];

  constructor() {
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
  }

  public setActivePlayers(players: PlayerId[]): void {
    this.activePlayers = players;
    this.playerDirections.clear();
  }

  public setDirectionCallback(callback: DirectionCallback): void {
    this.directionCallback = callback;
  }

  public start(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  public stop(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.pressedKeys.clear();
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (this.isGameKey(e.code) || this.isGameKey(e.key)) {
      e.preventDefault();
    }
    if (this.pressedKeys.has(e.code)) {
      return;
    }
    this.pressedKeys.add(e.code);
    this.updateDirections();
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.pressedKeys.delete(e.code);
    this.updateDirections();
  }

  private isGameKey(key: string): boolean {
    for (const playerId of this.activePlayers) {
      const controls = PLAYER_CONTROLS[playerId];
      if (
        controls.up.includes(key) ||
        controls.down.includes(key) ||
        controls.left.includes(key) ||
        controls.right.includes(key)
      ) {
        return true;
      }
    }
    return false;
  }

  private updateDirections(): void {
    for (const playerId of this.activePlayers) {
      const direction = this.getPlayerDirection(playerId);
      if (direction !== null) {
        const prevDir = this.playerDirections.get(playerId);
        if (prevDir !== direction) {
          this.playerDirections.set(playerId, direction);
          if (this.directionCallback) {
            this.directionCallback(playerId, direction);
          }
        }
      }
    }
  }

  private getPlayerDirection(playerId: PlayerId): Direction | null {
    const controls = PLAYER_CONTROLS[playerId];
    const pressed = {
      up: this.anyKeyPressed(controls.up),
      down: this.anyKeyPressed(controls.down),
      left: this.anyKeyPressed(controls.left),
      right: this.anyKeyPressed(controls.right)
    };

    const dirs: Direction[] = [];
    if (pressed.up) dirs.push('up');
    if (pressed.down) dirs.push('down');
    if (pressed.left) dirs.push('left');
    if (pressed.right) dirs.push('right');

    if (dirs.length === 0) {
      return null;
    }

    return dirs[dirs.length - 1];
  }

  private anyKeyPressed(keys: string[]): boolean {
    for (const key of keys) {
      if (this.pressedKeys.has(key)) {
        return true;
      }
    }
    return false;
  }

  public getCurrentDirection(playerId: PlayerId): Direction | undefined {
    return this.playerDirections.get(playerId);
  }
}
