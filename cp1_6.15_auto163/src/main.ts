import rawConfig from '../config.json';
import type { GameConfig, PortalConfig } from './types';
import { Player } from './player';
import { EnemySystem } from './enemy';
import { MapSystem, PortalInteractResult, ItemCollectResult } from './map';
import { UISystem } from './ui';

const config = rawConfig as GameConfig;

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
if (!canvas) {
  throw new Error('Canvas element not found');
}
const ctx: CanvasRenderingContext2D = canvas.getContext('2d') as CanvasRenderingContext2D;
if (!ctx) {
  throw new Error('Canvas 2D context not available');
}

const CANVAS_W = canvas.width;
const CANVAS_H = canvas.height;
const ROOM_W = config.room.width;
const ROOM_H = config.room.height;
const SCALE = CANVAS_W / ROOM_W;

interface PendingTransition {
  targetRoomId: number;
  targetX: number;
  targetY: number;
  executed: boolean;
}

let pendingTransition: PendingTransition | null = null;
let transitionExecutedThisCycle = false;
let prevHealthStatus = 0;

const player = new Player(config);
const enemySystem = new EnemySystem(config);
const mapSystem = new MapSystem(config);
const uiSystem = new UISystem(config, CANVAS_W, CANVAS_H);

function loadRoomEnemies(): void {
  const room = mapSystem.getCurrentRoom();
  if (room) {
    enemySystem.loadRoom(room.enemies);
  }
}

loadRoomEnemies();

let lastTime = performance.now();
let fpsAccumulator = 0;
let fpsCounter = 0;
let currentFps = 0;

function showFPS(): void {
  ctx.save();
  ctx.font = '10px "Courier New", monospace';
  ctx.fillStyle = '#c9a84c';
  ctx.textAlign = 'right';
  ctx.fillText(`FPS: ${currentFps}`, CANVAS_W - 10, 16);
  ctx.restore();
}

function getCurrentPortalNearPlayer(): { portal: PortalConfig; roomId: number } | null {
  const room = mapSystem.getCurrentRoom();
  if (!room) return null;
  const playerCX = player.state.x + player.state.width / 2;
  const playerCY = player.state.y + player.state.height / 2;
  const pr = config.portal.radius;

  for (const portal of room.portals) {
    const dx = playerCX - portal.x;
    const dy = playerCY - portal.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= pr + 8) {
      return { portal, roomId: room.id };
    }
  }
  return null;
}

