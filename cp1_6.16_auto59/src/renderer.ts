export const GRID = 32;

export interface TerrainBlock {
  gx: number;
  gy: number;
  type: 'ground' | 'brick' | 'spike';
  placeTime: number;
  removeTime: number | null;
}

export interface CoinItem {
  x: number;
  y: number;
  placeTime: number;
}

export interface SpringItem {
  x: number;
  y: number;
  placeTime: number;
  compressed: boolean;
}

export interface SlimeEnemy {
  x: number;
  y: number;
  originX: number;
  dir: number;
  placeTime: number;
}

export interface BatEnemy {
  x: number;
  y: number;
  originX: number;
  originY: number;
  placeTime: number;
}

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  onGround: boolean;
  jumpsLeft: number;
  facing: number;
  dead: boolean;
  deadTimer: number;
  blinkCount: number;
  lastSafeX: number;
  lastSafeY: number;
}

export interface PhysicsParams {
  gravity: number;
  jumpForce: number;
  moveSpeed: number;
  airResistance: number;
  maxJumps: number;
}

export interface LevelData {
  terrain: TerrainBlock[];
  coins: CoinItem[];
  springs: SpringItem[];
  slimes: SlimeEnemy[];
  bats: BatEnemy[];
}

export interface AppState {
  mode: 'edit' | 'test';
  terrain: Map<string, TerrainBlock>;
  coins: CoinItem[];
  springs: SpringItem[];
  slimes: SlimeEnemy[];
  bats: BatEnemy[];
  player: PlayerState | null;
  physics: PhysicsParams;
  selectedTool: string;
  camera: { x: number; y: number };
  effects: Effect[];
  canvasW: number;
  canvasH: number;
  mouseX: number;
  mouseY: number;
  mouseGridX: number;
  mouseGridY: number;
  isDrawing: boolean;
  hoverPreview: boolean;
}

export interface Effect {
  type: 'place' | 'erase';
  x: number;
  y: number;
  startTime: number;
  duration: number;
}

export function createDefaultState(): AppState {
  return {
    mode: 'edit',
    terrain: new Map(),
    coins: [],
    springs: [],
    slimes: [],
    bats: [],
    player: null,
    physics: { gravity: 600, jumpForce: 400, moveSpeed: 300, airResistance: 0, maxJumps: 2 },
    selectedTool: 'ground',
    camera: { x: 0, y: 0 },
    effects: [],
    canvasW: 0,
    canvasH: 0,
    mouseX: 0,
    mouseY: 0,
    mouseGridX: 0,
    mouseGridY: 0,
    isDrawing: false,
    hoverPreview: false,
  };
}

export function terrainKey(gx: number, gy: number): string {
  return `${gx},${gy}`;
}

const TERRAIN_COLORS: Record<string, string> = {
  ground: '#8B5E3C',
  brick: '#C0392B',
  spike: '#BDC3C7',
};

export function render(ctx: CanvasRenderingContext2D, state: AppState, now: number): void {
  const { canvasW, canvasH, camera } = state;

  ctx.save();
  ctx.clearRect(0, 0, canvasW, canvasH);
  ctx.fillStyle = '#E8E8E8';
  ctx.fillRect(0, 0, canvasW, canvasH);

  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  drawGrid(ctx, state);
  drawTerrain(ctx, state, now);
  drawEffects(ctx, state, now);
  drawItems(ctx, state, now);
  drawEnemies(ctx, state, now);

  if (state.mode === 'edit' && state.hoverPreview && state.selectedTool !== 'eraser') {
    drawHoverPreview(ctx, state);
  }

  if (state.mode === 'test' && state.player) {
    drawPlayer(ctx, state.player, now);
  }

  ctx.restore();
  ctx.restore();
}

