import {
  AppState, PlayerState, GRID, terrainKey,
} from './renderer';

const PLAYER_W = 18;
const PLAYER_H = 30;
const SLIME_SPEED = 40;
const BAT_AMPLITUDE = 30;
const BAT_FREQUENCY = 0.5;

const keys = new Set<string>();

export function setupInput(): void {
  window.addEventListener('keydown', (e) => {
    keys.add(e.code);
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
  });
  window.addEventListener('keyup', (e) => {
    keys.delete(e.code);
  });
}

export function initPlayer(state: AppState): void {
  const startGx = 2;
  const startGy = findSpawnY(state, startGx);

  state.player = {
    x: startGx * GRID + (GRID - PLAYER_W) / 2,
    y: startGy * GRID - PLAYER_H,
    vx: 0,
    vy: 0,
    onGround: false,
    jumpsLeft: state.physics.maxJumps,
    facing: 1,
    dead: false,
    deadTimer: 0,
    blinkCount: 0,
    lastSafeX: startGx * GRID,
    lastSafeY: startGy * GRID - PLAYER_H,
  };
}

function findSpawnY(state: AppState, gx: number): number {
  for (let gy = 0; gy < 100; gy++) {
    if (state.terrain.has(terrainKey(gx, gy))) {
      return gy;
    }
  }
  return 10;
}

export function updateSimulation(state: AppState, dt: number, now: number): void {
  if (state.mode !== 'test' || !state.player) return;

  updatePlayer(state, dt, now);
  updateEnemies(state, dt, now);
}

function updatePlayer(state: AppState, dt: number, now: number): void {
  const p = state.player!;
  const phys = state.physics;

  if (p.dead) {
    const elapsed = now - p.deadTimer;
    if (elapsed > 500) {
      p.dead = false;
      p.x = p.lastSafeX;
      p.y = p.lastSafeY;
      p.vx = 0;
      p.vy = 0;
      p.onGround = false;
      p.jumpsLeft = phys.maxJumps;
    }
    return;
  }

  let moveX = 0;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) moveX -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) moveX += 1;

  p.vx = moveX * phys.moveSpeed;
  if (moveX !== 0) p.facing = moveX;

  p.vy += phys.gravity * dt;
  p.vy -= phys.airResistance * p.vy * dt * 60;

  if (p.vy > 1000) p.vy = 1000;

  const jumpKeys = ['KeyW', 'Space', 'ArrowUp'];
  if (jumpKeys.some(k => keys.has(k))) {
    if (p.jumpsLeft > 0) {
      p.vy = -phys.jumpForce;
      p.jumpsLeft--;
      for (const k of jumpKeys) keys.delete(k);
    }
  }

  p.x += p.vx * dt;
  resolveCollisionX(state, p);

  p.y += p.vy * dt;
  p.onGround = false;
  resolveCollisionY(state, p, now);

  checkSpringCollision(state, p);
  checkSpikeCollision(state, p, now);
  checkCoinCollision(state, p);
  checkEnemyCollision(state, p, now);

  if (p.onGround) {
    p.lastSafeX = p.x;
    p.lastSafeY = p.y;
  }

  updateCamera(state);
}

function resolveCollisionX(state: AppState, p: PlayerState): void {
  const left = Math.floor(p.x / GRID);
  const right = Math.floor((p.x + PLAYER_W - 1) / GRID);
  const top = Math.floor(p.y / GRID);
  const bottom = Math.floor((p.y + PLAYER_H - 1) / GRID);

  for (let gy = top; gy <= bottom; gy++) {
    for (let gx = left; gx <= right; gx++) {
      const block = state.terrain.get(terrainKey(gx, gy));
      if (!block || block.type === 'spike' || block.removeTime !== null) continue;

      const bx = gx * GRID;
      const by = gy * GRID;

      if (rectOverlap(p.x, p.y, PLAYER_W, PLAYER_H, bx, by, GRID, GRID)) {
        if (p.vx > 0) {
          p.x = bx - PLAYER_W;
        } else if (p.vx < 0) {
          p.x = bx + GRID;
        }
        p.vx = 0;
      }
    }
  }
}

function resolveCollisionY(state: AppState, p: PlayerState, _now: number): void {
  const left = Math.floor(p.x / GRID);
  const right = Math.floor((p.x + PLAYER_W - 1) / GRID);
  const top = Math.floor(p.y / GRID);
  const bottom = Math.floor((p.y + PLAYER_H - 1) / GRID);

  for (let gy = top; gy <= bottom; gy++) {
    for (let gx = left; gx <= right; gx++) {
      const block = state.terrain.get(terrainKey(gx, gy));
      if (!block || block.type === 'spike' || block.removeTime !== null) continue;

      const bx = gx * GRID;
      const by = gy * GRID;

      if (rectOverlap(p.x, p.y, PLAYER_W, PLAYER_H, bx, by, GRID, GRID)) {
        if (p.vy > 0) {
          p.y = by - PLAYER_H;
          p.vy = 0;
          p.onGround = true;
          p.jumpsLeft = state.physics.maxJumps;
        } else if (p.vy < 0) {
          p.y = by + GRID;
          p.vy = 0;
        }
      }
    }
  }
}

function rectOverlap(
  x1: number, y1: number, w1: number, h1: number,
  x2: number, y2: number, w2: number, h2: number,
): boolean {
  return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
}