function gameLoop(timestamp: number): void {
  requestAnimationFrame(gameLoop);

  let dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;
  if (dt > 0.05) dt = 0.05;
  if (dt < 0.0001) dt = 0.0001;

  fpsAccumulator += dt;
  fpsCounter++;
  if (fpsAccumulator >= 0.5) {
    currentFps = Math.round(fpsCounter / fpsAccumulator);
    fpsAccumulator = 0;
    fpsCounter = 0;
  }

  const { platforms, walls } = mapSystem.getPlatformsAndWalls();
  const isTransitioning = uiSystem.isInTransition();

  if (!isTransitioning) {
    player.update(dt, platforms, walls);
    enemySystem.update(dt, player.state);
    mapSystem.update(dt);
    enemySystem.checkDartEnemyCollision(player.darts);

    const fireballDamage = enemySystem.checkPlayerFireballCollision(player.state);
    if (fireballDamage > 0) {
      player.takeDamage(fireballDamage);
    }

    if (enemySystem.checkPlayerEnemyCollision(player.state)) {
      player.takeDamage(1);
    }

    if (player.state.health <= 2 && player.state.health !== prevHealthStatus) {
      uiSystem.triggerLowHealthFlash();
    } else if (player.state.health <= 2 && Math.random() < 0.015) {
      uiSystem.triggerLowHealthFlash();
    }
    prevHealthStatus = player.state.health;

    if (player.state.health <= 0) {
      player.state.x = config.player.startX;
      player.state.y = config.player.startY;
      player.state.health = player.state.maxHealth;
      player.state.vx = 0;
      player.state.vy = 0;
    }

    const itemResult: ItemCollectResult | null = mapSystem.checkItemCollection(player.state);
    if (itemResult) {
      if (itemResult.type === 'key') {
        player.addKey();
        uiSystem.addUnlockText('获得钥匙!');
      } else if (itemResult.type === 'heart') {
        player.heal(1);
        uiSystem.addUnlockText('生命+1!');
      } else if (itemResult.type === 'weapon') {
        if (!player.state.hasWeapon) {
          player.giveWeapon();
          uiSystem.addUnlockText('能力已解锁: 远程飞镖 (J/K攻击)');
        } else {
          uiSystem.addUnlockText('获得武器升级!');
        }
      }
    }

    const nearPortal = getCurrentPortalNearPlayer();
    if (nearPortal) {
      const isLocked = mapSystem.isPortalLocked(nearPortal.roomId, nearPortal.portal);
      if (isLocked && player.state.keys > 0 && player.isInteractPressed()) {
        if (mapSystem.tryUnlockPortal(player.state)) {
          player.state.keys -= 1;
          uiSystem.addUnlockText('传送门已解锁!');
        }
      }

      if (player.isInteractPressed()) {
        const portalResult: PortalInteractResult | null = mapSystem.checkPortalCollision(player.state);
        if (portalResult && !isLocked) {
          uiSystem.addTransitionEffect();
          uiSystem.addPortalHaloEffect();
          pendingTransition = {
            targetRoomId: portalResult.targetRoomId,
            targetX: portalResult.targetX,
            targetY: portalResult.targetY,
            executed: false,
          };
          transitionExecutedThisCycle = false;
        }
      }
    }
  }

  if (pendingTransition && !pendingTransition.executed && !transitionExecutedThisCycle) {
    if (uiSystem.isTransitionHalfway()) {
      mapSystem.switchRoom(
        pendingTransition.targetRoomId,
        pendingTransition.targetX,
        pendingTransition.targetY,
        player.state
      );
      loadRoomEnemies();
      pendingTransition.executed = true;
      transitionExecutedThisCycle = true;
    }
  }
  if (!uiSystem.isInTransition()) {
    pendingTransition = null;
    transitionExecutedThisCycle = false;
  }

  uiSystem.update(dt);

  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  if (!isTransitioning || !pendingTransition || pendingTransition.executed) {
    mapSystem.renderBackground(ctx, SCALE);
    mapSystem.renderItems(ctx, SCALE);
    mapSystem.renderPortals(ctx, SCALE);
    uiSystem.renderParticles(ctx, player.particles, SCALE);
    enemySystem.render(ctx, SCALE);
    player.render(ctx, SCALE);
    uiSystem.renderDarts(ctx, player.darts, SCALE);
  }

  uiSystem.renderEffects(ctx);

  const nearPortal = getCurrentPortalNearPlayer();
  let canInteract = false;
  let needKey = false;
  if (nearPortal && !isTransitioning) {
    canInteract = true;
    needKey = mapSystem.isPortalLocked(nearPortal.roomId, nearPortal.portal);
  }
  if (!isTransitioning) {
    uiSystem.renderPortalPrompt(ctx, canInteract, needKey, player.state.keys, SCALE);
  }

  uiSystem.renderStatusBar(ctx, player.state, mapSystem.currentRoomId);
  uiSystem.renderMinimap(ctx, mapSystem, player.state);
  showFPS();

  if (player.state.hasWeapon) {
    ctx.save();
    ctx.font = '10px "Courier New", monospace';
    ctx.fillStyle = '#c9a84c';
    ctx.textAlign = 'right';
    ctx.fillText('J/K: 攻击', CANVAS_W - 10, 32);
    ctx.restore();
  }
}

requestAnimationFrame(gameLoop);

console.log('Metroidvania Prototype 已启动');
console.log('操作说明: WASD移动, 空格跳跃(长短按控制高度), E传送门交互, J/K攻击(需武器)');
