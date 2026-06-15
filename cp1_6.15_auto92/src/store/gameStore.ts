import { create } from 'zustand';
import * as THREE from 'three';

export type MagicType = 'fireball' | 'iceShard' | 'lightning';
export type GestureType = 'fist' | 'open' | 'circle' | 'swipe' | 'none';
export type AIState = 'defense' | 'counter' | 'dodge';
export type GamePhase = 'calibration' | 'playing' | 'gameOver';
export type Side = 'player' | 'ai';

export interface MagicProjectile {
  id: number;
  type: MagicType;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  owner: Side;
  damage: number;
  speed: number;
  color: string;
  effects: string[];
  createdAt: number;
}

export interface Particle {
  id: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

export interface ExplosionEvent {
  id: number;
  position: THREE.Vector3;
  color: string;
  timestamp: number;
}

export interface ScreenShockEvent {
  id: number;
  hitScreenX: number;
  hitScreenY: number;
  timestamp: number;
}

export interface GameState {
  phase: GamePhase;
  playerHP: number;
  aiHP: number;
  maxHP: number;
  playerScore: number;
  aiScore: number;
  magicCooldown: number;
  maxCooldown: number;
  currentGesture: GestureType;
  gestureConfidence: number;
  calibrationFrames: number;
  handLostTime: number;
  aiState: AIState;
  aiMagicCount: number;
  playerMagicCount: number;
  aiShieldActive: boolean;
  aiShieldColor: string;
  aiDodgeOffset: number;
  aiDodgeTarget: number;
  playerDodging: boolean;
  playerDodgeOffset: number;
  dodgeFlashActive: boolean;
  dodgeFlashEnd: number;
  afterimages: { id: number; position: THREE.Vector3; endTime: number }[];
  projectiles: MagicProjectile[];
  particles: Particle[];
  explosions: ExplosionEvent[];
  screenShocks: ScreenShockEvent[];
  playerSpellCount: number;
  aiLastCastTime: number;
  aiNextCastInterval: number;
  winner: Side | null;
}

export interface GameActions {
  setPhase: (phase: GamePhase) => void;
  resetGame: () => void;
  damagePlayer: (amount: number) => void;
  damageAI: (amount: number) => void;
  incrementPlayerScore: () => void;
  incrementAIScore: () => void;
  setCooldown: (value: number) => void;
  reduceCooldown: (delta: number) => void;
  setGesture: (gesture: GestureType, confidence: number) => void;
  incrementCalibrationFrames: () => void;
  resetCalibrationFrames: () => void;
  setHandLostTime: (time: number) => void;
  setAIState: (state: AIState) => void;
  setAIShieldActive: (active: boolean) => void;
  setAIDodgeTarget: (target: number) => void;
  updateAIDodgeOffset: (delta: number) => void;
  setPlayerDodging: (active: boolean) => void;
  updatePlayerDodgeOffset: (delta: number) => void;
  setDodgeFlash: (active: boolean, endTime: number) => void;
  addAfterimage: (id: number, position: THREE.Vector3, endTime: number) => void;
  removeExpiredAfterimages: (now: number) => void;
  addProjectile: (projectile: MagicProjectile) => void;
  removeProjectile: (id: number) => void;
  updateProjectiles: () => void;
  addParticles: (particles: Particle[]) => void;
  removeParticles: (ids: number[]) => void;
  updateParticles: (delta: number) => void;
  addExplosion: (position: THREE.Vector3, color: string) => void;
  removeExpiredExplosions: (now: number) => void;
  addScreenShock: (hitScreenX: number, hitScreenY: number) => void;
  removeExpiredScreenShocks: (now: number) => void;
  incrementPlayerSpellCount: () => void;
  incrementAIMagicCount: () => void;
  setAILastCastTime: (time: number) => void;
  setAINextCastInterval: (interval: number) => void;
  setWinner: (winner: Side | null) => void;
}

const initialState: GameState = {
  phase: 'calibration',
  playerHP: 100,
  aiHP: 100,
  maxHP: 100,
  playerScore: 0,
  aiScore: 0,
  magicCooldown: 0,
  maxCooldown: 1.5,
  currentGesture: 'none',
  gestureConfidence: 0,
  calibrationFrames: 0,
  handLostTime: 0,
  aiState: 'defense',
  aiMagicCount: 0,
  playerMagicCount: 0,
  aiShieldActive: false,
  aiShieldColor: '#8a2be2',
  aiDodgeOffset: 0,
  aiDodgeTarget: 0,
  playerDodging: false,
  playerDodgeOffset: 0,
  dodgeFlashActive: false,
  dodgeFlashEnd: 0,
  afterimages: [],
  projectiles: [],
  particles: [],
  explosions: [],
  screenShocks: [],
  playerSpellCount: 0,
  aiLastCastTime: 0,
  aiNextCastInterval: 3,
  winner: null,
};

let idCounter = 0;
const nextId = () => ++idCounter;

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  ...initialState,

  setPhase: (phase) => set({ phase }),

  resetGame: () => set({ ...initialState, phase: 'calibration' }),

  damagePlayer: (amount) => {
    const state = get();
    const newHP = Math.max(0, state.playerHP - amount);
    const updates: Partial<GameState> = { playerHP: newHP };
    if (newHP <= 0) {
      updates.phase = 'gameOver';
      updates.winner = 'ai';
    }
    set(updates);
  },

