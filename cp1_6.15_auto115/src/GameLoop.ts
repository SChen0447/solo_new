import { create } from 'zustand';
import {
  SceneState,
  NPC,
  Shop,
  InfoPanel,
  TimePhase,
  Vec2,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  CYCLE_HOURS,
  DAY_START,
  DUSK_START,
  NIGHT_START,
  COLOR_DAY,
  COLOR_DUSK,
  COLOR_NIGHT,
  SHOP_POSITION,
  SHOP_SIZE,
  lerp,
  clamp,
  getTimePhase,
  generateStars,
  createInitialNPCs,
  createInitialShop,
  createInitialInfoPanel,
  updateNPCBehaviorForPhase,
} from './entities';

interface GameStore extends SceneState {
  rafId: number | null;
  lastTime: number;
  signBlinkTimer: number;
  setTimeSpeed: (speed: number) => void;
  showNPCInfo: (npc: NPC, clickPos: Vec2) => void;
  showShopMessage: (pos: Vec2, message: string) => void;
  start: () => void;
  stop: () => void;
  tick: (dt: number) => void;
}

const DEFAULT_CYCLE_SECONDS = 30;
const HOURS_PER_SECOND_AT_1X = CYCLE_HOURS / DEFAULT_CYCLE_SECONDS;

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) =>
    Math.round(v).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function interpolateColor(c1: string, c2: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(c1);
  const [r2, g2, b2] = hexToRgb(c2);
  return rgbToHex(
    lerp(r1, r2, t),
    lerp(g1, g2, t),
    lerp(b1, b2, t),
  );
}

function getCurrentBackgroundColor(hours: number): string {
  const h = hours;
  if (h >= DAY_START + 3 && h < DUSK_START) {
    return COLOR_DAY;
  } else if (h >= DUSK_START && h < NIGHT_START) {
    const t = (h - DUSK_START) / (NIGHT_START - DUSK_START);
    return interpolateColor(COLOR_DAY, COLOR_DUSK, t);
  } else if (h >= NIGHT_START && h < NIGHT_START + 2) {
    const t = (h - NIGHT_START) / 2;
    return interpolateColor(COLOR_DUSK, COLOR_NIGHT, t);
  } else if (h >= DAY_START && h < DAY_START + 3) {
    const t = (h - DAY_START) / 3;
    return interpolateColor(COLOR_NIGHT, COLOR_DAY, t);
  } else {
    return COLOR_NIGHT;
  }
}

function getSunMoonPosition(hours: number, isSun: boolean): Vec2 {
  const t = isSun
    ? (hours - DAY_START) / (DUSK_START - DAY_START)
    : hours < DAY_START
      ? (hours + CYCLE_HOURS - NIGHT_START) / (DAY_START + CYCLE_HOURS - NIGHT_START)
      : (hours - NIGHT_START) / (DAY_START + CYCLE_HOURS - NIGHT_START);

  const clampedT = clamp(t, 0, 1);
  const startX = 80;
  const endX = CANVAS_WIDTH - 80;
  const x = lerp(startX, endX, clampedT);

  const y = 120 - Math.sin(clampedT * Math.PI) * 70;
  return { x, y };
}

function updateShopForPhase(shop: Shop, phase: TimePhase, blinkTimer: number): Shop {
  const updated = { ...shop };
  if (phase === 'day') {
    updated.signColor = '#4caf50';
    updated.signText = 'OPEN';
    updated.signBlinking = false;
    updated.signAlpha = 1;
  } else if (phase === 'dusk') {
    updated.signColor = '#ff9800';
    updated.signText = 'OPEN';
    updated.signBlinking = true;
    const blinkPhase = (blinkTimer % 0.6) / 0.6;
    updated.signAlpha = 0.5 + 0.5 * Math.abs(Math.sin(blinkPhase * Math.PI));
  } else {
    updated.signColor = '#f44336';
    updated.signText = 'CLOSED';
    updated.signBlinking = false;
    updated.signAlpha = 1;
  }
  return updated;
}