function checkSpikeCollision(state: AppState, p: PlayerState, now: number): void {
  const left = Math.floor(p.x / GRID);
  const right = Math.floor((p.x + PLAYER_W - 1) / GRID);
  const top = Math.floor(p.y / GRID);
  const bottom = Math.floor((p.y + PLAYER_H - 1) / GRID);

  for (let gy = top; gy <= bottom; gy++) {
    for (let gx = left; gx <= right; gx++) {
      const block = state.terrain.get(terrainKey(gx, gy));
      if (!block || block.type !== 'spike' || block.removeTime !== null) continue;

      const bx = gx * GRID;
      const by = gy * GRID;

      const spikeRect = { x: bx + 4, y: by + 8, w: GRID - 8, h: GRID - 8 };
      if (rectOverlap(p.x, p.y, PLAYER_W, PLAYER_H, spikeRect.x, spikeRect.y, spikeRect.w, spikeRect.h)) {
        killPlayer(p, now);
        return;
      }
    }
  }
}

function checkSpringCollision(state: AppState, p: PlayerState): void {
  for (const spring of state.springs) {
    const sx = spring.x;
    const sy = spring.y;
    const springRect = { x: sx + 4, y: sy + GRID - 20, w: GRID - 8, h: 16 };

    if (rectOverlap(p.x, p.y, PLAYER_W, PLAYER_H, springRect.x, springRect.y, springRect.w, springRect.h)) {
      if (p.vy > 0) {
        p.vy = -state.physics.jumpForce * 2;
        p.onGround = false;
        p.jumpsLeft = state.physics.maxJumps;
        spring.compressed = true;
        setTimeout(() => { spring.compressed = false; }, 200);
      }
    }
  }
}

function checkCoinCollision(state: AppState, p: PlayerState): void {
  state.coins = state.coins.filter(coin => {
    const cx = coin.x + GRID / 2;
    const cy = coin.y + GRID / 2;
    const pcx = p.x + PLAYER_W / 2;
    const pcy = p.y + PLAYER_H / 2;
    const dist = Math.sqrt((cx - pcx) ** 2 + (cy - pcy) ** 2);
    return dist > 20;
  });
}

function checkEnemyCollision(state: AppState, p: PlayerState, now: number): void {
  for (const slime of state.slimes) {
    const sx = slime.x + 2;
    const sy = slime.y + 4;
    if (rectOverlap(p.x, p.y, PLAYER_W, PLAYER_H, sx, sy, GRID - 4, GRID - 4)) {
      killPlayer(p, now);
      return;
    }
  }

  for (const bat of state.bats) {
    const bx = bat.x + 4;
    const by = bat.y + 4;
    if (rectOverlap(p.x, p.y, PLAYER_W, PLAYER_H, bx, by, GRID - 8, GRID - 8)) {
      killPlayer(p, now);
      return;
    }
  }
}

function killPlayer(p: PlayerState, now: number): void {
  p.dead = true;
  p.deadTimer = now;
  p.blinkCount = 3;
  p.vx = 0;
  p.vy = 0;
}

function updateCamera(state: AppState): void {
  if (!state.player) return;
  const p = state.player;
  const targetX = p.x + PLAYER_W / 2 - state.canvasW / 2;
  const targetY = p.y + PLAYER_H / 2 - state.canvasH / 2;
  state.camera.x += (targetX - state.camera.x) * 0.1;
  state.camera.y += (targetY - state.camera.y) * 0.1;
}

function updateEnemies(state: AppState, dt: number, now: number): void {
  for (const slime of state.slimes) {
    slime.x += SLIME_SPEED * slime.dir * dt;

    const nextGx = Math.floor((slime.x + (slime.dir > 0 ? GRID : 0)) / GRID);
    const curGy = Math.floor(slime.y / GRID) + 1;
    const groundAhead = state.terrain.has(terrainKey(nextGx, curGy));
    const wallAhead = state.terrain.has(terrainKey(nextGx, Math.floor(slime.y / GRID)));

    if (!groundAhead || wallAhead) {
      slime.dir *= -1;
      slime.x += SLIME_SPEED * slime.dir * dt * 2;
    }
  }

  for (const bat of state.bats) {
    bat.x = bat.originX + Math.sin(now / 1000 * BAT_FREQUENCY * Math.PI * 2) * 50;
    bat.y = bat.originY + Math.sin(now / 1000 * BAT_FREQUENCY * Math.PI * 2 * 1.3) * BAT_AMPLITUDE;
  }
}

export function updateEditorEnemies(state: AppState, now: number): void {
  for (const slime of state.slimes) {
    slime.x += SLIME_SPEED * slime.dir * (1 / 60);
    const nextGx = Math.floor((slime.x + (slime.dir > 0 ? GRID : 0)) / GRID);
    const curGy = Math.floor(slime.y / GRID) + 1;
    const groundAhead = state.terrain.has(terrainKey(nextGx, curGy));
    const wallAhead = state.terrain.has(terrainKey(nextGx, Math.floor(slime.y / GRID)));
    if (!groundAhead || wallAhead) {
      slime.dir *= -1;
    }
  }

  for (const bat of state.bats) {
    bat.x = bat.originX + Math.sin(now / 1000 * BAT_FREQUENCY * Math.PI * 2) * 50;
    bat.y = bat.originY + Math.sin(now / 1000 * BAT_FREQUENCY * Math.PI * 2 * 1.3) * BAT_AMPLITUDE;
  }
}
