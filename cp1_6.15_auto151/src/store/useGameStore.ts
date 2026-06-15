import { create } from 'zustand';
import type {
  GameState,
  PlayerState,
  AIPatrolState,
  PropInstance,
  Vec3,
  PlayerRole,
  Settings,
} from '../types/game';
import {
  GAME_DURATION,
  MAP_SIZE,
  AI_PATROL_SPEED,
  AI_CHASE_SPEED,
} from '../types/game';
import { generateId } from '../utils/helpers';
import { eventBus } from '../systems/EventBus';

interface GameStore extends GameState {
  settings: Settings;
  localPlayerId: string | null;
  setLocalPlayerId: (id: string) => void;
  setSettings: (settings: Partial<Settings>) => void;
  addPlayer: (role: PlayerRole, name: string) => PlayerState;
  updatePlayer: (id: string, updates: Partial<PlayerState>) => void;
  removePlayer: (id: string) => void;
  addAI: (path: Vec3[]) => AIPatrolState;
  updateAI: (id: string, updates: Partial<AIPatrolState>) => void;
  addProp: (prop: Omit<PropInstance, 'id'>) => PropInstance;
  updateProp: (id: string, updates: Partial<PropInstance>) => void;
  removeProp: (id: string) => void;
  addSmokeZone: (position: Vec3, radius: number, duration: number) => void;
  addFakeFootstep: (position: Vec3, duration: number) => void;
  startGame: () => void;
  endGame: (winner: 'hunter' | 'stalker') => void;
  tick: (deltaTime: number) => void;
  setFullState: (state: Partial<GameState>) => void;
  resetGame: () => void;
}

const createInitialPlayerState = (
  id: string,
  role: PlayerRole,
  name: string
): PlayerState => ({
  id,
  role,
  position:
    role === 'hunter'
      ? [0, 1.6, 0]
      : [(Math.random() - 0.5) * MAP_SIZE * 0.8, 1, (Math.random() - 0.5) * MAP_SIZE * 0.8],
  rotation: [0, 0, 0],
  health: 100,
  isMarked: false,
  isInvisible: false,
  speedMultiplier: 1,
  inventory: [],
  name,
  markProgress: 0,
  isPointerLocked: false,
});

const createInitialAIState = (id: string, path: Vec3[]): AIPatrolState => ({
  id,
  state: 'patrol',
  position: path[0],
  rotation: [0, 0, 0],
  pathIndex: 0,
  path,
  alertEndTime: 0,
  chaseEndTime: 0,
  showExclamation: false,
  exclamationEndTime: 0,
});

const getInitialState = (): GameState => ({
  phase: 'waiting',
  timeRemaining: GAME_DURATION,
  players: {},
  aiUnits: {},
  props: {},
  markedCount: 0,
  totalStalkers: 0,
  keyFragments: 0,
  alertLevel: 0,
  stats: {
    hunter: {
      marks: 0,
      alertsReceived: 0,
      playTime: 0,
    },
    stalker: {
      survivedTime: 0,
      propsUsed: 0,
      fragmentsCollected: 0,
    },
  },
  smokeZones: {},
  fakeFootsteps: {},
});

