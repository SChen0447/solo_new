/**
 * physics.ts — 物理引擎模块
 *
 * 模块间调用关系与数据流向:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ editor.ts (主编辑器)                                            │
 * │   │                                                             │
 * │   ├── update(dt) 时调用:                                        │
 * │   │   ├── updateMovingPlatforms(platforms, dt)                  │
 * │   │   │     接收: platforms数组 + 时间步长dt                     │
 * │   │   │     返回: 直接修改platforms中moving类型的x/y位置         │
 * │   │   │     副作用: 计算平台移动速度deltaX/deltaY               │
 * │   │   │                                                         │
 * │   │   ├── stepPhysics(player, platforms, input, dt)             │
 * │   │   │     接收: 玩家状态 + 关卡数据 + 按键输入 + 时间步长      │
 * │   │   │     返回: CollisionResult (碰撞/着陆/尖刺/终点信息)      │
 * │   │   │     副作用: 修改player的位置/速度/闪烁状态               │
 * │   │   │     关键: 移动平台携带逻辑 — 检测角色是否站在移动平台    │
 * │   │   │           上，将平台的位移量叠加到角色位置上              │
 * │   │   │                                                         │
 * │   │   └── respawnPlayer(player)                                 │
 * │   │         接收: 玩家状态                                      │
 * │   │         副作用: 将玩家重置到lastCheckpoint位置               │
 * │   │                                                             │
 * │   └── 根据CollisionResult触发particles.ts:                      │
 * │         landed=true → spawnLandingDust()                        │
 * │         jump触发  → spawnJumpDust()                             │
 * │         reachedFlag → spawnGoldExplosion()                      │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * 物理模拟帧率: 通过editor.ts的requestAnimationFrame循环保证60fps，
 * dt = (now - lastTime) / (1000/60) 归一化为帧单位，max dt = 2 防止跳帧
 */

export interface Vec2 {
  x: number;
  y: number;
}

export interface Platform {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  type: 'platform' | 'moving' | 'spike' | 'flag' | 'checkpoint' | 'start';
  moveRange?: { startX: number; endX: number; startY: number; endY: number };
  moveSpeed?: number;
  direction?: number;
  horizontalMove?: boolean;
  prevX?: number;
  prevY?: number;
}

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  onGround: boolean;
  onMovingPlatform: Platform | null;
  lastCheckpoint: Vec2;
  blinking: boolean;
  blinkTimer: number;
  dead: boolean;
}

export interface CollisionResult {
  collidedTop: boolean;
  collidedBottom: boolean;
  collidedLeft: boolean;
  collidedRight: boolean;
  hitSpike: boolean;
  reachedFlag: boolean;
  passedCheckpoint: boolean | null;
  landed: boolean;
}

export const GRAVITY = 0.6;
export const MOVE_SPEED = 4;
export const JUMP_FORCE = -12;
export const MAX_FALL_SPEED = 15;

export function createPlayer(startX: number, startY: number): Player {
  return {
    x: startX,
    y: startY,
    vx: 0,
    vy: 0,
    width: 8,
    height: 8,
    onGround: false,
    onMovingPlatform: null,
    lastCheckpoint: { x: startX, y: startY },
    blinking: false,
    blinkTimer: 0,
    dead: false
  };
}

export function updateMovingPlatforms(platforms: Platform[], dt: number): void {
  for (const p of platforms) {
    if (p.type !== 'moving' || !p.moveRange || !p.moveSpeed) continue;
    p.prevX = p.x;
    p.prevY = p.y;
    const speed = p.moveSpeed * dt;
    const dir = p.direction ?? 1;
    if (p.horizontalMove) {
      p.x += speed * dir;
      if (p.x >= p.moveRange.endX) {
        p.x = p.moveRange.endX;
        p.direction = -1;
      } else if (p.x <= p.moveRange.startX) {
        p.x = p.moveRange.startX;
        p.direction = 1;
      }
    } else {
      p.y += speed * dir;
      if (p.y >= p.moveRange.endY) {
        p.y = p.moveRange.endY;
        p.direction = -1;
      } else if (p.y <= p.moveRange.startY) {
        p.y = p.moveRange.startY;
        p.direction = 1;
      }
    }
  }
}