function updateSingleNPC(npc: NPC, dt: number, time: number): NPC {
  const updated = { ...npc };

  if (updated.transitionDuration > 0) {
    updated.transitionProgress += dt / updated.transitionDuration;
    if (updated.transitionProgress >= 1) {
      updated.transitionProgress = 1;
      updated.transitionDuration = 0;
      updated.position = { ...updated.targetPosition };
    } else {
      const t = updated.transitionProgress;
      updated.position = {
        x: lerp(updated.previousPosition.x, updated.targetPosition.x, t),
        y: lerp(updated.previousPosition.y, updated.targetPosition.y, t),
      };
    }
  }

  const scaleT = dt * 4;
  updated.scale = lerp(updated.scale, updated.targetScale, clamp(scaleT, 0, 1));

  switch (updated.behavior) {
    case 'guard_patrolling': {
      const speed = updated.currentSpeed;
      if (updated.patrolDirection === 1) {
        updated.position.x += speed * dt;
        updated.facing = 'east';
        if (updated.position.x >= 400) {
          updated.position.x = 400;
          updated.patrolDirection = -1;
        }
      } else {
        updated.position.x -= speed * dt;
        updated.facing = 'west';
        if (updated.position.x <= 300) {
          updated.position.x = 300;
          updated.patrolDirection = 1;
        }
      }
      break;
    }

    case 'villager_wandering': {
      updated.wanderTimer -= dt;
      const distToTarget = Math.hypot(
        updated.targetPosition.x - updated.position.x,
        updated.targetPosition.y - updated.position.y,
      );
      if (updated.wanderTimer <= 0 || distToTarget < 5) {
        const centerX = 400;
        const centerY = 300;
        const range = 80;
        updated.targetPosition = {
          x: centerX + (Math.random() - 0.5) * range * 2,
          y: centerY + (Math.random() - 0.5) * range * 2,
        };
        updated.targetPosition.x = clamp(updated.targetPosition.x, 280, 520);
        updated.targetPosition.y = clamp(updated.targetPosition.y, 220, 420);
        updated.wanderTimer = 1 + Math.random() * 2;
      }
      const dx = updated.targetPosition.x - updated.position.x;
      const dy = updated.targetPosition.y - updated.position.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 1) {
        const speed = updated.currentSpeed;
        updated.position.x += (dx / dist) * speed * dt;
        updated.position.y += (dy / dist) * speed * dt;
        if (Math.abs(dx) > Math.abs(dy)) {
          updated.facing = dx > 0 ? 'east' : 'west';
        } else {
          updated.facing = dy > 0 ? 'south' : 'north';
        }
      }
      break;
    }

    case 'villager_walking_home': {
      if (updated.transitionDuration <= 0) {
        const dx = updated.targetPosition.x - updated.position.x;
        const dy = updated.targetPosition.y - updated.position.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 2) {
          const speed = updated.currentSpeed;
          updated.position.x += (dx / dist) * speed * dt;
          updated.position.y += (dy / dist) * speed * dt;
          if (Math.abs(dx) > Math.abs(dy)) {
            updated.facing = dx > 0 ? 'east' : 'west';
          } else {
            updated.facing = dy > 0 ? 'south' : 'north';
          }
        }
      }
      break;
    }

    case 'merchant_entering': {
      if (updated.transitionDuration <= 0) {
        const dx = updated.targetPosition.x - updated.position.x;
        const dy = updated.targetPosition.y - updated.position.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 1) {
          const speed = updated.currentSpeed;
          updated.position.x += (dx / dist) * speed * dt;
          updated.position.y += (dy / dist) * speed * dt;
        }
      }
      break;
    }
  }
  void time;

  return updated;
}

function updateInfoPanel(panel: InfoPanel, dt: number): InfoPanel {
  if (!panel.visible) return panel;
  const updated = { ...panel };
  updated.timer -= dt;
  if (updated.timer <= 0) {
    updated.visible = false;
    updated.alpha = 0;
  } else if (updated.timer <= updated.fadeDuration) {
    updated.alpha = updated.timer / updated.fadeDuration;
  } else {
    updated.alpha = 1;
  }
  return updated;
}

const initialNPCs = createInitialNPCs();

