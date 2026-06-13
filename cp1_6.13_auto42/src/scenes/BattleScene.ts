import Phaser from 'phaser';
import { BATTLEFIELD, GAME_EVENTS, EventBus } from '../main';
import { ParticleManager } from '../utils/ParticleManager';
import { EnemyAI, ShipState, BattlefieldState, AIDecision } from './EnemyAI';

const SHIP_COLORS: number[] = [0xff3333, 0xff8800, 0xffee00, 0x33ff33, 0x3399ff];
const ENEMY_COLORS: number[] = [0xaa2222, 0xcc5555, 0xdd7777, 0x991111, 0xbb3333];

interface Ship extends Phaser.GameObjects.Container {
  shipId: number;
  team: 'player' | 'enemy';
  isMothership: boolean;
  maxHealth: number;
  health: number;
  isAlive: boolean;
  color: number;
  velocity: { x: number; y: number };
  targetShip: Ship | null;
  lastFireTime: number;
  hitFlashTimer: number;
  lowHealthSway: number;
  selected: boolean;
  halo: Phaser.GameObjects.Arc | null;
  formationOffset: { x: number; y: number };
  easeFunction: string;
  moveTween: Phaser.Tweens.Tween | null;
  targetingOrder: number;
}

interface LaserEffect {
  line: Phaser.GameObjects.Line;
  life: number;
  maxLife: number;
}

interface Star {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  phase: number;
  speed: number;
}

interface RadarMarker {
  id: number;
  team: 'player' | 'enemy';
  isMothership: boolean;
  dot: Phaser.GameObjects.GameObject;
  blinkTimer: number;
  blinkCount: number;
  isBlinking: boolean;
}

interface FormationMoveData {
  targetX: number;
  targetY: number;
  targetShip: Ship | null;
  ships: Ship[];
  startTime: number;
  duration: number;
  startPositions: Map<number, { x: number; y: number }>;
  centerOffset: { x: number; y: number };
}

export class BattleScene extends Phaser.Scene {
  private eventBus: EventBus;
  private particleManager!: ParticleManager;
  private enemyAI!: EnemyAI;

  private playerShips: Ship[] = [];
  private enemyShips: Ship[] = [];
  private playerMothership!: Ship;
  private enemyMothership!: Ship;
  private shipIdCounter: number = 0;

  private stars: Star[] = [];
  private nebulaLayer!: Phaser.GameObjects.Graphics;
  private nebulaTime: number = 0;

  private isDragging: boolean = false;
  private dragStart: { x: number; y: number } = { x: 0, y: 0 };
  private dragEnd: { x: number; y: number } = { x: 0, y: 0 };
  private selectionBox!: Phaser.GameObjects.Rectangle;
  private dragTrail!: Phaser.GameObjects.Graphics;
  private dragTrailPoints: { x: number; y: number }[] = [];
  private selectedShips: Set<Ship> = new Set();

  private laserEffects: LaserEffect[] = [];

  private radarContainer!: Phaser.GameObjects.Container;
  private radarDiameter: number = 120;
  private radarMarkers: Map<number, RadarMarker> = new Map();
  private radarScaleRing!: Phaser.GameObjects.Graphics;
  private radarRotation: number = 0;

  private edgeWarning!: Phaser.GameObjects.Graphics;
  private edgeWarningAlpha: number = 0;
  private edgeWarningDuration: number = 0;
  private edgeWarningTargetAlpha: number = 0;
  private recentlyHitPlayerCount: number = 0;
  private destroyedPlayerRate: number = 0;
  private lastDestroyedTime: number = 0;

  private formationMoves: Map<number, FormationMoveData> = new Map();

  private playerHitTracker: Map<number, number> = new Map();
  private recentDamages: number[] = [];

  constructor() {
    super({ key: 'BattleScene' });
    this.eventBus = EventBus.getInstance();
  }

  preload(): void {}

  create(): void {
    this.particleManager = new ParticleManager(this);
    this.enemyAI = new EnemyAI(this, BATTLEFIELD.WIDTH, BATTLEFIELD.HEIGHT);

    this.createNebulaBackground();
    this.createSelectionUI();
    this.createRadar();
    this.createEdgeWarning();
    this.createShips();

    this.setupInputHandlers();
    this.setupEventListeners();

    this.shipIdCounter = 0;
    this.lastDestroyedTime = this.time.now;
  }

  private createNebulaBackground(): void {
    this.nebulaLayer = this.add.graphics();

    for (let i = 0; i < 120; i++) {
      this.stars.push({
        x: Phaser.Math.FloatBetween(0, BATTLEFIELD.WIDTH),
        y: Phaser.Math.FloatBetween(0, BATTLEFIELD.HEIGHT),
        size: Phaser.Math.FloatBetween(0.8, 3.2),
        baseAlpha: Phaser.Math.FloatBetween(0.3, 0.95),
        phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
        speed: Phaser.Math.FloatBetween(0.5, 2.5)
      });
    }
  }

