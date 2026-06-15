import {
  GRID_COLS,
  GRID_ROWS,
  TOTAL_WAVES,
  GridCell,
  Tower,
  TowerType,
  Enemy,
  Projectile,
  Particle,
  FloatingText,
  RippleEffect,
  TOWER_CONFIGS,
  UPGRADE_COSTS,
  ENEMY_CONFIGS,
  SELL_RATIO,
  eventBus,
  GAME_EVENTS,
  GameData,
  WaveEnemyDef,
  EnemyType
} from '../types/index';

const MAX_ENTITIES = 300;
const MAX_PARTICLES = 300;
const MAX_FLOATING = 50;
const MAX_RIPPLES = 20;

type MapGridRef = {
  getGrid(): GridCell[][];
  getTowers(): Tower[];
  getTower(id: string): Tower | null;
  canBuildAt(x: number, y: number): boolean;
  getCols(): number;
  getRows(): number;
  getPathCoords(): Array<[number, number]>;
};

type BattleRef = {
  getProjectiles(): Projectile[];
  getGameData(): GameData;
  canBuildTower(type: TowerType): boolean;
  canUpgradeTower(id: string): boolean;
  getUpgradeCost(id: string): number | null;
  getSellValue(id: string): number | null;
  isPaused(): boolean;
};

type EnemyRef = {
  getEnemies(): Enemy[];
  getNextWaveEnemies(wave: number): WaveEnemyDef[];
};

