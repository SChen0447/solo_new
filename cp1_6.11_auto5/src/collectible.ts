export interface Collectible {
  id: number;
  x: number;
  y: number;
  radius: number;
  speed: number;
  isCollected: boolean;
  pulsePhase: number;
  floatOffset: number;
  floatSpeed: number;
  color: string;
}

export interface ComboState {
  count: number;
  maxCombo: number;
  timer: number;
  comboTimeout: number;
  multiplier: number;
}

export interface CollectibleManagerConfig {
  canvasWidth: number;
  canvasHeight: number;
  groundY: number;
}

export class CollectibleManager {
  private config: CollectibleManagerConfig;
  private collectibles: Collectible[] = [];
  private nextId: number = 0;
  private spawnTimer: number = 0;
  private spawnInterval: number = 1.2;
  private comboState: ComboState;
  private score: number = 0;
  private baseScore: number = 10;
  private colors: string[] = [
    '#7cffcb',
    '#b388ff',
    '#82b1ff',
    '#80deea',
    '#ea80fc'
  ];

  constructor(config: CollectibleManagerConfig) {
    this.config = config;
    this.comboState = {
      count: 0,
      maxCombo: 0,
      timer: 0,
      comboTimeout: 2.5,
      multiplier: 1
    };
  }

  update(deltaTime: number, forwardSpeed: number, isFrozen: boolean): void {
    if (this.comboState.count > 0) {
      this.comboState.timer -= deltaTime;
      if (this.comboState.timer <= 0) {
        this.resetCombo();
      }
    }

    if (!isFrozen) {
      this.spawnTimer += deltaTime;
      if (this.spawnTimer >= this.spawnInterval) {
        this.spawnTimer = 0;
        this.spawnCollectible(forwardSpeed);
      }
    }

    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const c = this.collectibles[i];

      if (!isFrozen) {
        c.x -= c.speed * deltaTime;
      }

      c.pulsePhase += deltaTime * 4;
      c.floatOffset = Math.sin(c.pulsePhase * 0.5) * 8;

      if (c.x + c.radius < -50 || c.isCollected) {
        this.collectibles.splice(i, 1);
      }
    }
  }

  private spawnCollectible(forwardSpeed: number): void {
    const minY = this.config.groundY - 180;
    const maxY = this.config.groundY - 60;
    const y = minY + Math.random() * (maxY - minY);

    const count = Math.random() < 0.4 ? 3 : (Math.random() < 0.6 ? 2 : 1);
    const spacing = 45;
    const startX = this.config.canvasWidth + 30;

    for (let i = 0; i < count; i++) {
      const collectible: Collectible = {
        id: this.nextId++,
        x: startX + i * spacing,
        y: y + (Math.random() - 0.5) * 20,
        radius: 12,
        speed: forwardSpeed,
        isCollected: false,
        pulsePhase: Math.random() * Math.PI * 2,
        floatOffset: 0,
        floatSpeed: 2 + Math.random() * 2,
        color: this.colors[Math.floor(Math.random() * this.colors.length)]
      };
      this.collectibles.push(collectible);
    }
  }

  checkCollection(hitbox: { x: number; y: number; radius: number }): Collectible | null {
    for (const c of this.collectibles) {
      if (c.isCollected) continue;

      const dx = hitbox.x - c.x;
      const dy = hitbox.y - (c.y + c.floatOffset);
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < hitbox.radius + c.radius) {
        c.isCollected = true;
        this.addCombo();
        const points = Math.floor(this.baseScore * this.comboState.multiplier);
        this.score += points;
        return c;
      }
    }
    return null;
  }

  private addCombo(): void {
    this.comboState.count++;
    this.comboState.timer = this.comboState.comboTimeout;
    this.comboState.maxCombo = Math.max(this.comboState.maxCombo, this.comboState.count);
    this.comboState.multiplier = 1 + Math.floor(this.comboState.count / 5) * 0.5;
    if (this.comboState.multiplier > 3) {
      this.comboState.multiplier = 3;
    }
  }

  resetCombo(): void {
    this.comboState.count = 0;
    this.comboState.timer = 0;
    this.comboState.multiplier = 1;
  }

  getCollectibles(): Collectible[] {
    return this.collectibles.filter(c => !c.isCollected);
  }

  getComboState(): ComboState {
    return { ...this.comboState };
  }

  getScore(): number {
    return this.score;
  }

  addScore(points: number): void {
    this.score += points;
  }

  reset(): void {
    this.collectibles = [];
    this.spawnTimer = 0;
    this.score = 0;
    this.nextId = 0;
    this.comboState = {
      count: 0,
      maxCombo: 0,
      timer: 0,
      comboTimeout: 2.5,
      multiplier: 1
    };
  }

  resize(width: number, height: number, groundY: number): void {
    this.config.canvasWidth = width;
    this.config.canvasHeight = height;
    this.config.groundY = groundY;
  }
}