function drawGrid(ctx: CanvasRenderingContext2D, state: AppState): void {
  const { canvasW, canvasH, camera } = state;
  const startX = Math.floor(camera.x / GRID) * GRID;
  const startY = Math.floor(camera.y / GRID) * GRID;
  const endX = camera.x + canvasW + GRID;
  const endY = camera.y + canvasH + GRID;

  ctx.strokeStyle = '#D0D0FF';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = startX; x <= endX; x += GRID) {
    ctx.moveTo(x, camera.y);
    ctx.lineTo(x, camera.y + canvasH);
  }
  for (let y = startY; y <= endY; y += GRID) {
    ctx.moveTo(camera.x, y);
    ctx.lineTo(camera.x + canvasW, y);
  }
  ctx.stroke();
}

function drawTerrain(ctx: CanvasRenderingContext2D, state: AppState, now: number): void {
  const { terrain, camera, canvasW, canvasH } = state;
  const startGX = Math.floor(camera.x / GRID) - 1;
  const startGY = Math.floor(camera.y / GRID) - 1;
  const endGX = Math.ceil((camera.x + canvasW) / GRID) + 1;
  const endGY = Math.ceil((camera.y + canvasH) / GRID) + 1;

  for (let gx = startGX; gx <= endGX; gx++) {
    for (let gy = startGY; gy <= endGY; gy++) {
      const block = terrain.get(terrainKey(gx, gy));
      if (!block) continue;

      const age = now - block.placeTime;
      const eraseAge = block.removeTime !== null ? now - block.removeTime : -1;

      if (eraseAge >= 0 && eraseAge > 150) continue;

      const px = gx * GRID;
      const py = gy * GRID;

      ctx.save();

      if (eraseAge >= 0) {
        const t = eraseAge / 150;
        const scale = 1 - t;
        ctx.translate(px + GRID / 2, py + GRID / 2);
        ctx.scale(scale, scale);
        ctx.translate(-GRID / 2, -GRID / 2);
        ctx.globalAlpha = 1 - t;
      } else if (age < 100) {
        const t = age / 100;
        const white = Math.max(0, 1 - t * 3);
        ctx.translate(px, py);
        const baseColor = TERRAIN_COLORS[block.type];
        ctx.fillStyle = blendColor(baseColor, '#FFFFFF', white);
        ctx.fillRect(0, 0, GRID, GRID);
        drawTerrainDetail(ctx, block.type, 0, 0);
        ctx.restore();
        continue;
      }

      if (eraseAge >= 0) {
        ctx.fillStyle = TERRAIN_COLORS[block.type];
        ctx.fillRect(0, 0, GRID, GRID);
        drawTerrainDetail(ctx, block.type, 0, 0);
      } else {
        ctx.translate(px, py);
        ctx.fillStyle = TERRAIN_COLORS[block.type];
        ctx.fillRect(0, 0, GRID, GRID);
        drawTerrainDetail(ctx, block.type, 0, 0);
      }

      ctx.restore();
    }
  }
}