export class UiRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private container: HTMLElement;
  private mapGrid: MapGridRef;
  private battle: BattleRef;
  private enemyMgr: EnemyRef;

  private cellSize: number;
  private offsetX: number;
  private offsetY: number;
  private mapWidth: number;
  private mapHeight: number;
  private sidePanelW: number;

  private particles: Particle[];
  private particlePool: Particle[];
  private floatingTexts: FloatingText[];
  private floatingPool: FloatingText[];
  private ripples: RippleEffect[];
  private ripplePool: RippleEffect[];
  private nextId: number;

  private mouseX: number;
  private mouseY: number;
  private mouseOverCanvas: boolean;
  private selectedBuildType: TowerType | null;
  private selectedTowerId: string | null;
  private hoverCell: { x: number; y: number } | null;

  private gold: number;
  private lives: number;
  private gameData: GameData;

  constructor(
    canvas: HTMLCanvasElement,
    container: HTMLElement,
    mapGrid: MapGridRef,
    battle: BattleRef,
    enemyMgr: EnemyRef
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.container = container;
    this.mapGrid = mapGrid;
    this.battle = battle;
    this.enemyMgr = enemyMgr;

    this.cellSize = 40;
    this.offsetX = 20;
    this.offsetY = 80;
    this.mapWidth = GRID_COLS * this.cellSize;
    this.mapHeight = GRID_ROWS * this.cellSize;
    this.sidePanelW = 180;

    this.particles = [];
    this.particlePool = [];
    this.floatingTexts = [];
    this.floatingPool = [];
    this.ripples = [];
    this.ripplePool = [];
    this.nextId = 1;

    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseOverCanvas = false;
    this.selectedBuildType = null;
    this.selectedTowerId = null;
    this.hoverCell = null;

    this.gold = 0;
    this.lives = 0;
    this.gameData = battle.getGameData() as GameData;

    this.initPools();
    this.resize();
    this.setupEventListeners();
    this.setupDomListeners();
  }

  private initPools(): void {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particlePool.push({
        id: '', x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, color: '#fff', size: 0, active: false
      });
    }
    for (let i = 0; i < MAX_FLOATING; i++) {
      this.floatingPool.push({
        id: '', x: 0, y: 0, text: '', color: '#fff', life: 0, maxLife: 0, active: false
      });
    }
    for (let i = 0; i < MAX_RIPPLES; i++) {
      this.ripplePool.push({
        id: '', x: 0, y: 0, radius: 0, maxRadius: 0, life: 0, maxLife: 0, active: false
      });
    }
  }

  private setupEventListeners(): void {
    eventBus.on(GAME_EVENTS.GOLD_CHANGED, (g: number) => { this.gold = g; });
    eventBus.on(GAME_EVENTS.LIVES_CHANGED, (l: number) => { this.lives = l; });
    eventBus.on(GAME_EVENTS.ENEMY_KILLED, (enemy: Enemy) => {
      this.spawnBurstParticles(enemy.x, enemy.y, 12, '#ffffff');
      this.addFloatingText(enemy.x, enemy.y - 20, `+${enemy.reward}`, '#ffd700');
    });
    eventBus.on(GAME_EVENTS.TOWER_PLACED, (tower: Tower) => {
      const cx = this.offsetX + (tower.gridX + 0.5) * this.cellSize;
      const cy = this.offsetY + (tower.gridY + 0.5) * this.cellSize;
      this.addRipple(cx, cy, this.cellSize * 1.5, 0.3, '#44aaff');
    });
    eventBus.on(GAME_EVENTS.TOWER_SOLD, (tower: Tower) => {
      const cx = this.offsetX + (tower.gridX + 0.5) * this.cellSize;
      const cy = this.offsetY + (tower.gridY + 0.5) * this.cellSize;
      const refund = Math.floor(tower.totalCost * SELL_RATIO);
      this.addFloatingText(cx, cy - 20, `+${refund}`, '#ffd700');
    });
    eventBus.on(GAME_EVENTS.RESTART, () => {
      this.clearEffects();
      this.selectedBuildType = null;
      this.selectedTowerId = null;
    });
  }

  private clearEffects(): void {
    for (const p of this.particles) { p.active = false; this.particlePool.push(p); }
    for (const f of this.floatingTexts) { f.active = false; this.floatingPool.push(f); }
    for (const r of this.ripples) { r.active = false; this.ripplePool.push(r); }
    this.particles = [];
    this.floatingTexts = [];
    this.ripples = [];
  }

  private setupDomListeners(): void {
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = (e.clientX - rect.left) * (this.canvas.width / rect.width);
      this.mouseY = (e.clientY - rect.top) * (this.canvas.height / rect.height);
      this.mouseOverCanvas = true;
      this.updateHoverCell();
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.mouseOverCanvas = false;
      this.hoverCell = null;
    });

    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (this.canvas.width / rect.width);
      const my = (e.clientY - rect.top) * (this.canvas.height / rect.height);
      this.handleClick(mx, my);
    });
  }

  private updateHoverCell(): void {
    const gx = Math.floor((this.mouseX - this.offsetX) / this.cellSize);
    const gy = Math.floor((this.mouseY - this.offsetY) / this.cellSize);
    if (gx >= 0 && gx < GRID_COLS && gy >= 0 && gy < GRID_ROWS) {
      this.hoverCell = { x: gx, y: gy };
    } else {
      this.hoverCell = null;
    }
  }

  private handleClick(mx: number, my: number): void {
    if (this.gameData.state === 'gameover') return;

    if (mx > this.mapWidth + this.offsetX + 10 && mx < this.mapWidth + this.offsetX + this.sidePanelW - 10) {
      this.handleSidePanelClick(my);
      return;
    }

    const state = this.gameData.state as string;
    if (state === 'gameover' || state === 'victory') {
      const btnX = this.canvas.width / 2 - 80;
      const btnY = this.canvas.height / 2 + 60;
      if (mx >= btnX && mx <= btnX + 160 && my >= btnY && my <= btnY + 50) {
        eventBus.emit(GAME_EVENTS.RESTART);
      }
      return;
    }

    const gx = Math.floor((mx - this.offsetX) / this.cellSize);
    const gy = Math.floor((my - this.offsetY) / this.cellSize);
    if (gx < 0 || gx >= GRID_COLS || gy < 0 || gy >= GRID_ROWS) return;

    const cell = this.mapGrid.getGrid()[gy][gx];
    if (this.selectedBuildType) {
      if (this.mapGrid.canBuildAt(gx, gy) && this.battle.canBuildTower(this.selectedBuildType)) {
        eventBus.emit(GAME_EVENTS.UI_BUILD_CLICKED, this.selectedBuildType, gx, gy);
        if (!this.battle.canBuildTower(this.selectedBuildType)) {
          this.selectedBuildType = null;
        }
      }
    } else if (cell.towerId) {
      this.selectedTowerId = cell.towerId;
    } else {
      this.selectedTowerId = null;
    }

    const countdownBtnX = this.canvas.width - 200;
    const countdownBtnY = 35;
    if (mx >= countdownBtnX && mx <= countdownBtnX + 160 && my >= countdownBtnY && my <= countdownBtnY + 35) {
      if (this.gameData.state === 'preparing') {
        eventBus.emit(GAME_EVENTS.UI_START_WAVE);
      }
    }
  }

  private handleSidePanelClick(my: number): void {
    const types: TowerType[] = ['arrow', 'magic', 'cannon', 'slow'];
    const panelTop = this.offsetY;
    const itemH = 110;
    for (let i = 0; i < types.length; i++) {
      const itemTop = panelTop + i * itemH + 10;
      if (my >= itemTop && my <= itemTop + itemH - 20) {
        if (this.battle.canBuildTower(types[i])) {
          this.selectedBuildType = types[i];
          this.selectedTowerId = null;
        }
        return;
      }
    }

    if (this.selectedTowerId) {
      const upgradeY = this.offsetY + types.length * itemH + 20;
      const sellY = upgradeY + 55;
      if (my >= upgradeY && my <= upgradeY + 45) {
        if (this.battle.canUpgradeTower(this.selectedTowerId)) {
          eventBus.emit(GAME_EVENTS.UI_UPGRADE_CLICKED, this.selectedTowerId);
        }
      } else if (my >= sellY && my <= sellY + 45) {
        eventBus.emit(GAME_EVENTS.UI_SELL_CLICKED, this.selectedTowerId);
        this.selectedTowerId = null;
      }
    }
  }

  public resize(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.canvas.width = w;
    this.canvas.height = h;

    const sidePanel = 180;
    const topMargin = 70;
    const bottomMargin = 20;
    const availW = w - sidePanel - 40;
    const availH = h - topMargin - bottomMargin;
    const cellByW = Math.floor(availW / GRID_COLS);
    const cellByH = Math.floor(availH / GRID_ROWS);
    this.cellSize = Math.max(20, Math.min(cellByW, cellByH));

    this.mapWidth = GRID_COLS * this.cellSize;
    this.mapHeight = GRID_ROWS * this.cellSize;
    this.offsetX = 20;
    this.offsetY = topMargin;
    this.sidePanelW = sidePanel;
  }

  public getCellSize(): number { return this.cellSize; }
  public getOffsetX(): number { return this.offsetX; }
  public getOffsetY(): number { return this.offsetY; }

  public spawnBurstParticles(cx: number, cy: number, count: number, color: string): void {
    for (let i = 0; i < count; i++) {
      if (this.particlePool.length === 0) break;
      const p = this.particlePool.pop()!;
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 120;
      p.id = `p_${this.nextId++}`;
      p.x = cx;
      p.y = cy;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.maxLife = 0.2;
      p.life = p.maxLife;
      p.color = color;
      p.size = 2 + Math.random() * 3;
      p.active = true;
      this.particles.push(p);
    }
  }

  public addFloatingText(x: number, y: number, text: string, color: string): void {
    if (this.floatingPool.length === 0) return;
    const f = this.floatingPool.pop()!;
    f.id = `f_${this.nextId++}`;
    f.x = x;
    f.y = y;
    f.text = text;
    f.color = color;
    f.maxLife = 1.0;
    f.life = f.maxLife;
    f.active = true;
    this.floatingTexts.push(f);
  }

  public addRipple(x: number, y: number, maxRadius: number, duration: number, color: string): void {
    if (this.ripplePool.length === 0) return;
    const r = this.ripplePool.pop()!;
    r.id = `r_${this.nextId++}`;
    r.x = x;
    r.y = y;
    r.maxRadius = maxRadius;
    r.radius = 0;
    r.maxLife = duration;
    r.life = duration;
    r.active = true;
    this.ripples.push(r);
    (r as any).color = color;
  }

  public update(deltaTime: number): void {
    this.gameData = this.battle.getGameData();

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      if (!p.active) continue;
      p.life -= deltaTime;
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      if (p.life <= 0) {
        p.active = false;
        this.particles.splice(i, 1);
        this.particlePool.push(p);
      }
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const f = this.floatingTexts[i];
      if (!f.active) continue;
      f.life -= deltaTime;
      f.y -= 30 * deltaTime;
      if (f.life <= 0) {
        f.active = false;
        this.floatingTexts.splice(i, 1);
        this.floatingPool.push(f);
      }
    }

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      if (!r.active) continue;
      r.life -= deltaTime;
      const t = 1 - r.life / r.maxLife;
      r.radius = r.maxRadius * t;
      if (r.life <= 0) {
        r.active = false;
        this.ripples.splice(i, 1);
        this.ripplePool.push(r);
      }
    }
  }

  public render(): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.fillStyle = '#0a0e1a';
    ctx.fillRect(0, 0, w, h);

    this.drawTopBar();
    this.drawGrid();
    this.drawPath();
    this.drawHoverCell();

    const towers = this.mapGrid.getTowers();
    const enemies = this.enemyMgr.getEnemies();
    const projectiles = this.battle.getProjectiles();

    this.cullEntities(towers, enemies, projectiles);

    for (const tower of towers) this.drawTower(tower);
    for (const enemy of enemies) this.drawEnemy(enemy);
    for (const proj of projectiles) this.drawProjectile(proj);

    this.drawRipples();
    this.drawParticles();
    this.drawFloatingTexts();
    this.drawBuildPreview();
    this.drawSelectedTowerRange();
    this.drawSidePanel();
    this.drawWavePreview();

    if (this.gameData.state === 'gameover' || this.gameData.state === 'victory') {
      this.drawEndScreen();
    }
  }

  private cullEntities(towers: Tower[], enemies: Enemy[], projectiles: Projectile[]): void {
    const total = towers.length + enemies.length + projectiles.length;
    if (total <= MAX_ENTITIES) return;

    const centerX = this.offsetX + this.mapWidth / 2;
    const centerY = this.offsetY + this.mapHeight / 2;

    const dist = (x: number, y: number) => {
      const dx = x - centerX, dy = y - centerY;
      return dx * dx + dy * dy;
    };

    const enemyWorlds = enemies.map(e => ({ e, d: dist(e.x, e.y) }));
    enemyWorlds.sort((a, b) => b.d - a.d);
    const projWorlds = projectiles.map(p => ({ p, d: dist(p.x, p.y) }));
    projWorlds.sort((a, b) => b.d - a.d);

    let excess = total - MAX_ENTITIES;
    for (const ew of enemyWorlds) {
      if (excess <= 0) break;
      ew.e.active = false;
      excess--;
    }
    for (const pw of projWorlds) {
      if (excess <= 0) break;
      pw.p.active = false;
      excess--;
    }
  }

  private drawTopBar(): void {
    const ctx = this.ctx;
    const w = this.canvas.width;

    ctx.fillStyle = 'rgba(20, 30, 55, 0.9)';
    ctx.fillRect(0, 0, w, 60);
    ctx.strokeStyle = '#2a3a5a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 60);
    ctx.lineTo(w, 60);
    ctx.stroke();

    ctx.save();
    ctx.font = 'bold 22px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#ffd700';
    ctx.fillText(`💰 ${this.gold}`, 20, 30);

    ctx.shadowColor = '#ff3333';
    ctx.fillStyle = '#ff3333';
    ctx.fillText(`❤ ${this.lives}`, 170, 30);
    ctx.restore();

    ctx.save();
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.font = '18px "Segoe UI", sans-serif';
    ctx.fillStyle = '#a0b0d0';
    const waveText = `波次 ${Math.min(this.gameData.currentWave + 1, TOTAL_WAVES)} / ${TOTAL_WAVES}`;
    ctx.fillText(waveText, w - 20, 15);

    if (this.gameData.state === 'preparing') {
      ctx.font = 'bold 20px "Segoe UI", sans-serif';
      ctx.fillStyle = '#88ccff';
      const cd = Math.ceil(this.gameData.waveCountdown);
      ctx.fillText(`下一波: ${cd}s [点击开始]`, w - 20, 42);
    } else if (this.gameData.state === 'wave_active') {
      ctx.font = 'bold 20px "Segoe UI", sans-serif';
      ctx.fillStyle = '#ff8866';
      ctx.fillText(`进行中...`, w - 20, 42);
    }
    ctx.restore();
  }

  private drawWavePreview(): void {
    if (this.gameData.state !== 'preparing') return;
    const next = this.gameData.currentWave;
    if (next >= TOTAL_WAVES) return;
    const defs = this.enemyMgr.getNextWaveEnemies(next);
    const ctx = this.ctx;
    const startX = this.canvas.width - 420;
    const y = 18;

    ctx.save();
    ctx.font = '12px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    let x = startX;
    for (const def of defs) {
      const cfg = ENEMY_CONFIGS[def.type];
      ctx.fillStyle = cfg.color;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#a0b0d0';
      ctx.fillText(`x${def.count}`, x + 12, y);
      x += 48;
    }
    ctx.restore();
  }

  private drawGrid(): void {
    const ctx = this.ctx;
    const grid = this.mapGrid.getGrid();

    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        const cell = grid[y][x];
        const px = this.offsetX + x * this.cellSize;
        const py = this.offsetY + y * this.cellSize;

        if (cell.terrain === 'buildable') {
          ctx.fillStyle = 'rgba(40, 60, 90, 0.3)';
          ctx.fillRect(px, py, this.cellSize, this.cellSize);
        }

        ctx.strokeStyle = 'rgba(42, 58, 90, 0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py + 0.5, this.cellSize - 1, this.cellSize - 1);
      }
    }
  }

  private drawPath(): void {
    const ctx = this.ctx;
    const pathCoords = this.mapGrid.getPathCoords();

    for (const [x, y] of pathCoords) {
      const px = this.offsetX + x * this.cellSize;
      const py = this.offsetY + y * this.cellSize;
      const grad = ctx.createLinearGradient(px, py, px + this.cellSize, py + this.cellSize);
      grad.addColorStop(0, '#5a4a3a');
      grad.addColorStop(1, '#7a6a4a');
      ctx.fillStyle = grad;
      ctx.fillRect(px, py, this.cellSize, this.cellSize);

      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      for (let i = 0; i < 3; i++) {
        const dx = (x * 7 + i * 13) % this.cellSize;
        const dy = (y * 11 + i * 17) % this.cellSize;
        ctx.beginPath();
        ctx.arc(px + dx, py + dy, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (pathCoords.length > 0) {
      const [sx, sy] = pathCoords[0];
      const [ex, ey] = pathCoords[pathCoords.length - 1];
      ctx.save();
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#44ff44';
      ctx.fillText('入口', this.offsetX + (sx + 0.5) * this.cellSize, this.offsetY + sy * this.cellSize - 12);
      ctx.fillStyle = '#ff4444';
      ctx.fillText('终点', this.offsetX + (ex + 0.5) * this.cellSize, this.offsetY + (ey + 1) * this.cellSize + 12);
      ctx.restore();
    }
  }

  private drawHoverCell(): void {
    if (!this.hoverCell) return;
    const { x, y } = this.hoverCell;
    const px = this.offsetX + x * this.cellSize;
    const py = this.offsetY + y * this.cellSize;
    const ctx = this.ctx;

    if (this.selectedBuildType) {
      const canBuild = this.mapGrid.canBuildAt(x, y) && this.battle.canBuildTower(this.selectedBuildType);
      ctx.strokeStyle = canBuild ? '#44ff44' : '#ff4444';
      ctx.lineWidth = 3;
      ctx.strokeRect(px + 1, py + 1, this.cellSize - 2, this.cellSize - 2);
      ctx.fillStyle = canBuild ? 'rgba(68,255,68,0.1)' : 'rgba(255,68,68,0.1)';
      ctx.fillRect(px, py, this.cellSize, this.cellSize);

      if (canBuild) {
        const cfg = TOWER_CONFIGS[this.selectedBuildType];
        const range = cfg.range * this.cellSize;
        const cx = px + this.cellSize / 2;
        const cy = py + this.cellSize / 2;
        ctx.strokeStyle = 'rgba(68,170,255,0.5)';
        ctx.fillStyle = 'rgba(68,170,255,0.08)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, range, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
  }

  private drawBuildPreview(): void {
    if (!this.selectedBuildType || !this.hoverCell) return;
    const { x, y } = this.hoverCell;
    const px = this.offsetX + x * this.cellSize;
    const py = this.offsetY + y * this.cellSize;
    const ctx = this.ctx;

    ctx.save();
    ctx.globalAlpha = 0.6;
    this.drawTowerAt(px + this.cellSize / 2, py + this.cellSize / 2, this.selectedBuildType, 1);
    ctx.restore();
  }

  private drawSelectedTowerRange(): void {
    if (!this.selectedTowerId) return;
    const tower = this.mapGrid.getTower(this.selectedTowerId);
    if (!tower) return;

    const cfg = TOWER_CONFIGS[tower.type];
    const cx = this.offsetX + (tower.gridX + 0.5) * this.cellSize;
    const cy = this.offsetY + (tower.gridY + 0.5) * this.cellSize;
    const range = cfg.range * this.cellSize;
    const ctx = this.ctx;

    ctx.strokeStyle = 'rgba(255,220,100,0.7)';
    ctx.fillStyle = 'rgba(255,220,100,0.08)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, range, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    ctx.strokeRect(
      this.offsetX + tower.gridX * this.cellSize + 1,
      this.offsetY + tower.gridY * this.cellSize + 1,
      this.cellSize - 2,
      this.cellSize - 2
    );
  }

  private drawTower(tower: Tower): void {
    const cx = this.offsetX + (tower.gridX + 0.5) * this.cellSize;
    const cy = this.offsetY + (tower.gridY + 0.5) * this.cellSize;
    this.drawTowerAt(cx, cy, tower.type, tower.level);
  }

  private drawTowerAt(cx: number, cy: number, type: TowerType, level: number): void {
    const ctx = this.ctx;
    const s = this.cellSize;
    const base = s * 0.42;
    const levelScale = 1 + (level - 1) * 0.15;

    ctx.save();
    ctx.translate(cx, cy);

    ctx.fillStyle = '#2a3a5a';
    ctx.beginPath();
    ctx.arc(0, 0, base, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4a5a8a';
    ctx.lineWidth = 2;
    ctx.stroke();

    const inner = base * 0.75 * levelScale;
    let col1 = '#555', col2 = '#888';
    if (type === 'arrow') { col1 = '#3a6a3a'; col2 = '#5aa055'; }
    else if (type === 'magic') { col1 = '#5a3a6a'; col2 = '#aa55cc'; }
    else if (type === 'cannon') { col1 = '#6a4a2a'; col2 = '#cc8844'; }
    else if (type === 'slow') { col1 = '#2a5a7a'; col2 = '#44aadd'; }

    const grad = ctx.createRadialGradient(0, -inner * 0.2, inner * 0.2, 0, 0, inner);
    grad.addColorStop(0, col2);
    grad.addColorStop(1, col1);
    ctx.fillStyle = grad;

    if (type === 'arrow') {
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + i * (Math.PI * 2) / 5;
        const r = i % 2 === 0 ? inner : inner * 0.5;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = col2;
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (type === 'magic') {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = i * (Math.PI * 2) / 6 - Math.PI / 2;
        const px = Math.cos(a) * inner;
        const py = Math.sin(a) * inner;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.shadowColor = col2;
      ctx.shadowBlur = 10 + level * 5;
      ctx.strokeStyle = col2;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, inner * 0.3, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'cannon') {
      ctx.beginPath();
      ctx.arc(0, 0, inner * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = col2;
      ctx.lineWidth = 2;
      ctx.stroke();
      const barrelLen = inner * (1 + (level - 1) * 0.3);
      const barrelW = inner * (0.35 + (level - 1) * 0.1);
      ctx.fillStyle = col1;
      ctx.fillRect(-barrelW / 2, -barrelLen, barrelW, barrelLen);
      ctx.strokeStyle = col2;
      ctx.strokeRect(-barrelW / 2, -barrelLen, barrelW, barrelLen);
    } else if (type === 'slow') {
      ctx.beginPath();
      ctx.arc(0, 0, inner * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = col2;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 6; i++) {
        const a = i * (Math.PI * 2) / 6;
        const x = Math.cos(a) * inner * 0.5;
        const y = Math.sin(a) * inner * 0.5;
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.fillStyle = '#ffd700';
    ctx.font = `bold ${Math.max(8, s * 0.22)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★'.repeat(level), 0, base + s * 0.12);

    ctx.restore();
  }

  private drawEnemy(enemy: Enemy): void {
    if (!enemy.active) return;
    const ctx = this.ctx;
    const size = enemy.size * this.cellSize;
    const x = this.offsetX + enemy.x;
    const y = this.offsetY + enemy.y;

    ctx.save();
    ctx.translate(x, y);

    if (enemy.slowFactor < 1) {
      ctx.shadowColor = '#44aaff';
      ctx.shadowBlur = 8;
    }
    if (enemy.stunTimer > 0) {
      ctx.shadowColor = '#ffff66';
      ctx.shadowBlur = 10;
    }

    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-size * 0.3, -size * 0.2, size * 0.18, 0, Math.PI * 2);
    ctx.arc(size * 0.3, -size * 0.2, size * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(-size * 0.3, -size * 0.2, size * 0.08, 0, Math.PI * 2);
    ctx.arc(size * 0.3, -size * 0.2, size * 0.08, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    const barW = size * 2.2;
    const barH = 4;
    const barY = -size - 8;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(-barW / 2, barY, barW, barH);
    const hpRatio = Math.max(0, enemy.hp / enemy.maxHp);
    ctx.fillStyle = hpRatio > 0.5 ? '#44ff44' : hpRatio > 0.25 ? '#ffcc44' : '#ff4444';
    ctx.fillRect(-barW / 2, barY, barW * hpRatio, barH);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(-barW / 2, barY, barW, barH);

    ctx.restore();
  }

  private drawProjectile(proj: Projectile): void {
    if (!proj.active) return;
    const ctx = this.ctx;
    const x = this.offsetX + proj.x;
    const y = this.offsetY + proj.y;
    const size = proj.towerType === 'cannon' ? 7 : 5;

    ctx.save();
    ctx.shadowColor = proj.color;
    ctx.shadowBlur = 8;
    ctx.fillStyle = proj.color;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, size * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawRipples(): void {
    const ctx = this.ctx;
    for (const r of this.ripples) {
      if (!r.active) continue;
      const alpha = r.life / r.maxLife;
      const color = (r as any).color || '#44aaff';
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3 * alpha;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawParticles(): void {
    const ctx = this.ctx;
    for (const p of this.particles) {
      if (!p.active) continue;
      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(this.offsetX + p.x, this.offsetY + p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawFloatingTexts(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = 'bold 16px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const f of this.floatingTexts) {
      if (!f.active) continue;
      const alpha = f.life / f.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = f.color;
      ctx.shadowColor = f.color;
      ctx.shadowBlur = 6;
      ctx.fillText(f.text, this.offsetX + f.x, this.offsetY + f.y);
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  private drawSidePanel(): void {
    const ctx = this.ctx;
    const px = this.offsetX + this.mapWidth + 10;
    const py = this.offsetY;
    const pw = this.sidePanelW - 20;

    ctx.fillStyle = 'rgba(20, 30, 55, 0.85)';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(px, py, pw, this.mapHeight, 8) : ctx.rect(px, py, pw, this.mapHeight);
    ctx.fill();
    ctx.strokeStyle = '#3a4a7a';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.save();
    ctx.fillStyle = '#a0b0d0';
    ctx.font = 'bold 14px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('🏰 建造塔', px + 10, py + 10);
    ctx.restore();

    const types: TowerType[] = ['arrow', 'magic', 'cannon', 'slow'];
    const names: Record<TowerType, string> = { arrow: '箭塔', magic: '魔法塔', cannon: '炮塔', slow: '减速塔' };
    const itemH = 110;

    for (let i = 0; i < types.length; i++) {
      const type = types[i];
      const cfg = TOWER_CONFIGS[type];
      const canAfford = this.battle.canBuildTower(type);
      const selected = this.selectedBuildType === type;
      const ix = px + 10;
      const iy = py + 35 + i * itemH;
      const iw = pw - 20;
      const ih = itemH - 15;

      ctx.fillStyle = selected ? 'rgba(68,170,255,0.25)' : canAfford ? 'rgba(40,60,90,0.6)' : 'rgba(30,30,40,0.6)';
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(ix, iy, iw, ih, 6) : ctx.rect(ix, iy, iw, ih);
      ctx.fill();
      ctx.strokeStyle = selected ? '#44aaff' : canAfford ? '#4a5a8a' : '#333';
      ctx.lineWidth = selected ? 2 : 1;
      ctx.stroke();

      this.drawTowerAt(ix + 30, iy + 32, type, 1);

      ctx.save();
      ctx.globalAlpha = canAfford ? 1 : 0.4;
      ctx.fillStyle = '#e0e8ff';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(names[type], ix + 62, iy + 10);
      ctx.fillStyle = '#ffd700';
      ctx.font = '12px sans-serif';
      ctx.fillText(`💰 ${cfg.buildCost}`, ix + 62, iy + 28);
      ctx.fillStyle = '#88a0cc';
      ctx.font = '10px sans-serif';
      ctx.fillText(`伤:${cfg.baseDamage} 射:${cfg.range}`, ix + 62, iy + 46);
      ctx.fillText(`间隔:${cfg.baseAttackInterval}s`, ix + 62, iy + 60);
      ctx.restore();
    }

    let sy = py + 35 + types.length * itemH;
    if (this.selectedTowerId) {
      const tower = this.mapGrid.getTower(this.selectedTowerId);
      if (tower) {
        const upCost = this.battle.getUpgradeCost(this.selectedTowerId);
        const sellVal = this.battle.getSellValue(this.selectedTowerId);
        const canUp = this.battle.canUpgradeTower(this.selectedTowerId);

        ctx.fillStyle = 'rgba(40,60,90,0.6)';
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(px + 10, sy, pw - 20, 110, 6) : ctx.rect(px + 10, sy, pw - 20, 110);
        ctx.fill();
        ctx.strokeStyle = '#4a5a8a';
        ctx.stroke();

        ctx.save();
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText(`已选: ${names[tower.type]} Lv.${tower.level}`, px + 20, sy + 10);
        ctx.restore();

        const upBtnY = sy + 32;
        ctx.fillStyle = canUp ? '#448844' : '#555';
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(px + 20, upBtnY, pw - 40, 30, 4) : ctx.rect(px + 20, upBtnY, pw - 40, 30);
        ctx.fill();
        ctx.fillStyle = canUp ? '#ffffff' : '#999';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
          tower.level >= 3 ? '已满级' : `升级 💰${upCost}`,
          px + pw / 2,
          upBtnY + 15
        );

        const sellBtnY = sy + 70;
        ctx.fillStyle = '#884444';
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(px + 20, sellBtnY, pw - 40, 30, 4) : ctx.rect(px + 20, sellBtnY, pw - 40, 30);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`出售 💰+${sellVal}`, px + pw / 2, sellBtnY + 15);
      }
    }
  }

  private drawEndScreen(): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.save();
    ctx.fillStyle = 'rgba(60, 10, 10, 0.75)';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 72px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#ff3333';
    ctx.shadowBlur = 30;
    if (this.gameData.state === 'victory') {
      ctx.shadowColor = '#44ff44';
      ctx.fillText('🏆 胜利！', w / 2, h / 2 - 40);
    } else {
      ctx.fillText('GAME OVER', w / 2, h / 2 - 40);
    }

    const btnW = 160;
    const btnH = 50;
    const btnX = w / 2 - btnW / 2;
    const btnY = h / 2 + 60;
    const mx = this.mouseX;
    const my = this.mouseY;
    const hover = this.mouseOverCanvas && mx >= btnX && mx <= btnX + btnW && my >= btnY && my <= btnY + btnH;

    const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
    if (hover) {
      btnGrad.addColorStop(0, '#cc3333');
      btnGrad.addColorStop(1, '#ff5555');
    } else {
      btnGrad.addColorStop(0, '#882222');
      btnGrad.addColorStop(1, '#aa3333');
    }
    ctx.shadowBlur = 0;
    ctx.fillStyle = btnGrad;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(btnX, btnY, btnW, btnH, 8) : ctx.rect(btnX, btnY, btnW, btnH);
    ctx.fill();
    ctx.strokeStyle = '#ff6666';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px "Segoe UI", sans-serif';
    ctx.fillText('重新开始', w / 2, btnY + btnH / 2);
    ctx.restore();
  }
}
