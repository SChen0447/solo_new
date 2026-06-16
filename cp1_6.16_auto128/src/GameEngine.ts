import type { Direction, PlayerId } from './InputHandler';
import type { Position, SnakeRenderData, FoodRenderData, RenderState } from './Renderer';

export const GRID_WIDTH = 60;
export const GRID_HEIGHT = 40;
export const INITIAL_SNAKE_LENGTH = 3;
export const BASE_SPEED = 8;
export const GAME_DURATION = 90;
export const NORMAL_FOOD_COUNT = 3;
export const SPECIAL_FOOD_INTERVAL = 15;
export const DEATH_DURATION = 1.0;
export const FLASH_CYCLES = 3;
export const FLASH_DURATION = 0.2;

export const PLAYER_COLORS: Record<PlayerId, { body: string; head: string; name: string }> = {
  red: { body: '#FF4444', head: '#FF8866', name: '红色玩家' },
  blue: { body: '#4488FF', head: '#66AAFF', name: '蓝色玩家' },
  green: { body: '#44DD44', head: '#88FF88', name: '绿色玩家' },
  purple: { body: '#CC44FF', head: '#DD88FF', name: '紫色玩家' }
};

interface Snake {
  id: PlayerId;
  body: Position[];
  direction: Direction;
  nextDirection: Direction;
  isAlive: boolean;
  score: number;
  deathTimer: number;
  prevScore: number;
  scoreBounceTimer: number;
}

interface Food {
  x: number;
  y: number;
  type: 'normal' | 'special';
}

export interface GameState {
  snakes: Snake[];
  foods: Food[];
  timeLeft: number;
  isGameOver: boolean;
  winner: PlayerId | null;
  specialFoodNoticeTimer: number;
}

type GameOverCallback = (winner: PlayerId | null, scores: Record<PlayerId, number>) => void;
type ScoreChangeCallback = (playerId: PlayerId, score: number) => void;
type SpecialFoodNoticeCallback = () => void;

export class GameEngine {
  private snakes: Map<PlayerId, Snake> = new Map();
  private foods: Food[] = [];
  private timeLeft: number = GAME_DURATION;
  private isGameOver: boolean = false;
  private winner: PlayerId | null = null;
  private specialFoodTimer: number = 0;
  private specialFoodNoticeTimer: number = 0;
  private moveAccumulator: number = 0;
  private gameOverCallback: GameOverCallback | null = null;
  private scoreChangeCallback: ScoreChangeCallback | null = null;
  private specialFoodNoticeCallback: SpecialFoodNoticeCallback | null = null;

  constructor() { }

  public setGameOverCallback(callback: GameOverCallback): void {
    this.gameOverCallback = callback;
  }

  public setScoreChangeCallback(callback: ScoreChangeCallback): void {
    this.scoreChangeCallback = callback;
  }

  public setSpecialFoodNoticeCallback(callback: SpecialFoodNoticeCallback): void {
    this.specialFoodNoticeCallback = callback;
  }

  public init(playerIds: PlayerId[]): void {
    this.snakes.clear();
    this.foods = [];
    this.timeLeft = GAME_DURATION;
    this.isGameOver = false;
    this.winner = null;
    this.specialFoodTimer = 0;
    this.specialFoodNoticeTimer = 0;
    this.moveAccumulator = 0;

    const startPositions = this.getStartPositions(playerIds.length);

    for (let i = 0; i < playerIds.length; i++) {
      const id = playerIds[i];
      const startPos = startPositions[i];
      const body: Position[] = [];

      for (let j = 0; j < INITIAL_SNAKE_LENGTH; j++) {
        body.push({ x: startPos.x - j, y: startPos.y });
      }

      this.snakes.set(id, {
        id,
        body,
        direction: 'right',
        nextDirection: 'right',
        isAlive: true,
        score: 0,
        deathTimer: 0,
        prevScore: 0,
        scoreBounceTimer: 0
      });
    }

    this.spawnInitialFoods();
  }

  private getStartPositions(count: number): Position[] {
    const positions: Position[] = [];
    const margin = 5;

    if (count >= 1) {
      positions.push({ x: margin, y: Math.floor(GRID_HEIGHT / 4) });
    }
    if (count >= 2) {
      positions.push({ x: GRID_WIDTH - margin - 1, y: Math.floor(GRID_HEIGHT * 3 / 4) });
    }
    if (count >= 3) {
      positions.push({ x: margin, y: Math.floor(GRID_HEIGHT * 3 / 4) });
    }
    if (count >= 4) {
      positions.push({ x: GRID_WIDTH - margin - 1, y: Math.floor(GRID_HEIGHT / 4) });
    }

    return positions;
  }

  private spawnInitialFoods(): void {
    for (let i = 0; i < NORMAL_FOOD_COUNT; i++) {
      this.spawnFood('normal');
    }
  }