export const useGameStore = create<GameStore>((set, get) => ({
  worldTime: 7,
  timeSpeed: 1,
  phase: 'day',
  backgroundColor: COLOR_DAY,
  targetBackgroundColor: COLOR_DAY,
  sunMoonPosition: { x: 200, y: 70 },
  isSun: true,
  stars: generateStars(30),
  npcs: initialNPCs,
  shop: createInitialShop(),
  infoPanel: createInitialInfoPanel(),
  shopMessagePanel: createInitialInfoPanel(),
  rafId: null,
  lastTime: 0,
  signBlinkTimer: 0,

  setTimeSpeed: (speed: number) => {
    set({ timeSpeed: speed });
  },

  showNPCInfo: (npc: NPC, clickPos: Vec2) => {
    const speedPercent = Math.round((npc.currentSpeed / npc.speed) * 100);
    const panel: InfoPanel = {
      visible: true,
      position: {
        x: Math.min(clickPos.x + 20, CANVAS_WIDTH - 180),
        y: Math.max(clickPos.y - 80, 10),
      },
      content: [
        `名称: ${npc.name}`,
        `状态: ${npc.behaviorDescription}`,
        `速度: ${speedPercent}%`,
      ],
      timer: 3,
      totalDuration: 3,
      fadeDuration: 0.5,
      alpha: 1,
    };
    set({ infoPanel: panel });
  },

  showShopMessage: (pos: Vec2, message: string) => {
    const panel: InfoPanel = {
      visible: true,
      position: {
        x: Math.min(pos.x + 20, CANVAS_WIDTH - 180),
        y: Math.max(pos.y - 40, 10),
      },
      content: [message],
      timer: 3,
      totalDuration: 3,
      fadeDuration: 0.5,
      alpha: 1,
    };
    set({ shopMessagePanel: panel });
  },

  tick: (dt: number) => {
    const state = get();
    const timeSpeed = state.timeSpeed;

    let newWorldTime = state.worldTime + HOURS_PER_SECOND_AT_1X * timeSpeed * dt;
    newWorldTime = newWorldTime % CYCLE_HOURS;
    if (newWorldTime < 0) newWorldTime += CYCLE_HOURS;

    const previousPhase = state.phase;
    const newPhase = getTimePhase(newWorldTime);

    const newBackgroundColor = getCurrentBackgroundColor(newWorldTime);

    const isSun = newWorldTime >= DAY_START && newWorldTime < NIGHT_START;

    const sunMoonPos = getSunMoonPosition(newWorldTime, isSun);

    const newSignBlinkTimer = state.signBlinkTimer + dt;
    const newShop = updateShopForPhase(state.shop, newPhase, newSignBlinkTimer);

    let newNPCs = state.npcs;
    if (newPhase !== previousPhase) {
      newNPCs = state.npcs.map((npc) =>
        updateNPCBehaviorForPhase(npc, newPhase, previousPhase),
      );
    }
    newNPCs = newNPCs.map((npc) =>
      updateSingleNPC(npc, dt, newWorldTime),
    );

    const newStars = state.stars.map((star) => ({
      ...star,
      phase: star.phase + (dt * Math.PI * 2) / star.period,
    }));

    const newInfoPanel = updateInfoPanel(state.infoPanel, dt);
    const newShopPanel = updateInfoPanel(state.shopMessagePanel, dt);

    set({
      worldTime: newWorldTime,
      phase: newPhase,
      backgroundColor: newBackgroundColor,
      isSun,
      sunMoonPosition: sunMoonPos,
      shop: newShop,
      npcs: newNPCs,
      stars: newStars,
      signBlinkTimer: newSignBlinkTimer,
      infoPanel: newInfoPanel,
      shopMessagePanel: newShopPanel,
    });
  },

  start: () => {
    if (get().rafId !== null) return;
    let lastTime = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      get().tick(dt);
      const id = requestAnimationFrame(loop);
      set({ rafId: id, lastTime: now });
    };
    const id = requestAnimationFrame(loop);
    set({ rafId: id });
  },

  stop: () => {
    const { rafId } = get();
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      set({ rafId: null });
    }
  },
}));

export { SHOP_POSITION, SHOP_SIZE, CANVAS_WIDTH, CANVAS_HEIGHT };