function aabbOverlap(ax: number, ay: number, aw: number, ah: number,
                     bx: number, by: number, bw: number, bh: number): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export function stepPhysics(
  player: Player,
  platforms: Platform[],
  input: { left: boolean; right: boolean; jump: boolean },
  dt: number
): CollisionResult {
  const result: CollisionResult = {
    collidedTop: false,
    collidedBottom: false,
    collidedLeft: false,
    collidedRight: false,
    hitSpike: false,
    reachedFlag: false,
    passedCheckpoint: null,
    landed: false
  };

  if (player.dead) return result;

  const wasOnGround = player.onGround;
  player.onGround = false;
  player.onMovingPlatform = null;

  if (player.blinking) {
    player.blinkTimer -= dt / 60;
    if (player.blinkTimer <= 0) {
      player.blinking = false;
      player.blinkTimer = 0;
    }
  }

  if (input.left) player.vx = -MOVE_SPEED;
  else if (input.right) player.vx = MOVE_SPEED;
  else player.vx = 0;

  if (input.jump && wasOnGround) {
    player.vy = JUMP_FORCE;
  }

  player.vy += GRAVITY * dt;
  if (player.vy > MAX_FALL_SPEED) player.vy = MAX_FALL_SPEED;

  player.x += player.vx * dt;
  for (const p of platforms) {
    if (p.type === 'spike' || p.type === 'flag' || p.type === 'checkpoint' || p.type === 'start') continue;
    if (aabbOverlap(player.x, player.y, player.width, player.height, p.x, p.y, p.width, p.height)) {
      if (player.vx > 0) {
        player.x = p.x - player.width;
        result.collidedRight = true;
      } else if (player.vx < 0) {
        player.x = p.x + p.width;
        result.collidedLeft = true;
      }
      player.vx = 0;
    }
  }

  player.y += player.vy * dt;
  for (const p of platforms) {
    if (p.type === 'spike' || p.type === 'flag' || p.type === 'checkpoint' || p.type === 'start') continue;
    if (aabbOverlap(player.x, player.y, player.width, player.height, p.x, p.y, p.width, p.height)) {
      if (player.vy > 0) {
        player.y = p.y - player.height;
        result.collidedBottom = true;
        if (!wasOnGround && player.vy > 3) {
          result.landed = true;
        }
        player.onGround = true;
        if (p.type === 'moving') {
          player.onMovingPlatform = p;
          const deltaX = (p.prevX !== undefined) ? p.x - p.prevX : 0;
          const deltaY = (p.prevY !== undefined) ? p.y - p.prevY : 0;
          player.x += deltaX;
          player.y += deltaY;
        }
      } else if (player.vy < 0) {
        player.y = p.y + p.height;
        result.collidedTop = true;
      }
      player.vy = 0;
    }
  }

  for (const p of platforms) {
    if (p.type === 'spike') {
      const spikeHitboxX = p.x + 2;
      const spikeHitboxY = p.y + 4;
      const spikeHitboxW = p.width - 4;
      const spikeHitboxH = p.height - 4;
      if (aabbOverlap(player.x, player.y, player.width, player.height,
                      spikeHitboxX, spikeHitboxY, spikeHitboxW, spikeHitboxH)) {
        result.hitSpike = true;
      }
    } else if (p.type === 'flag') {
      if (aabbOverlap(player.x, player.y, player.width, player.height,
                      p.x, p.y, p.width, p.height)) {
        result.reachedFlag = true;
      }
    } else if (p.type === 'checkpoint') {
      if (aabbOverlap(player.x, player.y, player.width, player.height,
                      p.x, p.y, p.width, p.height)) {
        if (player.lastCheckpoint.x !== p.x || player.lastCheckpoint.y !== p.y - player.height) {
          player.lastCheckpoint = { x: p.x, y: p.y - player.height };
          result.passedCheckpoint = true;
        }
      }
    }
  }

  if (player.y > 2000) {
    result.hitSpike = true;
  }

  if (result.hitSpike && !player.blinking) {
    player.blinking = true;
    player.blinkTimer = 1.5;
    player.dead = true;
  }

  return result;
}

export function respawnPlayer(player: Player): void {
  player.x = player.lastCheckpoint.x;
  player.y = player.lastCheckpoint.y;
  player.vx = 0;
  player.vy = 0;
  player.blinking = true;
  player.blinkTimer = 1.5;
  player.onGround = false;
  player.onMovingPlatform = null;
  player.dead = false;
}