  private spawnFood(type: 'normal' | 'special'): void {
    let attempts = 0;
    const maxAttempts = 1000;

    while (attempts < maxAttempts) {
      const x = Math.floor(Math.random() * GRID_WIDTH);
      const y = Math.floor(Math.random() * GRID_HEIGHT);

      if (this.isValidFoodPosition(x, y, type)) {
        this.foods.push({ x, y, type });
        return;
      }

      attempts++;
    }
  }

  private isValidFoodPosition(x: number, y: number, _type: 'normal' | 'special'): boolean {
    for (const food of this.foods) {
      if (food.x === x && food.y === y) {
        return false;
      }
    }

    for (const snake of this.snakes.values()) {
      if (!snake.isAlive && snake.deathTimer >= DEATH_DURATION) {
        continue;
      }
      for (const seg of snake.body) {
        if (seg.x === x && seg.y === y) {
          return false;
        }
      }
    }

    return true;
  }

  public updateDirection(playerId: PlayerId, direction: Direction): void {
    const snake = this.snakes.get(playerId);
    if (!snake || !snake.isAlive) return;

    const current = snake.direction;
    if (
      (direction === 'up' && current === 'down') ||
      (direction === 'down' && current === 'up') ||
      (direction === 'left' && current === 'right') ||
      (direction === 'right' && current === 'left')
    ) {
      return;
    }

    snake.nextDirection = direction;
  }

  public update(deltaTime: number): void {
    if (this.isGameOver) return;

    this.timeLeft -= deltaTime;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.endGame();
      return;
    }

    this.specialFoodTimer += deltaTime;
    if (this.specialFoodTimer >= SPECIAL_FOOD_INTERVAL) {
      this.specialFoodTimer = 0;
      this.refreshSpecialFood();
    }

    if (this.specialFoodNoticeTimer > 0) {
      this.specialFoodNoticeTimer -= deltaTime;
    }

    for (const snake of this.snakes.values()) {
      if (snake.scoreBounceTimer > 0) {
        snake.scoreBounceTimer -= deltaTime;
      }
    }

    this.updateDeathTimers(deltaTime);

    this.moveAccumulator += deltaTime;
    const moveInterval = 1 / BASE_SPEED;