export const useGameStore = create<GameStore>((set, get) => ({
  ...getInitialState(),
  settings: {
    mouseSensitivity: 1.0,
    cameraPitch: 45,
    isMobile: typeof window !== 'undefined' && window.innerWidth < 768,
  },
  localPlayerId: null,

  setLocalPlayerId: (id: string) => set({ localPlayerId: id }),

  setSettings: (settings: Partial<Settings>) =>
    set((state) => ({
      settings: { ...state.settings, ...settings },
    })),

  addPlayer: (role: PlayerRole, name: string) => {
    const id = generateId();
    const player = createInitialPlayerState(id, role, name);
    set((state) => ({
      players: { ...state.players, [id]: player },
      totalStalkers:
        role === 'stalker' ? state.totalStalkers + 1 : state.totalStalkers,
    }));
    return player;
  },

  updatePlayer: (id: string, updates: Partial<PlayerState>) =>
    set((state) => ({
      players: {
        ...state.players,
        [id]: { ...state.players[id], ...updates },
      },
    })),

  removePlayer: (id: string) =>
    set((state) => {
      const { [id]: removed, ...players } = state.players;
      return {
        players,
        totalStalkers:
          removed?.role === 'stalker'
            ? state.totalStalkers - 1
            : state.totalStalkers,
      };
    }),

  addAI: (path: Vec3[]) => {
    const id = generateId();
    const ai = createInitialAIState(id, path);
    set((state) => ({
      aiUnits: { ...state.aiUnits, [id]: ai },
    }));
    return ai;
  },

  updateAI: (id: string, updates: Partial<AIPatrolState>) =>
    set((state) => ({
      aiUnits: {
        ...state.aiUnits,
        [id]: { ...state.aiUnits[id], ...updates },
      },
    })),

  addProp: (prop) => {
    const id = generateId();
    const newProp = { ...prop, id };
    set((state) => ({
      props: { ...state.props, [id]: newProp },
    }));
    return newProp;
  },

  updateProp: (id: string, updates: Partial<PropInstance>) =>
    set((state) => ({
      props: {
        ...state.props,
        [id]: { ...state.props[id], ...updates },
      },
    })),

  removeProp: (id: string) =>
    set((state) => {
      const { [id]: removed, ...props } = state.props;
      return { props };
    }),

  addSmokeZone: (position: Vec3, radius: number, duration: number) => {
    const id = generateId();
    const endTime = performance.now() + duration;
    set((state) => ({
      smokeZones: {
        ...state.smokeZones,
        [id]: { position, radius, endTime },
      },
    }));
    eventBus.emit('smoke_created', { id, position, radius, duration });
  },

  addFakeFootstep: (position: Vec3, duration: number) => {
    const id = generateId();
    const endTime = performance.now() + duration;
    set((state) => ({
      fakeFootsteps: {
        ...state.fakeFootsteps,
        [id]: { position, endTime },
      },
    }));
    eventBus.emit('fake_footstep', { id, position, duration });
  },

  startGame: () => {
    set({
      phase: 'playing',
      timeRemaining: GAME_DURATION,
    });
  },

  endGame: (winner: 'hunter' | 'stalker') => {
    set({
      phase: 'ended',
      winner,
    });
    eventBus.emit('game_end', { winner });
  },

  tick: (deltaTime: number) => {
    const state = get();
    if (state.phase !== 'playing') return;

    const now = performance.now();
    const newTimeRemaining = Math.max(0, state.timeRemaining - deltaTime);

    const updatedAIUnits: Record<string, AIPatrolState> = {};
    Object.values(state.aiUnits).forEach((ai) => {
      let updatedAI = { ...ai };

      if (ai.showExclamation && now > ai.exclamationEndTime) {
        updatedAI.showExclamation = false;
      }

      if (ai.state === 'alert' && now > ai.alertEndTime) {
        updatedAI.state = 'patrol';
      }

      if (ai.state === 'chase' && now > ai.chaseEndTime) {
        updatedAI.state = 'patrol';
      }

      const speed =
        ai.state === 'chase' ? AI_CHASE_SPEED : AI_PATROL_SPEED;
      const targetPoint = ai.path[ai.pathIndex];
      const dx = targetPoint[0] - ai.position[0];
      const dz = targetPoint[2] - ai.position[2];
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < 0.5) {
        updatedAI.pathIndex = (ai.pathIndex + 1) % ai.path.length;
      } else {
        const moveSpeed = speed * (deltaTime / 1000);
        const ratio = Math.min(1, moveSpeed / dist);
        updatedAI.position = [
          ai.position[0] + dx * ratio,
          ai.position[1],
          ai.position[2] + dz * ratio,
        ] as Vec3;
        updatedAI.rotation = [0, Math.atan2(dx, dz), 0] as Vec3;
      }

      updatedAIUnits[ai.id] = updatedAI;
    });

    const updatedSmokeZones: Record<string, typeof state.smokeZones[string]> = {};
    Object.entries(state.smokeZones).forEach(([id, zone]) => {
      if (now < zone.endTime) {
        updatedSmokeZones[id] = zone;
      }
    });

    const updatedFakeFootsteps: Record<string, typeof state.fakeFootsteps[string]> = {};
    Object.entries(state.fakeFootsteps).forEach(([id, step]) => {
      if (now < step.endTime) {
        updatedFakeFootsteps[id] = step;
      }
    });

    const unmarkedStalkers = Object.values(state.players).filter(
      (p) => p.role === 'stalker' && !p.isMarked
    );

    if (newTimeRemaining <= 0) {
      if (unmarkedStalkers.length > 0) {
        set({
          timeRemaining: 0,
          phase: 'ended',
          winner: 'stalker',
        });
        eventBus.emit('game_end', { winner: 'stalker' });
      } else {
        set({
          timeRemaining: 0,
          phase: 'ended',
          winner: 'hunter',
        });
        eventBus.emit('game_end', { winner: 'hunter' });
      }
      return;
    }

    if (unmarkedStalkers.length === 0 && state.totalStalkers > 0) {
      set({
        phase: 'ended',
        winner: 'hunter',
        timeRemaining: newTimeRemaining,
      });
      eventBus.emit('game_end', { winner: 'hunter' });
      return;
    }

    set({
      timeRemaining: newTimeRemaining,
      aiUnits: updatedAIUnits,
      smokeZones: updatedSmokeZones,
      fakeFootsteps: updatedFakeFootsteps,
      stats: {
        hunter: {
          ...state.stats.hunter,
          playTime: state.stats.hunter.playTime + deltaTime,
        },
        stalker: {
          ...state.stats.stalker,
          survivedTime:
            state.stats.stalker.survivedTime +
            unmarkedStalkers.length * deltaTime,
        },
      },
    });
  },

  setFullState: (state: Partial<GameState>) =>
    set((current) => ({
      ...current,
      ...state,
    })),

  resetGame: () =>
    set({
      ...getInitialState(),
    }),
}));