  private drawNebula(delta: number): void {
    this.nebulaTime += delta;
    this.nebulaLayer.clear();

    const gradientSteps = 6;
    for (let i = 0; i < gradientSteps; i++) {
      const t = i / (gradientSteps - 1);
      const hue = Phaser.Math.Interpolation.Linear([270, 240, 220, 210, 200, 230], t);
      const alpha = 0.05 + 0.04 * Math.sin(this.nebulaTime * 0.0008 + i * 1.1);
      this.nebulaLayer.fillStyle(Phaser.Display.Color.HSVToRGB(hue / 360, 0.5, 0.18).color, alpha);
      this.nebulaLayer.fillRect(0, 0, BATTLEFIELD.WIDTH, BATTLEFIELD.HEIGHT);
    }

    for (let i = 0; i < 5; i++) {
      const cx = BATTLEFIELD.WIDTH * 0.5 + Math.sin(this.nebulaTime * 0.0003 + i * 1.7) * 220;
      const cy = BATTLEFIELD.HEIGHT * 0.5 + Math.cos(this.nebulaTime * 0.0004 + i * 2.3) * 160;
      const r = 280 + Math.sin(this.nebulaTime * 0.0006 + i) * 70;
      const hue = Phaser.Math.Interpolation.Linear([290, 250, 220, 200], (i / 4));
      const c = Phaser.Display.Color.HSVToRGB(hue / 360, 0.7, 0.28);
      const alpha = 0.08 + 0.04 * Math.sin(this.nebulaTime * 0.001 + i);

      for (let j = 0; j < 6; j++) {
        const rr = r * (1 - j * 0.13);
        const aa = alpha * (1 - j * 0.15);
        this.nebulaLayer.fillStyle(c.color, aa);
        this.nebulaLayer.fillCircle(cx, cy, rr);
      }
    }

    const starGraphics = this.add.graphics();
    for (const star of this.stars) {
      const twinkle = 0.5 + 0.5 * Math.sin(this.nebulaTime * 0.004 * star.speed + star.phase);
      const alpha = star.baseAlpha * (0.45 + 0.55 * twinkle);
      const s = star.size * (0.85 + 0.15 * twinkle);
      this.nebulaLayer.fillStyle(0xffffff, alpha);
      this.nebulaLayer.fillCircle(star.x, star.y, s);
    }
  }

  private createSelectionUI(): void {
    this.selectionBox = this.add.rectangle(0, 0, 0, 0, 0xffffff, 0.15)
      .setStrokeStyle(1.5, 0xffffff, 0.75)
      .setDepth(900)
      .setVisible(false);

    this.dragTrail = this.add.graphics().setDepth(899);
  }