    while (this.moveAccumulator >= moveInterval) {
      this.moveAccumulator -= moveInterval;
      this.tick();
    }
  }

  private updateDeathTimers(deltaTime: number): void {
    for (const snake of this.snakes.values()) {
      if (!snake.isAlive) {
        snake.deathTimer += deltaTime;
      }
    }
  }

  private tick(): void {
    for (const snake of this.snakes.values()) {
      if (snake.isAlive) {
        snake.direction = snake.nextDirection;
        this.moveSnake(snake);
      }
    }

    this.checkCollisions();
    this.checkFoodCollisions();
  }

  private moveSnake(snake: Snake): void {
    const head = { ...snake.body[0] };

    switch (snake.direction) {
      case 'up':
        head.y -= 1;
        break;
      case 'down':
        head.y += 1;
        break;
      case 'left':
        head.x -= 1;
        break;
      case 'right':
        head.x += 1;
        break;
    }

    snake.body.unshift(head);
    snake.body.pop();
  }

  private checkCollisions(): void {
    for (const snake of this.snakes.values()) {
      if (!snake.isAlive) continue;

      const head = snake.body[0];

      if (head.x < 0 || head.x >= GRID_WIDTH || head.y < 0 || head.y >= GRID_HEIGHT) {
        this.killSnake(snake);
        continue;
      }

      for (const otherSnake of this.snakes.values()) {
        if (!otherSnake.isAlive && otherSnake.deathTimer >= DEATH_DURATION) {
          continue;
        }

        const startIndex = snake.id === otherSnake.id ? 1 : 0;
        for (let i = startIndex; i < otherSnake.body.length; i++) {
          const seg = otherSnake.body[i];
          if (head.x === seg.x && head.y === seg.y) {
            this.killSnake(snake);
            break;
          }
        }

        if (!snake.isAlive) break;
      }
    }
  }

  private killSnake(snake: Snake): void {
    snake.isAlive = false;
    snake.deathTimer = 0;
  }

  private checkFoodCollisions(): void {
    const foodsToRemove: number[] = [];

    for (let fi = 0; fi < this.foods.length; fi++) {
      const food = this.foods[fi];

      for (const snake of this.snakes.values()) {
        if (!snake.isAlive) continue;

        const head = snake.body[0];
        if (head.x === food.x && head.y === food.y) {
          this.eatFood(snake, food);
          foodsToRemove.push(fi);
          break;
        }
      }
    }

    for (let i = foodsToRemove.length - 1; i >= 0; i--) {
      const idx = foodsToRemove[i];
      const food = this.foods[idx];
      this.foods.splice(idx, 1);

      if (food.type === 'normal') {
        this.spawnFood('normal');
      }
    }
  }

  private eatFood(snake: Snake, food: Food): void {
    snake.prevScore = snake.score;
    snake.scoreBounceTimer = 0.3;

    if (food.type === 'normal') {
      snake.score += 1;
      this.growSnake(snake, 1);
    } else {
      snake.score += 3;
      this.shrinkSnake(snake, 2);
    }

    if (this.scoreChangeCallback) {
      this.scoreChangeCallback(snake.id, snake.score);
    }
  }

  private growSnake(snake: Snake, amount: number): void {
    const tail = snake.body[snake.body.length - 1];
    for (let i = 0; i < amount; i++) {
      snake.body.push({ ...tail });
    }
  }

  private shrinkSnake(snake: Snake, amount: number): void {
    const minLength = 1;
    for (let i = 0; i < amount; i++) {
      if (snake.body.length > minLength) {
        snake.body.pop();
      }
    }
  }

  private refreshSpecialFood(): void {
    this.foods = this.foods.filter(f => f.type !== 'special');
    this.spawnFood('special');
    this.specialFoodNoticeTimer = 1.5;

    if (this.specialFoodNoticeCallback) {
      this.specialFoodNoticeCallback();
    }
  }

  private endGame(): void {
    this.isGameOver = true;
    this.winner = this.determineWinner();

    if (this.gameOverCallback) {
      const scores: Record<PlayerId, number> = {} as Record<PlayerId, number>;
      for (const [id, snake] of this.snakes) {
        scores[id] = snake.score;
      }
      this.gameOverCallback(this.winner, scores);
    }
  }

  private determineWinner(): PlayerId | null {
    let bestScore = -Infinity;
    let bestLength = -1;
    let winnerId: PlayerId | null = null;

    for (const snake of this.snakes.values()) {
      const len = snake.body.length;
      if (snake.score > bestScore || (snake.score === bestScore && len > bestLength)) {
        bestScore = snake.score;
        bestLength = len;
        winnerId = snake.id;
      }
    }

    return winnerId;
  }

  public getRenderState(): RenderState {
    const snakes: SnakeRenderData[] = [];

    for (const snake of this.snakes.values()) {
      const colors = PLAYER_COLORS[snake.id];
      const { flashPhase, flashAlpha } = this.calculateFlashState(snake);

      snakes.push({
        id: snake.id,
        color: colors.body,
        headColor: colors.head,
        body: [...snake.body],
        isAlive: snake.isAlive,
        deathFlashPhase: flashPhase,
        deathFlashAlpha: flashAlpha
      });
    }

    const foods: FoodRenderData[] = this.foods.map(f => ({
      x: f.x,
      y: f.y,
      type: f.type
    }));

    return {
      gridWidth: GRID_WIDTH,
      gridHeight: GRID_HEIGHT,
      cellSize: 20,
      snakes,
      foods
    };
  }

  private calculateFlashState(snake: Snake): { flashPhase: number; flashAlpha: number } {
    if (snake.isAlive) {
      return { flashPhase: 0, flashAlpha: 1 };
    }

    const t = snake.deathTimer;
    const totalFlashTime = FLASH_CYCLES * FLASH_DURATION;

    if (t >= DEATH_DURATION) {
      return { flashPhase: 0, flashAlpha: 0 };
    }

    if (t < totalFlashTime) {
      const phase = Math.floor(t / (FLASH_DURATION / 2));
      const alpha = phase % 2 === 0 ? 1.0 : 0.3;
      return { flashPhase: phase, flashAlpha: alpha };
    } else {
      const fadeProgress = (t - totalFlashTime) / (DEATH_DURATION - totalFlashTime);
      const alpha = 0.3 * (1 - fadeProgress);
      return { flashPhase: FLASH_CYCLES * 2, flashAlpha: alpha };
    }
  }

  public getTimeLeft(): number {
    return this.timeLeft;
  }

  public getIsGameOver(): boolean {
    return this.isGameOver;
  }

  public getWinner(): PlayerId | null {
    return this.winner;
  }

  public getSnakeScore(playerId: PlayerId): number {
    const snake = this.snakes.get(playerId);
    return snake ? snake.score : 0;
  }

  public getSnakeScoreBounce(playerId: PlayerId): boolean {
    const snake = this.snakes.get(playerId);
    return snake ? snake.scoreBounceTimer > 0 : false;
  }

  public getSpecialFoodNoticeTimer(): number {
    return this.specialFoodNoticeTimer;
  }

  public getActivePlayers(): PlayerId[] {
    return Array.from(this.snakes.keys());
  }
}
