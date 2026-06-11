export interface PlayerState {
  x: number;
  y: number;
  radius: number;
  targetX: number;
  baseY: number;
  speed: number;
  forwardSpeed: number;
  maxForwardSpeed: number;
  acceleration: number;
  shieldCount: number;
  maxShields: number;
  isShieldActive: boolean;
  shieldFlashTimer: number;
  energy: number;
  maxEnergy: number;
  isFrozen: boolean;
  freezeDuration: number;
  freezeTimer: number;
  trail: Array<{ x: number; y: number; alpha: number }>;
  glowIntensity: number;
}

export interface PlayerConfig {
  canvasWidth: number;
  canvasHeight: number;
  groundY: number;
}

export class Player {
  state: PlayerState;
  private config: PlayerConfig;
  private keys: Set<string> = new Set();
  private touchStartX: number = 0;
  private isTouching: boolean = false;

  constructor(config: PlayerConfig) {
    this.config = config;
    this.state = this.createInitialState();
    this.setupInputListeners();
  }

  private createInitialState(): PlayerState {
    const groundY = this.config.groundY;
    const radius = 22;
    return {
      x: this.config.canvasWidth * 0.25,
      y: groundY - radius,
      radius,
      targetX: this.config.canvasWidth * 0.25,
      baseY: groundY - radius,
      speed: 0,
      forwardSpeed: 280,
      maxForwardSpeed: 650,
      acceleration: 8,
      shieldCount: 2,
      maxShields: 2,
      isShieldActive: false,
      shieldFlashTimer: 0,
      energy: 0,
      maxEnergy: 10,
      isFrozen: false,
      freezeDuration: 3,
      freezeTimer: 0,
      trail: [],
      glowIntensity: 1
    };
  }

  private setupInputListeners(): void {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key);
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        this.tryUseFreeze();
      }
      if (e.key === 'Shift') {
        this.tryUseShield();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key);
    });

    const canvas = document.getElementById('game-canvas');
    if (canvas) {
      canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.isTouching = true;
        this.touchStartX = e.touches[0].clientX;
      }, { passive: false });

      canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (this.isTouching) {
          const touchX = e.touches[0].clientX;
          const deltaX = touchX - this.touchStartX;
          this.state.targetX = Math.max(
            this.state.radius + 20,
            Math.min(
              this.config.canvasWidth - this.state.radius - 20,
              this.state.x + deltaX * 0.5
            )
          );
          this.touchStartX = touchX;
        }
      }, { passive: false });

      canvas.addEventListener('touchend', () => {
        this.isTouching = false;
      });
    }
  }

  update(deltaTime: number): void {
    const s = this.state;

    if (s.forwardSpeed < s.maxForwardSpeed) {
      s.forwardSpeed += s.acceleration * deltaTime;
      if (s.forwardSpeed > s.maxForwardSpeed) {
        s.forwardSpeed = s.maxForwardSpeed;
      }
    }

    let horizontalSpeed = 0;
    if (this.keys.has('ArrowLeft') || this.keys.has('a') || this.keys.has('A')) {
      horizontalSpeed -= 350;
    }
    if (this.keys.has('ArrowRight') || this.keys.has('d') || this.keys.has('D')) {
      horizontalSpeed += 350;
    }

    if (horizontalSpeed !== 0) {
      s.targetX = Math.max(
        s.radius + 20,
        Math.min(this.config.canvasWidth - s.radius - 20, s.x + horizontalSpeed * deltaTime)
      );
    }

    const lerpSpeed = 12;
    s.x += (s.targetX - s.x) * Math.min(1, lerpSpeed * deltaTime);

    s.trail.unshift({ x: s.x, y: s.y, alpha: 1 });
    if (s.trail.length > 20) {
      s.trail.pop();
    }
    s.trail.forEach((t, i) => {
      t.alpha = Math.max(0, 1 - i / 20);
    });

    s.glowIntensity = 0.8 + Math.sin(Date.now() * 0.005) * 0.2;

    if (s.isShieldActive) {
      s.shieldFlashTimer -= deltaTime;
      if (s.shieldFlashTimer <= 0) {
        s.isShieldActive = false;
      }
    }

    if (s.isFrozen) {
      s.freezeTimer -= deltaTime;
      if (s.freezeTimer <= 0) {
        s.isFrozen = false;
      }
    }
  }

  collectEnergy(): void {
    this.state.energy = Math.min(this.state.maxEnergy, this.state.energy + 1);
  }

  tryUseFreeze(): boolean {
    if (this.state.energy >= this.state.maxEnergy && !this.state.isFrozen) {
      this.state.energy = 0;
      this.state.isFrozen = true;
      this.state.freezeTimer = this.state.freezeDuration;
      return true;
    }
    return false;
  }

  tryUseShield(): boolean {
    if (this.state.shieldCount > 0 && !this.state.isShieldActive) {
      this.state.shieldCount--;
      this.state.isShieldActive = true;
      this.state.shieldFlashTimer = 0.5;
      return true;
    }
    return false;
  }

  activateShield(): void {
    if (this.state.shieldCount > 0) {
      this.state.shieldCount--;
      this.state.isShieldActive = true;
      this.state.shieldFlashTimer = 0.5;
    }
  }

  addShield(): void {
    this.state.shieldCount = Math.min(this.state.maxShields, this.state.shieldCount + 1);
  }

  getHitbox(): { x: number; y: number; radius: number } {
    return {
      x: this.state.x,
      y: this.state.y,
      radius: this.state.radius * 0.7
    };
  }

  reset(): void {
    const initial = this.createInitialState();
    Object.assign(this.state, initial);
  }

  resize(width: number, height: number, groundY: number): void {
    this.config.canvasWidth = width;
    this.config.canvasHeight = height;
    this.config.groundY = groundY;
    this.state.baseY = groundY - this.state.radius;
    this.state.y = groundY - this.state.radius;
    this.state.x = Math.min(this.state.x, width - this.state.radius - 20);
    this.state.targetX = this.state.x;
  }
}
