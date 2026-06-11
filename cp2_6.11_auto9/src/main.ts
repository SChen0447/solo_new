import { Level, TOTAL_LEVELS, TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } from './level';
import { Player, InputState } from './player';
import { Renderer, GAME_WIDTH, GAME_HEIGHT } from './renderer';

const ASPECT_RATIO = 16 / 9;

type GameState = 'playing' | 'levelComplete' | 'gameOver' | 'victory';

class Game {
  private canvas: HTMLCanvasElement;
  private container: HTMLElement;
  private renderer: Renderer;
  private player: Player;
  private level: Level;
  private currentLevelIndex: number;
  private gameState: GameState;
  private input: InputState;
  private lastTime: number;
  private animationId: number;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.container = document.getElementById('game-container') as HTMLElement;
    this.currentLevelIndex = 0;
    this.gameState = 'playing';
    this.input = { up: false, down: false, left: false, right: false };
    this.lastTime = 0;
    this.animationId = 0;

    this.canvas.width = GAME_WIDTH;
    this.canvas.height = GAME_HEIGHT;

    this.renderer = new Renderer(this.canvas);
    this.level = new Level(this.currentLevelIndex);
    this.player = new Player(this.level.getStartPosition());

    this.bindEvents();
    this.resizeCanvas();
    this.startLoop();
  }

  private bindEvents(): void {
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  private handleKeyDown(e: KeyboardEvent): void {
    switch (e.key.toLowerCase()) {
      case 'w':
      case 'arrowup':
        this.input.up = true;
        e.preventDefault();
        break;
      case 's':
      case 'arrowdown':
        this.input.down = true;
        e.preventDefault();
        break;
      case 'a':
      case 'arrowleft':
        this.input.left = true;
        e.preventDefault();
        break;
      case 'd':
      case 'arrowright':
        this.input.right = true;
        e.preventDefault();
        break;
      case ' ':
        if (this.gameState !== 'playing') {
          this.handleSpacePress();
        }
        e.preventDefault();
        break;
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    switch (e.key.toLowerCase()) {
      case 'w':
      case 'arrowup':
        this.input.up = false;
        break;
      case 's':
      case 'arrowdown':
        this.input.down = false;
        break;
      case 'a':
      case 'arrowleft':
        this.input.left = false;
        break;
      case 'd':
      case 'arrowright':
        this.input.right = false;
        break;
    }
  }

  private handleSpacePress(): void {
    if (this.gameState === 'levelComplete') {
      this.currentLevelIndex++;
      if (this.currentLevelIndex >= TOTAL_LEVELS) {
        this.gameState = 'victory';
      } else {
        this.loadLevel(this.currentLevelIndex);
      }
    } else if (this.gameState === 'gameOver') {
      this.loadLevel(this.currentLevelIndex);
    } else if (this.gameState === 'victory') {
      this.currentLevelIndex = 0;
      this.loadLevel(0);
    }
  }

  private loadLevel(index: number): void {
    this.level = new Level(index);
    this.player.resetPosition(this.level.getStartPosition());
    this.gameState = 'playing';
  }

  private resizeCanvas(): void {
    const containerWidth = this.container.clientWidth;
    const containerHeight = this.container.clientHeight;

    let canvasWidth: number;
    let canvasHeight: number;

    if (containerWidth / containerHeight > ASPECT_RATIO) {
      canvasHeight = containerHeight;
      canvasWidth = canvasHeight * ASPECT_RATIO;
    } else {
      canvasWidth = containerWidth;
      canvasHeight = canvasWidth / ASPECT_RATIO;
    }

    this.canvas.style.width = `${canvasWidth}px`;
    this.canvas.style.height = `${canvasHeight}px`;
  }

  private startLoop(): void {
    this.lastTime = performance.now();
    const loop = (time: number) => {
      const deltaTime = Math.min((time - this.lastTime) / 1000, 1 / 30);
      this.lastTime = time;

      this.update(deltaTime);
      this.render();

      this.animationId = requestAnimationFrame(loop);
    };
    this.animationId = requestAnimationFrame(loop);
  }

  private update(deltaTime: number): void {
    if (this.gameState === 'playing') {
      this.level.update(deltaTime, this.player.getX(), this.player.getY());
      this.player.update(deltaTime, this.input, this.level);

      if (this.level.isTimeUp()) {
        this.gameState = 'gameOver';
      } else if (this.level.canExit() && this.level.isNearExit(this.player.getX(), this.player.getY())) {
        this.gameState = 'levelComplete';
        if (this.currentLevelIndex >= TOTAL_LEVELS - 1) {
          this.gameState = 'victory';
        }
      }
    }
  }

  private render(): void {
    this.renderer.render(this.level, this.player, this.gameState);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
