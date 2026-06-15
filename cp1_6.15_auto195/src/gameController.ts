import {
  TILE_SIZE,
  PLAYER_SPEED,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  GameState,
  GameStatus,
  InputState,
  Player,
  Tile,
  Item,
  Exit,
  Position,
  Monster
} from './types';
import { MapGenerator } from './mapGenerator';
import { LightSystem } from './lightSystem';
import { MonsterAI } from './monsterAI';
import { Renderer } from './renderer';

export class GameController {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private renderer: Renderer;
  private mapGenerator: MapGenerator;
  private lightSystem: LightSystem;
  private monsterAI: MonsterAI | null;

  private state: GameState;
  private input: InputState;
  private camera: Position;

  private lastTime: number;
  private animationId: number | null;
  private running: boolean;

  private onGameOverCallback: (() => void) | null;
  private onWinCallback: (() => void) | null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D rendering context');
    }
    this.ctx = ctx;

    this.renderer = new Renderer(this.ctx);
    this.mapGenerator = new MapGenerator();

    const dummyPos: Position = { x: 0, y: 0 };
    this.lightSystem = new LightSystem(dummyPos);

    this.monsterAI = null;
    this.camera = { x: 0, y: 0 };

    this.state = this.createEmptyState();
    this.input = {
      keys: {},
      mouseX: CANVAS_WIDTH / 2,
      mouseY: CANVAS_HEIGHT / 2
    };

    this.lastTime = 0;
    this.animationId = null;
    this.running = false;

    this.onGameOverCallback = null;
    this.onWinCallback = null;

    this.bindEvents();
    this.initGame();
  }

  private createEmptyState(): GameState {
    const dummyMap: Tile[][] = [];
    const dummyItems: Item[] = [];
    const dummyExit: Exit = {
      position: { x: 0, y: 0 },
      gridX: 0,
      gridY: 0,
      unlocked: false
    };
    const dummyPlayer: Player = {
      position: { x: 0, y: 0 },
      hasKey: false,
      batteryCount: 0
    };
    const dummyMonsters: Monster[] = [];

    return {
      map: dummyMap,
      items: dummyItems,
      exit: dummyExit,
      player: dummyPlayer,
      monsters: dummyMonsters,
      light: { battery: 100, angle: 0, isOn: true },
      status: 'playing',
      statusTimer: 0,
      time: 0,
      deltaTime: 0
    };
  }

  private bindEvents(): void {
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private unbindEvents(): void {
    window.removeEventListener('keydown', this.handleKeyDown.bind(this));
    window.removeEventListener('keyup', this.handleKeyUp.bind(this));
    this.canvas.removeEventListener('mousemove', this.handleMouseMove.bind(this));
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    this.input.keys[key] = true;

    if (key === 'r' && this.state.status !== 'playing') {
      this.restart();
    }

    if (key === 'f') {
      if (this.lightSystem.isLightOn()) {
        this.lightSystem.turnOff();
      } else {
        this.lightSystem.turnOn();
      }
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.input.keys[e.key.toLowerCase()] = false;
  }

  private handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    const screenX = (e.clientX - rect.left) * scaleX;
    const screenY = (e.clientY - rect.top) * scaleY;

    this.input.mouseX = screenX + this.camera.x;
    this.input.mouseY = screenY + this.camera.y;
  }

  initGame(): void {
    const mapData = this.mapGenerator.generate();

    this.state.map = mapData.map;
    this.state.items = mapData.items;
    this.state.exit = mapData.exit;
    this.state.player = {
      position: { ...mapData.startPos },
      hasKey: false,
      batteryCount: 0
    };
    this.state.status = 'playing';
    this.state.statusTimer = 0;
    this.state.time = 0;
    this.state.deltaTime = 0;

    this.lightSystem = new LightSystem(this.state.player.position);
    this.lightSystem.reset();

    this.monsterAI = new MonsterAI(this.state.map);
    this.monsterAI.setLightChecker(
      (px: number, py: number, playerPos: Position) =>
        this.lightSystem.isPointInLight(px, py, playerPos)
    );
    this.state.monsters = this.monsterAI.getMonsters();

    this.renderer.setMapSize(
      this.mapGenerator.getGridWidth(),
      this.mapGenerator.getGridHeight()
    );
    this.renderer.setLightFunctions(
      (pos: Position) => this.lightSystem.getLightPolygonPoints(pos),
      (px: number, py: number, pos: Position) =>
        this.lightSystem.getLightIntensityAt(px, py, pos)
    );

    this.updateCamera();
  }

  restart(): void {
    this.mapGenerator = new MapGenerator();
    this.initGame();
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.gameLoop();
  }

  stop(): void {
    this.running = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private gameLoop(): void {
    if (!this.running) return;

    const currentTime = performance.now();
    let deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    const maxDelta = 50;
    if (deltaTime > maxDelta) {
      deltaTime = maxDelta;
    }

    this.state.time += deltaTime;
    this.state.deltaTime = deltaTime;

    if (this.state.status === 'playing') {
      this.update(deltaTime);
    } else {
      this.state.statusTimer += deltaTime;
    }

    this.render();
    this.updateCamera();

    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update(deltaTime: number): void {
    this.updatePlayer(deltaTime);
    this.lightSystem.update(deltaTime, this.input.mouseX, this.input.mouseY);
    this.state.light = this.lightSystem.getState();

    this.checkItemCollision();
    this.checkExitCollision();

    if (this.monsterAI) {
      const monsterResult = this.monsterAI.update(
        deltaTime,
        this.state.player,
        this.state.light,
        this.state.player.position
      );
      this.state.monsters = monsterResult.monsters;

      if (monsterResult.dead) {
        this.setStatus('lost');
      }
    }

    if (this.lightSystem.getBattery() <= 0) {
      this.setStatus('lost');
    }
  }

  private updatePlayer(deltaTime: number): void {
    const dt = deltaTime / 16.67;
    let dx = 0;
    let dy = 0;

    if (this.input.keys['w'] || this.input.keys['arrowup']) dy -= 1;
    if (this.input.keys['s'] || this.input.keys['arrowdown']) dy += 1;
    if (this.input.keys['a'] || this.input.keys['arrowleft']) dx -= 1;
    if (this.input.keys['d'] || this.input.keys['arrowright']) dx += 1;

    if (dx !== 0 && dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;
    }

    const moveSpeed = PLAYER_SPEED * dt;
    const newX = this.state.player.position.x + dx * moveSpeed;
    const newY = this.state.player.position.y + dy * moveSpeed;

    const playerRadius = 6;
    if (
      this.mapGenerator.isWalkable(newX - playerRadius, this.state.player.position.y) &&
      this.mapGenerator.isWalkable(newX + playerRadius, this.state.player.position.y)
    ) {
      this.state.player.position.x = newX;
    }

    if (
      this.mapGenerator.isWalkable(this.state.player.position.x, newY - playerRadius) &&
      this.mapGenerator.isWalkable(this.state.player.position.x, newY + playerRadius)
    ) {
      this.state.player.position.y = newY;
    }

    const gridW = this.mapGenerator.getGridWidth();
    const gridH = this.mapGenerator.getGridHeight();
    this.state.player.position.x = Math.max(
      TILE_SIZE / 2,
      Math.min(gridW * TILE_SIZE - TILE_SIZE / 2, this.state.player.position.x)
    );
    this.state.player.position.y = Math.max(
      TILE_SIZE / 2,
      Math.min(gridH * TILE_SIZE - TILE_SIZE / 2, this.state.player.position.y)
    );
  }

  private checkItemCollision(): void {
    const playerPos = this.state.player.position;
    const pickupRadius = 20;

    for (const item of this.state.items) {
      if (item.collected) continue;

      const dx = item.position.x - playerPos.x;
      const dy = item.position.y - playerPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < pickupRadius) {
        if (item.type === 'battery') {
          if (this.lightSystem.pickUpBattery(item)) {
            item.collected = true;
            this.state.player.batteryCount++;
            this.state.light = this.lightSystem.getState();
          }
        } else if (item.type === 'key') {
          item.collected = true;
          this.state.player.hasKey = true;
          this.state.exit.unlocked = true;
        }
      }
    }
  }

  private checkExitCollision(): void {
    if (!this.state.player.hasKey) return;

    const playerPos = this.state.player.position;
    const exitPos = this.state.exit.position;
    const dx = exitPos.x - playerPos.x;
    const dy = exitPos.y - playerPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < TILE_SIZE * 0.5) {
      this.setStatus('won');
    }
  }

  private setStatus(status: GameStatus): void {
    if (this.state.status !== 'playing') return;
    this.state.status = status;
    this.state.statusTimer = 0;

    if (status === 'won' && this.onWinCallback) {
      this.onWinCallback();
    } else if (status === 'lost' && this.onGameOverCallback) {
      this.onGameOverCallback();
    }
  }

  private updateCamera(): void {
    let targetX = this.state.player.position.x - CANVAS_WIDTH / 2;
    let targetY = this.state.player.position.y - CANVAS_HEIGHT / 2;

    const gridW = this.mapGenerator.getGridWidth();
    const gridH = this.mapGenerator.getGridHeight();
    const mapPixelW = gridW * TILE_SIZE;
    const mapPixelH = gridH * TILE_SIZE;

    targetX = Math.max(0, Math.min(mapPixelW - CANVAS_WIDTH, targetX));
    targetY = Math.max(0, Math.min(mapPixelH - CANVAS_HEIGHT, targetY));

    if (mapPixelW < CANVAS_WIDTH) {
      targetX = (mapPixelW - CANVAS_WIDTH) / 2;
    }
    if (mapPixelH < CANVAS_HEIGHT) {
      targetY = (mapPixelH - CANVAS_HEIGHT) / 2;
    }

    this.camera.x += (targetX - this.camera.x) * 0.15;
    this.camera.y += (targetY - this.camera.y) * 0.15;
  }

  private render(): void {
    this.renderer.clear();
    this.renderer.render(this.state);
  }

  getState(): GameState {
    return { ...this.state };
  }

  setOnGameOver(callback: () => void): void {
    this.onGameOverCallback = callback;
  }

  setOnWin(callback: () => void): void {
    this.onWinCallback = callback;
  }

  destroy(): void {
    this.stop();
    this.unbindEvents();
  }
}