  private createRadar(): void {
    const radarX = BATTLEFIELD.WIDTH / 2;
    const radarY = BATTLEFIELD.HEIGHT - this.radarDiameter / 2 - 15;

    this.radarContainer = this.add.container(radarX, radarY).setDepth(1000);

    const bg = this.add.circle(0, 0, this.radarDiameter / 2 + 4, 0x0a0a1a, 0.85)
      .setStrokeStyle(2.5, 0x00bfff, 0.85);
    this.radarContainer.add(bg);

    const innerBg = this.add.circle(0, 0, this.radarDiameter / 2, 0x000814, 0.9);
    this.radarContainer.add(innerBg);

    for (let i = 1; i <= 3; i++) {
      const r = (this.radarDiameter / 2) * (i / 3);
      const ring = this.add.circle(0, 0, r)
        .setStrokeStyle(1, 0x00bfff, 0.28);
      this.radarContainer.add(ring);
    }

    const crossV = this.add.line(0, 0, 0, -this.radarDiameter / 2, 0, this.radarDiameter / 2)
      .setStrokeStyle(1, 0x00bfff, 0.22);
    const crossH = this.add.line(0, 0, -this.radarDiameter / 2, 0, this.radarDiameter / 2, 0)
      .setStrokeStyle(1, 0x00bfff, 0.22);
    this.radarContainer.add([crossV, crossH]);

    this.radarScaleRing = this.add.graphics();
    this.radarContainer.add(this.radarScaleRing);

    const topLabel = this.add.text(0, -this.radarDiameter / 2 - 16, '战术雷达', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#00BFFF'
    }).setOrigin(0.5);
    this.radarContainer.add(topLabel);
  }

  private createEdgeWarning(): void {
    this.edgeWarning = this.add.graphics().setDepth(950);
  }

  private drawEdgeWarning(): void {
    this.edgeWarning.clear();
    if (this.edgeWarningAlpha <= 0.005) return;

    const thickness = 40;
    const a = this.edgeWarningAlpha;

    this.edgeWarning.lineGradientStyle(
      thickness,
      0xff0000, a,
      0xff0000, 0,
      0xff0000, a,
      0xff0000, 0
    );
    this.edgeWarning.strokeRect(0, 0, BATTLEFIELD.WIDTH, BATTLEFIELD.HEIGHT);

    const corners = [
      { x1: 0, y1: 0, x2: thickness, y2: thickness },
      { x1: BATTLEFIELD.WIDTH, y1: 0, x2: BATTLEFIELD.WIDTH - thickness, y2: thickness },
      { x1: 0, y1: BATTLEFIELD.HEIGHT, x2: thickness, y2: BATTLEFIELD.HEIGHT - thickness },
      { x1: BATTLEFIELD.WIDTH, y1: BATTLEFIELD.HEIGHT, x2: BATTLEFIELD.WIDTH - thickness, y2: BATTLEFIELD.HEIGHT - thickness }
    ];
    for (const c of corners) {
      this.edgeWarning.fillGradientStyle(0xff0000, 0, 0xff0000, a, 0xff0000, 0, 0xff0000, a * 0.4);
      this.edgeWarning.fillTriangle(c.x1, c.y1, c.x2, c.y1, c.x1, c.y2);
    }
  }

  private createShips(): void {
    const playerCenterX = BATTLEFIELD.WIDTH * 0.22;
    const playerCenterY = BATTLEFIELD.HEIGHT * 0.65;

    this.playerMothership = this.createShip(playerCenterX, playerCenterY, 'player', true, 0x00ff88, -1);
    this.playerShips.push(this.playerMothership);

    const ringRadius = 85;
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const sx = playerCenterX + Math.cos(angle) * ringRadius;
      const sy = playerCenterY + Math.sin(angle) * ringRadius;
      const ship = this.createShip(sx, sy, 'player', false, SHIP_COLORS[i], i);
      ship.formationOffset = {
        x: Math.cos(angle) * ringRadius,
        y: Math.sin(angle) * ringRadius
      };
      this.assignEaseFunctionByFormationPosition(ship, angle);
      this.playerShips.push(ship);
    }

    const enemyCenterX = BATTLEFIELD.WIDTH * 0.78 + Phaser.Math.FloatBetween(-60, 60);
    const enemyCenterY = BATTLEFIELD.HEIGHT * 0.3 + Phaser.Math.FloatBetween(-50, 50);

    this.enemyMothership = this.createShip(enemyCenterX, enemyCenterY, 'enemy', true, 0xff0055, -1);
    this.enemyShips.push(this.enemyMothership);

    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const sx = enemyCenterX + Math.cos(angle) * ringRadius;
      const sy = enemyCenterY + Math.sin(angle) * ringRadius;
      const ship = this.createShip(sx, sy, 'enemy', false, ENEMY_COLORS[i], i);
      ship.formationOffset = {
        x: Math.cos(angle) * ringRadius,
        y: Math.sin(angle) * ringRadius
      };
      this.assignEaseFunctionByFormationPosition(ship, angle);
      this.enemyShips.push(ship);
    }

    for (const ship of [...this.playerShips, ...this.enemyShips]) {
      this.addRadarMarker(ship);
    }
  }

  private assignEaseFunctionByFormationPosition(ship: Ship, angleInRing: number): void {
    const normalizedAngle = Phaser.Math.Angle.Normalize(angleInRing);
    const absAngle = Math.abs(normalizedAngle);

    if (absAngle < Math.PI / 3) {
      ship.easeFunction = 'easeOutBack';
    } else if (absAngle < Math.PI * 0.75) {
      ship.easeFunction = 'easeInOutCubic';
    } else {
      ship.easeFunction = 'easeOutQuad';
    }

    ship.targetingOrder = absAngle < Math.PI / 3 ? 1 : (absAngle < Math.PI * 0.75 ? 2 : 3);
  }

  private createShip(x: number, y: number, team: 'player' | 'enemy', isMothership: boolean, color: number, index: number): Ship {
    const container = this.add.container(x, y) as unknown as Ship;
    container.setDepth(100);

    const shipId = ++this.shipIdCounter;

    let body: Phaser.GameObjects.Polygon | Phaser.GameObjects.Graphics;
    let size: number;

    if (isMothership) {
      size = 22;
      const g = this.add.graphics();
      g.fillStyle(color, 1);
      g.fillTriangle(-size, -size * 0.6, size, -size * 0.6, 0, size * 1.1);
      g.fillStyle(0xffffff, 0.3);
      g.fillCircle(0, 0, size * 0.45);
      g.lineStyle(2, 0xffffff, 0.5);
      g.strokeTriangle(-size, -size * 0.6, size, -size * 0.6, 0, size * 1.1);
      body = g;
    } else {
      size = 12;
      const tri = this.add.polygon(0, 0, [
        0, -size,
        size * 0.9, size * 0.8,
        -size * 0.9, size * 0.8
      ], color);
      tri.setStrokeStyle(1.5, 0xffffff, 0.45);
      body = tri;
    }

    container.add(body);

    const barWidth = isMothership ? 50 : 26;
    const barHeight = isMothership ? 5 : 3;
    const barY = isMothership ? -size - 12 : -size - 7;

    const healthBg = this.add.rectangle(0, barY, barWidth, barHeight, 0x220000, 0.85);
    const healthBar = this.add.rectangle(-barWidth / 2, barY, barWidth, barHeight, 0x00ff66, 0.95)
      .setOrigin(0, 0.5);
    container.add([healthBg, healthBar]);

    (container as unknown as Ship).shipId = shipId;
    (container as unknown as Ship).team = team;
    (container as unknown as Ship).isMothership = isMothership;
    (container as unknown as Ship).maxHealth = isMothership ? 200 : 100;
    (container as unknown as Ship).health = (container as unknown as Ship).maxHealth;
    (container as unknown as Ship).isAlive = true;
    (container as unknown as Ship).color = color;
    (container as unknown as Ship).velocity = { x: 0, y: 0 };
    (container as unknown as Ship).targetShip = null;
    (container as unknown as Ship).lastFireTime = 0;
    (container as unknown as Ship).hitFlashTimer = 0;
    (container as unknown as Ship).lowHealthSway = 0;
    (container as unknown as Ship).selected = false;
    (container as unknown as Ship).halo = null;
    (container as unknown as Ship).formationOffset = { x: 0, y: 0 };
    (container as unknown as Ship).easeFunction = 'easeOutQuad';
    (container as unknown as Ship).moveTween = null;
    (container as unknown as Ship).targetingOrder = 1;

    (container as unknown as { body: typeof body; healthBar: Phaser.GameObjects.Rectangle; healthBg: Phaser.GameObjects.Rectangle })
      .body = body;
    (container as unknown as { healthBar: Phaser.GameObjects.Rectangle }).healthBar = healthBar;

    return container as unknown as Ship;
  }

  private addRadarMarker(ship: Ship): void {
    let dot: Phaser.GameObjects.GameObject;
    if (ship.isMothership) {
      const size = 7;
      dot = this.add.polygon(0, 0, [
        0, -size, size, 0, 0, size, -size, 0
      ], ship.team === 'player' ? 0x00ff66 : 0xff3344)
        .setStrokeStyle(1, 0xffffff, 0.9);
    } else {
      dot = this.add.circle(0, 0, 2.5, ship.team === 'player' ? 0x44ff88 : 0xff5566);
    }

    this.radarContainer.add(dot);

    this.radarMarkers.set(ship.shipId, {
      id: ship.shipId,
      team: ship.team,
      isMothership: ship.isMothership,
      dot,
      blinkTimer: 0,
      blinkCount: 0,
      isBlinking: false
    });
  }

  private setupInputHandlers(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) {
        this.isDragging = true;
        this.dragStart = { x: pointer.x, y: pointer.y };
        this.dragEnd = { x: pointer.x, y: pointer.y };
        this.dragTrailPoints = [{ x: pointer.x, y: pointer.y }];
        this.selectionBox.setVisible(true).setPosition(pointer.x, pointer.y).setSize(0, 0);
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging && pointer.leftButtonDown()) {
        this.dragEnd = { x: pointer.x, y: pointer.y };
        this.dragTrailPoints.push({ x: pointer.x, y: pointer.y });
        if (this.dragTrailPoints.length > 30) this.dragTrailPoints.shift();
        this.updateSelectionBox();
        this.drawDragTrail();
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonReleased() && this.isDragging) {
        this.isDragging = false;
        const dx = Math.abs(this.dragEnd.x - this.dragStart.x);
        const dy = Math.abs(this.dragEnd.y - this.dragStart.y);
        if (dx < 5 && dy < 5) {
          this.handleSingleClick(pointer);
        } else {
          this.performBoxSelection();
        }
        this.selectionBox.setVisible(false);
        this.dragTrail.clear();
        this.dragTrailPoints = [];
      }
    });

    this.input.on('pointerdown-right', (pointer: Phaser.Input.Pointer) => {
      if (this.selectedShips.size > 0) {
        this.handleRightClick(pointer);
      }
    });
  }

  private setupEventListeners(): void {
    this.eventBus.on(GAME_EVENTS.SHIP_DAMAGED, (data) => {
      const d = data as { shipId: number; team: 'player' | 'enemy'; damage: number };
      if (d.team === 'player') {
        this.playerHitTracker.set(d.shipId, this.time.now);
        this.recentDamages.push(this.time.now);
        this.cleanupOldDamages();
        this.updateEdgeWarningIntensity();
      }
    }, this);

    this.eventBus.on(GAME_EVENTS.SHIP_DESTROYED, (data) => {
      const d = data as { shipId: number; team: 'player' | 'enemy' };
      if (d.team === 'player') {
        this.destroyedPlayerRate += 1;
        this.lastDestroyedTime = this.time.now;
        this.updateEdgeWarningIntensity();
      }
    }, this);
  }

  private cleanupOldDamages(): void {
    const threshold = this.time.now - 2000;
    this.recentDamages = this.recentDamages.filter(t => t > threshold);
    for (const [id, t] of this.playerHitTracker) {
      if (t < threshold) this.playerHitTracker.delete(id);
    }
  }

  private updateEdgeWarningIntensity(): void {
    const hitCount = this.playerHitTracker.size;
    const recentHitCount = this.recentDamages.length;
    const alivePlayers = this.playerShips.filter(s => s.isAlive).length;
    const totalPlayers = this.playerShips.length;
    const survivalRatio = alivePlayers / totalPlayers;

    let intensity = 0;
    if (hitCount > 0) intensity += 0.05 * Math.min(hitCount, 4);
    if (recentHitCount > 2) intensity += 0.06 * Math.min(recentHitCount - 2, 5);
    if (survivalRatio < 0.5) intensity += 0.08 * (1 - survivalRatio) * 2;
    if (this.destroyedPlayerRate > 0) intensity += 0.07 * Math.min(this.destroyedPlayerRate, 3);

    this.edgeWarningTargetAlpha = Phaser.Math.Clamp(intensity, 0, 0.55);
    this.edgeWarningDuration = 0.25 + Math.min(hitCount * 0.08, 0.8);
  }

  private handleSingleClick(pointer: Phaser.Input.Pointer): void {
    const clickedShip = this.findShipAt(pointer.x, pointer.y, 'player');
    if (clickedShip && !clickedShip.isMothership) {
      this.clearSelection();
      this.selectShip(clickedShip);
    } else {
      this.clearSelection();
    }
  }

  private handleRightClick(pointer: Phaser.Input.Pointer): void {
    const enemyShip = this.findShipAt(pointer.x, pointer.y, 'enemy');
    if (enemyShip && enemyShip.isAlive) {
      this.moveFormationToTarget(Array.from(this.selectedShips), pointer.x, pointer.y, enemyShip);
    } else {
      this.moveFormationToTarget(Array.from(this.selectedShips), pointer.x, pointer.y, null);
    }
  }

  private findShipAt(x: number, y: number, team: 'player' | 'enemy'): Ship | null {
    const ships = team === 'player' ? this.playerShips : this.enemyShips;
    for (const ship of ships) {
      if (!ship.isAlive || ship.isMothership) continue;
      const d = Phaser.Math.Distance.Between(x, y, ship.x, ship.y);
      if (d < 18) return ship;
    }
    for (const ship of ships) {
      if (!ship.isAlive || !ship.isMothership) continue;
      const d = Phaser.Math.Distance.Between(x, y, ship.x, ship.y);
      if (d < 28) return ship;
    }
    return null;
  }

  private updateSelectionBox(): void {
    const x1 = Math.min(this.dragStart.x, this.dragEnd.x);
    const y1 = Math.min(this.dragStart.y, this.dragEnd.y);
    const w = Math.abs(this.dragEnd.x - this.dragStart.x);
    const h = Math.abs(this.dragEnd.y - this.dragStart.y);
    this.selectionBox.setPosition(x1 + w / 2, y1 + h / 2).setSize(w, h);
  }

  private drawDragTrail(): void {
    this.dragTrail.clear();
    if (this.dragTrailPoints.length < 2) return;

    for (let i = 1; i < this.dragTrailPoints.length; i++) {
      const alpha = (i / this.dragTrailPoints.length) * 0.5;
      const width = 1.5 + (i / this.dragTrailPoints.length) * 1.5;
      this.dragTrail.lineStyle(width, 0xffffff, alpha);
      this.dragTrail.beginPath();
      this.dragTrail.moveTo(this.dragTrailPoints[i - 1].x, this.dragTrailPoints[i - 1].y);
      this.dragTrail.lineTo(this.dragTrailPoints[i].x, this.dragTrailPoints[i].y);
      this.dragTrail.strokePath();
    }
  }

  private performBoxSelection(): void {
    const x1 = Math.min(this.dragStart.x, this.dragEnd.x);
    const y1 = Math.min(this.dragStart.y, this.dragEnd.y);
    const x2 = Math.max(this.dragStart.x, this.dragEnd.x);
    const y2 = Math.max(this.dragStart.y, this.dragEnd.y);

    this.clearSelection();

    for (const ship of this.playerShips) {
      if (!ship.isAlive || ship.isMothership) continue;
      if (ship.x >= x1 && ship.x <= x2 && ship.y >= y1 && ship.y <= y2) {
        this.selectShip(ship);
      }
    }
  }

  private selectShip(ship: Ship): void {
    if (this.selectedShips.has(ship)) return;
    this.selectedShips.add(ship);
    ship.selected = true;

    const size = ship.isMothership ? 30 : 18;
    const halo = this.add.circle(0, 0, size, 0x00bfff, 0.18)
      .setStrokeStyle(2, 0x00bfff, 0.85);
    ship.add(halo);
    ship.halo = halo;
  }

  private clearSelection(): void {
    for (const ship of this.selectedShips) {
      ship.selected = false;
      if (ship.halo) {
        ship.halo.destroy();
        ship.halo = null;
      }
    }
    this.selectedShips.clear();
  }

  private moveFormationToTarget(ships: Ship[], targetX: number, targetY: number, targetShip: Ship | null): void {
    if (ships.length === 0) return;

    const aliveShips = ships.filter(s => s.isAlive);
    if (aliveShips.length === 0) return;

    let cx = 0, cy = 0;
    for (const s of aliveShips) {
      cx += s.x;
      cy += s.y;
    }
    cx /= aliveShips.length;
    cy /= aliveShips.length;

    const dist = Phaser.Math.Distance.Between(cx, cy, targetX, targetY);
    const baseDuration = Phaser.Math.Clamp(dist / 180, 0.6, 2.5);

    for (const ship of aliveShips) {
      if (ship.moveTween) {
        ship.moveTween.stop();
        ship.moveTween = null;
      }

      const localOffsetX = ship.x - cx;
      const localOffsetY = ship.y - cy;

      let easeOffset: { x: number; y: number } = ship.formationOffset;
      if (Math.abs(localOffsetX) > 1 || Math.abs(localOffsetY) > 1) {
        const formationAngle = Math.atan2(localOffsetY, localOffsetX);
        const formationDist = Math.min(Math.sqrt(localOffsetX * localOffsetX + localOffsetY * localOffsetY), 95);
        easeOffset = {
          x: Math.cos(formationAngle) * formationDist,
          y: Math.sin(formationAngle) * formationDist
        };
        this.assignEaseFunctionByFormationPosition(ship, formationAngle);
      }

      const finalX = targetX + easeOffset.x;
      const finalY = targetY + easeOffset.y;

      const duration = this.getEaseAdjustedDuration(ship, baseDuration);

      const startAngle = ship.rotation;
      const dirX = finalX - ship.x;
      const dirY = finalY - ship.y;
      const targetAngle = Math.atan2(dirY, dirX) + Math.PI / 2;

      ship.moveTween = this.tweens.add({
        targets: ship,
        x: finalX,
        y: finalY,
        rotation: Phaser.Math.Angle.ShortestBetween(startAngle, targetAngle) + startAngle,
        duration: duration,
        ease: ship.easeFunction,
        onStart: () => {
          if (targetShip) {
            ship.targetShip = targetShip;
          } else {
            ship.targetShip = null;
          }
        },
        onComplete: () => {
          ship.moveTween = null;
          if (targetShip && targetShip.isAlive) {
            ship.targetShip = targetShip;
          } else if (!targetShip) {
            ship.targetShip = null;
          }
        },
        onUpdate: (tween) => {
          const v = tween.getValue();
          ship.velocity = {
            x: (finalX - cx) * 0.003 * Math.abs(1 - v),
            y: (finalY - cy) * 0.003 * Math.abs(1 - v)
          };
        }
      });
    }

    this.eventBus.emit(GAME_EVENTS.FORMATION_MOVE, { ships: aliveShips.map(s => s.shipId), targetX, targetY });
  }

  private getEaseAdjustedDuration(ship: Ship, baseDuration: number): number {
    switch (ship.easeFunction) {
      case 'easeOutBack':
        return baseDuration * 1.05;
      case 'easeInOutCubic':
        return baseDuration * 0.92;
      case 'easeOutQuad':
        return baseDuration * 1.1;
      default:
        return baseDuration;
    }
  }

  private getBattlefieldState(): BattlefieldState {
    return {
      playerShips: this.playerShips.map(s => this.toShipState(s)),
      enemyShips: this.enemyShips.map(s => this.toShipState(s)),
      playerMothership: this.toShipState(this.playerMothership),
      enemyMothership: this.toShipState(this.enemyMothership)
    };
  }

  private toShipState(ship: Ship): ShipState {
    return {
      id: ship.shipId,
      x: ship.x,
      y: ship.y,
      health: ship.health,
      maxHealth: ship.maxHealth,
      isAlive: ship.isAlive,
      team: ship.team,
      isMothership: ship.isMothership,
      targetId: ship.targetShip?.shipId ?? null
    };
  }

  private applyAIDecisions(decisions: AIDecision[]): void {
    for (const decision of decisions) {
      const affectedShips: Ship[] = [];
      for (const id of decision.affectedShipIds) {
        const ship = this.enemyShips.find(s => s.shipId === id && s.isAlive);
        if (ship && !ship.isMothership) affectedShips.push(ship);
      }
      if (affectedShips.length === 0) continue;

      let targetShip: Ship | null = null;
      if (decision.targetShipId !== undefined) {
        targetShip = this.playerShips.find(s => s.shipId === decision.targetShipId && s.isAlive) ?? null;
      }

      if (decision.type === 'attack' && targetShip) {
        this.moveFormationToTarget(affectedShips, targetShip.x, targetShip.y, targetShip);
      } else if (decision.targetPosition) {
        this.moveFormationToTarget(affectedShips, decision.targetPosition.x, decision.targetPosition.y, targetShip);
      }
    }
  }

  update(time: number, delta: number): void {
    const dt = Math.min(delta, 50);
    this.drawNebula(dt);
    this.drawEdgeWarning();

    this.updateEdgeWarning(dt);
    this.updateAllShips(dt, time);
    this.updateCombat(dt, time);
    this.updateLasers(dt);
    this.updateRadar(dt);
    this.particleManager.update(dt);

    const state = this.getBattlefieldState();
    const decisions = this.enemyAI.makeDecision(state, time);
    this.applyAIDecisions(decisions);

    if (time % 500 < dt) {
      this.cleanupOldDamages();
    }
  }

  private updateEdgeWarning(dt: number): void {
    if (this.edgeWarningDuration > 0) {
      this.edgeWarningDuration -= dt / 1000;
      this.edgeWarningAlpha = Phaser.Math.Linear(
        this.edgeWarningAlpha,
        this.edgeWarningTargetAlpha,
        0.15
      );
    } else {
      this.edgeWarningAlpha = Phaser.Math.Linear(this.edgeWarningAlpha, 0, 0.06);
      this.edgeWarningTargetAlpha = Math.max(0, this.edgeWarningTargetAlpha * 0.92);
    }
    if (this.destroyedPlayerRate > 0 && this.time.now - this.lastDestroyedTime > 3000) {
      this.destroyedPlayerRate = Math.max(0, this.destroyedPlayerRate - 0.01);
    }
  }

  private updateAllShips(dt: number, time: number): void {
    for (const ship of [...this.playerShips, ...this.enemyShips]) {
      if (!ship.isAlive) continue;

      if (ship.hitFlashTimer > 0) {
        ship.hitFlashTimer -= dt;
      }

      this.updateShipVisual(ship, dt);
      this.emitThrustParticles(ship);

      if (ship.hitFlashTimer > 0) {
        this.flashShipBorder(ship);
      } else {
        this.restoreShipVisual(ship);
      }
    }
  }

  private updateShipVisual(ship: Ship, dt: number): void {
    const healthPct = ship.health / ship.maxHealth;
    const hb = (ship as unknown as { healthBar: Phaser.GameObjects.Rectangle }).healthBar;
    if (hb) {
      const barWidth = ship.isMothership ? 50 : 26;
      hb.width = Math.max(0, barWidth * healthPct);
      if (healthPct > 0.6) {
        hb.setFillStyle(0x00ff66);
      } else if (healthPct > 0.3) {
        hb.setFillStyle(0xffdd00);
      } else {
        hb.setFillStyle(0xff3322);
      }
    }

    if (healthPct < 0.3 && !ship.isMothership) {
      ship.lowHealthSway += dt * 0.012;
      const sway = Math.sin(ship.lowHealthSway * 6) * 0.12;
      const body = (ship as unknown as { body: Phaser.GameObjects.Polygon }).body;
      if (body && 'setTint' in body) {
        const redAmount = (1 - healthPct / 0.3);
        (body as Phaser.GameObjects.Polygon).setTint(
          Phaser.Display.Color.GetColor(
            255,
            Math.floor(Phaser.Math.Linear(255, 60, redAmount)),
            Math.floor(Phaser.Math.Linear(255, 60, redAmount))
          )
        );
      }
      ship.rotation += sway;
    }
  }

  private flashShipBorder(ship: Ship): void {
    const body = (ship as unknown as { body: Phaser.GameObjects.Polygon | Phaser.GameObjects.Graphics }).body;
    if (body instanceof Phaser.GameObjects.Polygon) {
      body.setStrokeStyle(3.5, 0xff1111, 1);
    }
  }

  private restoreShipVisual(ship: Ship): void {
    const body = (ship as unknown as { body: Phaser.GameObjects.Polygon | Phaser.GameObjects.Graphics }).body;
    if (body instanceof Phaser.GameObjects.Polygon) {
      body.setStrokeStyle(1.5, 0xffffff, 0.45);
    }
    const healthPct = ship.health / ship.maxHealth;
    if (healthPct >= 0.3) {
      const poly = body as Phaser.GameObjects.Polygon;
      if (poly && 'clearTint' in poly) {
        poly.clearTint();
      }
    }
  }

  private emitThrustParticles(ship: Ship): void {
    if (ship.isMothership) return;

    let speed = 1;
    if (ship.moveTween && ship.moveTween.isPlaying()) {
      const progress = ship.moveTween.progress;
      speed = Phaser.Math.Easing.Quadratic.InOut(Math.sin(progress * Math.PI)) * 2.5 + 0.3;
    }

    const tailOffsetAngle = ship.rotation + Math.PI / 2;
    const tailDist = ship.isMothership ? 20 : 12;
    const tx = ship.x + Math.cos(tailOffsetAngle) * tailDist;
    const ty = ship.y + Math.sin(tailOffsetAngle) * tailDist;

    this.particleManager.createDynamicTrail(tx, ty, ship.color, speed * 60, 80);
  }

  private updateCombat(dt: number, time: number): void {
    const allShips = [...this.playerShips, ...this.enemyShips];

    for (const ship of allShips) {
      if (!ship.isAlive || ship.isMothership) continue;

      if (!ship.targetShip || !ship.targetShip.isAlive) {
        const enemies = ship.team === 'player' ? this.enemyShips : this.playerShips;
        const nearest = this.findNearestEnemyShip(ship, enemies.filter(e => e.isAlive));
        ship.targetShip = nearest;
      }

      if (ship.targetShip && ship.targetShip.isAlive) {
        const dist = Phaser.Math.Distance.Between(ship.x, ship.y, ship.targetShip.x, ship.targetShip.y);
        if (dist < 220) {
          const angle = Math.atan2(ship.targetShip.y - ship.y, ship.targetShip.x - ship.x) + Math.PI / 2;
          if (!ship.moveTween || !ship.moveTween.isPlaying()) {
            ship.rotation = Phaser.Math.Angle.RotateTo(ship.rotation, angle, dt * 0.008);
          }
          if (time - ship.lastFireTime > 800) {
            this.fireLaser(ship, ship.targetShip, time);
          }
        }
      }
    }
  }

  private findNearestEnemyShip(ship: Ship, enemies: Ship[]): Ship | null {
    if (enemies.length === 0) return null;
    let nearest: Ship | null = null;
    let minDist = Infinity;
    for (const enemy of enemies) {
      const d = Phaser.Math.Distance.Between(ship.x, ship.y, enemy.x, enemy.y);
      if (d < minDist) {
        minDist = d;
        nearest = enemy;
      }
    }
    return nearest;
  }

  private fireLaser(shooter: Ship, target: Ship, time: number): void {
    shooter.lastFireTime = time;

    const noseAngle = shooter.rotation - Math.PI / 2;
    const noseDist = shooter.isMothership ? 22 : 13;
    const sx = shooter.x + Math.cos(noseAngle) * noseDist;
    const sy = shooter.y + Math.sin(noseAngle) * noseDist;

    const line = this.add.line(0, 0, sx, sy, target.x, target.y, 0xffffff, 0.95);
    line.setBlendMode(Phaser.BlendModes.ADD);
    line.setLineWidth(2.5);
    line.setDepth(200);

    this.laserEffects.push({
      line,
      life: 0.15,
      maxLife: 0.15
    });

    this.damageShip(target, 10, shooter);
  }

  private damageShip(target: Ship, damage: number, attacker: Ship): void {
    if (!target.isAlive) return;
    target.health -= damage;
    target.hitFlashTimer = 200;

    this.eventBus.emit(GAME_EVENTS.SHIP_DAMAGED, {
      shipId: target.shipId,
      team: target.team,
      damage,
      attackerId: attacker.shipId
    });

    this.particleManager.createExplosion(target.x, target.y, 0x00aaff, {
      count: 15,
      lifeSpan: 0.3,
      speed: { min: 50, max: 140 },
      size: { min: 1.5, max: 4.5 }
    });

    if (target.health <= 0) {
      this.destroyShip(target);
    }
  }

  private destroyShip(ship: Ship): void {
    ship.isAlive = false;

    this.eventBus.emit(GAME_EVENTS.SHIP_DESTROYED, {
      shipId: ship.shipId,
      team: ship.team
    });

    this.particleManager.createDebrisExplosion(ship.x, ship.y, ship.color, {
      count: 30,
      lifeSpan: 0.6,
      speed: { min: 80, max: 260 },
      size: { min: 3, max: 7 },
      rotationSpeed: 7
    });

    this.particleManager.createExplosion(ship.x, ship.y, 0xff8800, {
      count: 22,
      lifeSpan: 0.5,
      speed: { min: 40, max: 200 },
      size: { min: 2, max: 6 }
    });

    this.particleManager.createShockwave(ship.x, ship.y, 60, 0xffaa44);

    const marker = this.radarMarkers.get(ship.shipId);
    if (marker) {
      marker.isBlinking = true;
      marker.blinkCount = 0;
      marker.blinkTimer = 0;
    }

    for (const s of [...this.playerShips, ...this.enemyShips]) {
      if (s.targetShip === ship) {
        s.targetShip = null;
      }
    }

    if (this.selectedShips.has(ship)) {
      this.selectedShips.delete(ship);
    }

    this.tweens.add({
      targets: ship,
      alpha: 0,
      scale: 0.2,
      duration: 250,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        ship.setVisible(false);
        ship.setActive(false);
      }
    });
  }

  private updateLasers(dt: number): void {
    const toRemove: number[] = [];
    for (let i = 0; i < this.laserEffects.length; i++) {
      this.laserEffects[i].life -= dt / 1000;
      const a = Math.max(0, this.laserEffects[i].life / this.laserEffects[i].maxLife);
      this.laserEffects[i].line.setAlpha(a);
      if (this.laserEffects[i].life <= 0) toRemove.push(i);
    }
    for (let i = toRemove.length - 1; i >= 0; i--) {
      const idx = toRemove[i];
      this.laserEffects[idx].line.destroy();
      this.laserEffects.splice(idx, 1);
    }
  }

  private updateRadar(dt: number): void {
    this.radarRotation += dt * 0.0005;
    this.drawRadarScaleRing();

    const radius = this.radarDiameter / 2 - 6;
    const centerX = 0;
    const centerY = 0;
    const worldW = BATTLEFIELD.WIDTH;
    const worldH = BATTLEFIELD.HEIGHT;

    for (const ship of [...this.playerShips, ...this.enemyShips]) {
      const marker = this.radarMarkers.get(ship.shipId);
      if (!marker) continue;

      if (marker.isBlinking) {
        marker.blinkTimer += dt;
        if (marker.blinkTimer >= 180) {
          marker.blinkTimer = 0;
          marker.blinkCount++;
          marker.dot.setVisible(!marker.dot.visible);
          if (marker.blinkCount >= 6) {
            marker.dot.destroy();
            this.radarMarkers.delete(ship.shipId);
            continue;
          }
        }
      }

      if (!ship.isAlive && !marker.isBlinking) continue;

      const relX = (ship.x / worldW) * 2 - 1;
      const relY = (ship.y / worldH) * 2 - 1;
      const magnitude = Math.sqrt(relX * relX + relY * relY);

      let mappedX: number, mappedY: number;
      if (magnitude > 1) {
        const norm = 1 / magnitude;
        mappedX = centerX + relX * norm * radius;
        mappedY = centerY + relY * norm * radius;
        marker.dot.setAlpha(0.45);
      } else {
        mappedX = centerX + relX * radius;
        mappedY = centerY + relY * radius;
        marker.dot.setAlpha(1);
      }

      const aspect = worldW / worldH;
      if (aspect > 1) {
        mappedY *= aspect;
        if (Math.abs(mappedY) > radius) {
          const s = radius / Math.abs(mappedY);
          mappedX *= s;
          mappedY *= s;
        }
      } else {
        mappedX /= aspect;
        if (Math.abs(mappedX) > radius) {
          const s = radius / Math.abs(mappedX);
          mappedX *= s;
          mappedY *= s;
        }
      }

      marker.dot.setPosition(mappedX, mappedY);
    }
  }

  private drawRadarScaleRing(): void {
    this.radarScaleRing.clear();
    const radius = this.radarDiameter / 2;

    for (let i = 0; i < 24; i++) {
      const angle = this.radarRotation + (i / 24) * Math.PI * 2;
      const isLong = i % 6 === 0;
      const innerR = radius - (isLong ? 12 : 7);
      const outerR = radius - 3;
      const x1 = Math.cos(angle) * innerR;
      const y1 = Math.sin(angle) * innerR;
      const x2 = Math.cos(angle) * outerR;
      const y2 = Math.sin(angle) * outerR;

      this.radarScaleRing.lineStyle(isLong ? 1.8 : 1, isLong ? 0xdaa520 : 0x00bfff, isLong ? 0.95 : 0.55);
      this.radarScaleRing.beginPath();
      this.radarScaleRing.moveTo(x1, y1);
      this.radarScaleRing.lineTo(x2, y2);
      this.radarScaleRing.strokePath();
    }

    const sweepAngle = this.radarRotation * 2;
    this.radarScaleRing.lineStyle(1.5, 0x00ff88, 0.55);
    this.radarScaleRing.beginPath();
    this.radarScaleRing.moveTo(0, 0);
    this.radarScaleRing.lineTo(Math.cos(sweepAngle) * radius, Math.sin(sweepAngle) * radius);
    this.radarScaleRing.strokePath();
  }
}