  damageAI: (amount) => {
    const state = get();
    const newHP = Math.max(0, state.aiHP - amount);
    const updates: Partial<GameState> = { aiHP: newHP };
    if (newHP <= 0) {
      updates.phase = 'gameOver';
      updates.winner = 'player';
    }
    set(updates);
  },

  incrementPlayerScore: () => set((s) => ({ playerScore: s.playerScore + 1 })),
  incrementAIScore: () => set((s) => ({ aiScore: s.aiScore + 1 })),

  setCooldown: (value) => set({ magicCooldown: value }),
  reduceCooldown: (delta) =>
    set((s) => ({ magicCooldown: Math.max(0, s.magicCooldown - delta) })),

  setGesture: (gesture, confidence) =>
    set({ currentGesture: gesture, gestureConfidence: confidence }),

  incrementCalibrationFrames: () =>
    set((s) => ({ calibrationFrames: s.calibrationFrames + 1 })),

  resetCalibrationFrames: () => set({ calibrationFrames: 0 }),

  setHandLostTime: (time) => set({ handLostTime: time }),

  setAIState: (state) => set({ aiState: state }),

  setAIShieldActive: (active) => set({ aiShieldActive: active }),

  setAIDodgeTarget: (target) => set({ aiDodgeTarget: target }),

  updateAIDodgeOffset: (delta) =>
    set((s) => {
      if (Math.abs(s.aiDodgeTarget - s.aiDodgeOffset) < 0.01) {
        return { aiDodgeOffset: s.aiDodgeTarget };
      }
      const dir = Math.sign(s.aiDodgeTarget - s.aiDodgeOffset);
      const newOffset = s.aiDodgeOffset + dir * Math.min(Math.abs(s.aiDodgeTarget - s.aiDodgeOffset), delta * 3);
      return { aiDodgeOffset: newOffset };
    }),

  setPlayerDodging: (active) => set({ playerDodging: active }),

  updatePlayerDodgeOffset: (delta) =>
    set((s) => {
      const target = s.playerDodging ? -1.5 : 0;
      if (Math.abs(target - s.playerDodgeOffset) < 0.01) {
        return { playerDodgeOffset: target };
      }
      const dir = Math.sign(target - s.playerDodgeOffset);
      const newOffset = s.playerDodgeOffset + dir * Math.min(Math.abs(target - s.playerDodgeOffset), delta * 8);
      return { playerDodgeOffset: newOffset };
    }),

  setDodgeFlash: (active, endTime) =>
    set({ dodgeFlashActive: active, dodgeFlashEnd: endTime }),

  addAfterimage: (id, position, endTime) =>
    set((s) => ({ afterimages: [...s.afterimages, { id, position, endTime }] })),

  removeExpiredAfterimages: (now) =>
    set((s) => ({
      afterimages: s.afterimages.filter((a) => a.endTime > now),
    })),

  addProjectile: (projectile) =>
    set((s) => {
      let projectiles = [...s.projectiles, projectile];
      if (projectiles.length > 30) {
        projectiles = projectiles.slice(projectiles.length - 30);
      }
      return { projectiles };
    }),

  removeProjectile: (id) =>
    set((s) => ({ projectiles: s.projectiles.filter((p) => p.id !== id) })),

  updateProjectiles: () =>
    set((s) => ({
      projectiles: s.projectiles.map((p) => ({
        ...p,
        position: p.position.clone().add(p.velocity.clone().multiplyScalar(p.speed * 0.016)),
      })),
    })),

  addParticles: (newParticles) =>
    set((s) => {
      let particles = [...s.particles, ...newParticles];
      if (particles.length > 400) {
        particles = particles.slice(particles.length - 400);
      }
      return { particles };
    }),

  removeParticles: (ids) =>
    set((s) => ({
      particles: s.particles.filter((p) => !ids.includes(p.id)),
    })),

  updateParticles: (delta) =>
    set((s) => ({
      particles: s.particles
        .map((p) => ({
          ...p,
          position: p.position.clone().add(p.velocity.clone().multiplyScalar(delta)),
          life: p.life - delta,
        }))
        .filter((p) => p.life > 0),
    })),

  addExplosion: (position, color) =>
    set((s) => ({
      explosions: [...s.explosions, { id: nextId(), position: position.clone(), color, timestamp: Date.now() }],
    })),

  removeExpiredExplosions: (now) =>
    set((s) => ({
      explosions: s.explosions.filter((e) => now - e.timestamp < 800),
    })),

  addScreenShock: (hitScreenX, hitScreenY) =>
    set((s) => ({
      screenShocks: [...s.screenShocks, { id: nextId(), hitScreenX, hitScreenY, timestamp: Date.now() }],
    })),

  removeExpiredScreenShocks: (now) =>
    set((s) => ({
      screenShocks: s.screenShocks.filter((sh) => now - sh.timestamp < 300),
    })),

  incrementPlayerSpellCount: () =>
    set((s) => ({
      playerSpellCount: s.playerSpellCount + 1,
    })),

  incrementAIMagicCount: () =>
    set((s) => ({ aiMagicCount: s.aiMagicCount + 1 })),

  setAILastCastTime: (time) => set({ aiLastCastTime: time }),

  setAINextCastInterval: (interval) => set({ aiNextCastInterval: interval }),

  setWinner: (winner) => set({ winner }),
}));