function drawTerrainDetail(ctx: CanvasRenderingContext2D, type: string, x: number, y: number): void {
  ctx.save();
  if (type === 'ground') {
    ctx.fillStyle = '#6B3E1C';
    ctx.fillRect(x + 2, y + GRID - 6, GRID - 4, 4);
    ctx.fillStyle = '#5DA33C';
    ctx.fillRect(x, y, GRID, 4);
    ctx.fillStyle = '#4C8C2E';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(x + 2 + i * 8, y, 2, 4 + (i % 2) * 2);
    }
  } else if (type === 'brick') {
    ctx.strokeStyle = '#A93226';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 1, y + 1, GRID - 2, GRID - 2);
    ctx.beginPath();
    ctx.moveTo(x, y + GRID / 2);
    ctx.lineTo(x + GRID, y + GRID / 2);
    ctx.moveTo(x + GRID / 2, y);
    ctx.lineTo(x + GRID / 2, y + GRID / 2);
    ctx.moveTo(x + GRID / 4, y + GRID / 2);
    ctx.lineTo(x + GRID / 4, y + GRID);
    ctx.moveTo(x + GRID * 3 / 4, y + GRID / 2);
    ctx.lineTo(x + GRID * 3 / 4, y + GRID);
    ctx.stroke();
  } else if (type === 'spike') {
    ctx.fillStyle = '#95A5A6';
    const spikeCount = 4;
    const sw = GRID / spikeCount;
    for (let i = 0; i < spikeCount; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * sw, y + GRID);
      ctx.lineTo(x + i * sw + sw / 2, y + 4);
      ctx.lineTo(x + (i + 1) * sw, y + GRID);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#7F8C8D';
    for (let i = 0; i < spikeCount; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * sw + sw / 2, y + 4);
      ctx.lineTo(x + i * sw + sw / 4 + sw / 2, y + 4 + 6);
      ctx.lineTo(x + i * sw + sw / 2, y + GRID);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawEffects(ctx: CanvasRenderingContext2D, state: AppState, now: number): void {
  for (let i = state.effects.length - 1; i >= 0; i--) {
    const eff = state.effects[i];
    const age = now - eff.startTime;
    if (age > eff.duration) {
      state.effects.splice(i, 1);
      continue;
    }
    const t = age / eff.duration;
    if (eff.type === 'place') {
      const radius = GRID * 0.6 * t;
      ctx.save();
      ctx.strokeStyle = `rgba(144, 238, 144, ${1 - t})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(eff.x + GRID / 2, eff.y + GRID / 2, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}

function drawItems(ctx: CanvasRenderingContext2D, state: AppState, now: number): void {
  for (const coin of state.coins) {
    drawCoin(ctx, coin, now);
  }
  for (const spring of state.springs) {
    drawSpring(ctx, spring, now);
  }
}

function drawCoin(ctx: CanvasRenderingContext2D, coin: CoinItem, now: number): void {
  const period = 1500;
  const phase = ((now - coin.placeTime) % period) / period;
  const scaleX = Math.abs(Math.cos(phase * Math.PI * 2));
  const cx = coin.x + GRID / 2;
  const cy = coin.y + GRID / 2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scaleX, 1);
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fillStyle = '#FFD700';
  ctx.fill();
  ctx.strokeStyle = '#DAA520';
  ctx.lineWidth = 2;
  ctx.stroke();

  if (scaleX > 0.3) {
    ctx.fillStyle = '#B8860B';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', 0, 1);
  }
  ctx.restore();
}

function drawSpring(ctx: CanvasRenderingContext2D, spring: SpringItem, now: number): void {
  const sx = spring.x;
  const sy = spring.y;

  ctx.save();
  ctx.fillStyle = '#27AE60';
  const compH = spring.compressed ? 8 : 16;
  ctx.fillRect(sx + 6, sy + GRID - compH - 4, GRID - 12, compH);

  ctx.strokeStyle = '#1E8449';
  ctx.lineWidth = 2;
  const coilCount = 3;
  const coilH = compH / coilCount;
  for (let i = 0; i < coilCount; i++) {
    const yy = sy + GRID - compH - 4 + i * coilH;
    ctx.beginPath();
    ctx.moveTo(sx + 8, yy + coilH / 2);
    ctx.lineTo(sx + GRID - 8, yy + coilH / 2);
    ctx.stroke();
  }

  ctx.fillStyle = '#2ECC71';
  ctx.fillRect(sx + 4, sy + GRID - compH - 8, GRID - 8, 4);
  ctx.restore();
}

function drawEnemies(ctx: CanvasRenderingContext2D, state: AppState, now: number): void {
  for (const slime of state.slimes) {
    drawSlime(ctx, slime, now);
  }
  for (const bat of state.bats) {
    drawBat(ctx, bat, now);
  }
}

function drawSlime(ctx: CanvasRenderingContext2D, slime: SlimeEnemy, now: number): void {
  const bobY = Math.sin((now / 300)) * 2;

  ctx.save();
  ctx.translate(slime.x + GRID / 2, slime.y + GRID / 2 + bobY);

  ctx.fillStyle = '#2ECC71';
  ctx.beginPath();
  ctx.ellipse(0, 4, 14, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#27AE60';
  ctx.beginPath();
  ctx.ellipse(0, 6, 14, 6, 0, 0, Math.PI);
  ctx.fill();

  ctx.fillStyle = '#FFF';
  ctx.beginPath();
  ctx.arc(-5, 0, 4, 0, Math.PI * 2);
  ctx.arc(5, 0, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(-4, 0, 2, 0, Math.PI * 2);
  ctx.arc(6, 0, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawBat(ctx: CanvasRenderingContext2D, bat: BatEnemy, now: number): void {
  const wingPhase = Math.sin(now / 100) * 0.4;

  ctx.save();
  ctx.translate(bat.x + GRID / 2, bat.y + GRID / 2);

  ctx.fillStyle = '#5B2C6F';
  ctx.beginPath();
  ctx.ellipse(0, 0, 6, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.rotate(-wingPhase);
  ctx.fillStyle = '#7D3C98';
  ctx.beginPath();
  ctx.moveTo(-4, 0);
  ctx.lineTo(-18, -10);
  ctx.lineTo(-10, 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.rotate(wingPhase);
  ctx.fillStyle = '#7D3C98';
  ctx.beginPath();
  ctx.moveTo(4, 0);
  ctx.lineTo(18, -10);
  ctx.lineTo(10, 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#E74C3C';
  ctx.beginPath();
  ctx.arc(-3, -1, 2, 0, Math.PI * 2);
  ctx.arc(3, -1, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawHoverPreview(ctx: CanvasRenderingContext2D, state: AppState): void {
  const { mouseGridX: gx, mouseGridY: gy, selectedTool } = state;
  const px = gx * GRID;
  const py = gy * GRID;

  ctx.save();
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = '#90EE90';
  ctx.fillRect(px, py, GRID, GRID);
  ctx.globalAlpha = 0.6;
  drawTerrainDetail(ctx, selectedTool, px, py);
  ctx.restore();
}

export function drawPlayer(ctx: CanvasRenderingContext2D, player: PlayerState, now: number): void {
  ctx.save();
  ctx.translate(player.x + GRID / 2, player.y + GRID / 2);

  if (player.dead) {
    const blinkPhase = Math.floor((now - player.deadTimer) / 83) % 2;
    if (blinkPhase === 0) {
      ctx.restore();
      return;
    }
    ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
    ctx.fillRect(-GRID / 2, -GRID / 2, GRID, GRID);
  }

  const dir = player.facing;

  ctx.save();
  if (dir < 0) {
    ctx.scale(-1, 1);
  }

  ctx.fillStyle = '#2E86C1';
  ctx.fillRect(-8, -14, 16, 16);

  ctx.fillStyle = '#FDEBD0';
  ctx.beginPath();
  ctx.arc(0, -16, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#2C3E50';
  ctx.fillRect(-8, -22, 16, 4);

  ctx.fillRect(-10, -20, 4, 2);

  ctx.fillStyle = '#1A5276';
  ctx.fillRect(-3, -16, 2, 2);
  ctx.fillRect(3, -16, 2, 2);

  ctx.fillStyle = '#2E86C1';
  ctx.fillRect(-9, 2, 7, 3);
  ctx.fillRect(2, 2, 7, 3);

  ctx.fillStyle = '#1A5276';
  ctx.fillRect(-9, 5, 7, 6);
  ctx.fillRect(2, 5, 7, 6);

  ctx.restore();
  ctx.restore();
}

function blendColor(base: string, overlay: string, alpha: number): string {
  const b = hexToRgb(base);
  const o = hexToRgb(overlay);
  if (!b || !o) return base;
  const r = Math.round(b.r + (o.r - b.r) * alpha);
  const g = Math.round(b.g + (o.g - b.g) * alpha);
  const bl = Math.round(b.b + (o.b - b.b) * alpha);
  return `rgb(${r},${g},${bl})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return null;
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}
