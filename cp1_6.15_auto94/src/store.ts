import { create } from 'zustand';

export type ShieldAttribute = 'energy' | 'frost' | 'fire';

export interface ShieldState {
  attribute: ShieldAttribute;
  energy: number;
  maxEnergy: number;
  flickering: boolean;
  flickerTimer: number;
  visible: boolean;
}

export interface GameState {
  score: number;
  difficulty: number;
  shield: ShieldState;
  gameOver: boolean;
  gameOverTimer: number;
  levelUpAnim: number;
  scoreBounce: number;
  shieldSwitchAnim: number;
  addScore: (points: number) => void;
  setShieldAttribute: (attr: ShieldAttribute) => void;
  damageShield: (amount: number) => void;
  setGameOver: (v: boolean) => void;
  setGameOverTimer: (v: number) => void;
  resetGame: () => void;
  updateAnimations: (dt: number) => void;
}

const MAX_SHIELD_ENERGY = 100;
const SHIELD_DAMAGE = 20;

const initialShield = (): ShieldState => ({
  attribute: 'energy',
  energy: MAX_SHIELD_ENERGY,
  maxEnergy: MAX_SHIELD_ENERGY,
  flickering: false,
  flickerTimer: 0,
  visible: true,
});

export const useGameStore = create<GameState>((set, get) => ({
  score: 0,
  difficulty: 1,
  shield: initialShield(),
  gameOver: false,
  gameOverTimer: 0,
  levelUpAnim: 0,
  scoreBounce: 0,
  shieldSwitchAnim: 0,

  addScore: (points: number) => {
    const state = get();
    const newScore = state.score + points;
    const newDifficulty = Math.min(10, Math.floor(newScore / 500) + 1);
    set({
      score: newScore,
      difficulty: newDifficulty,
      scoreBounce: 1,
      levelUpAnim: newDifficulty > state.difficulty ? 1 : state.levelUpAnim,
    });
  },

  setShieldAttribute: (attr: ShieldAttribute) => {
    const state = get();
    if (state.shield.attribute === attr) return;
    set({
      shield: { ...state.shield, attribute: attr },
      shieldSwitchAnim: 1,
    });
  },

  damageShield: (amount: number) => {
    const state = get();
    if (!state.shield.visible) return;
    const newEnergy = Math.max(0, state.shield.energy - amount);
    set({
      shield: {
        ...state.shield,
        energy: newEnergy,
        flickering: newEnergy > 0,
        visible: newEnergy > 0,
      },
    });
  },

  setGameOver: (v: boolean) => set({ gameOver: v }),
  setGameOverTimer: (v: number) => set({ gameOverTimer: v }),

  resetGame: () =>
    set({
      score: 0,
      difficulty: 1,
      shield: initialShield(),
      gameOver: false,
      gameOverTimer: 0,
      levelUpAnim: 0,
      scoreBounce: 0,
      shieldSwitchAnim: 0,
    }),

  updateAnimations: (dt: number) => {
    const state = get();
    const dtSec = dt / 1000;

    let levelUpAnim = state.levelUpAnim;
    if (levelUpAnim > 0) {
      levelUpAnim = Math.max(0, levelUpAnim - dtSec / 0.6);
    }

    let scoreBounce = state.scoreBounce;
    if (scoreBounce > 0) {
      scoreBounce = Math.max(0, scoreBounce - dtSec / 0.3);
    }

    let shieldSwitchAnim = state.shieldSwitchAnim;
    if (shieldSwitchAnim > 0) {
      shieldSwitchAnim = Math.max(0, shieldSwitchAnim - dtSec / 0.5);
    }

    let flickering = state.shield.flickering;
    let flickerTimer = state.shield.flickerTimer + dtSec;
    if (flickerTimer > 0.2) {
      flickerTimer -= 0.2;
      flickering = !flickering;
    }

    set({
      levelUpAnim,
      scoreBounce,
      shieldSwitchAnim,
      shield: {
        ...state.shield,
        flickering: state.shield.energy < state.shield.maxEnergy && state.shield.energy > 0 ? flickering : false,
        flickerTimer,
      },
    });
  },
}));

export { MAX_SHIELD_ENERGY, SHIELD_DAMAGE };
