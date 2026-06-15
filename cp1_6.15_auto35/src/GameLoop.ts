import { create } from 'zustand';
import type { SoundFeatures } from './SoundEngine';
import { particleSystem } from './ParticleSystem';

export interface SkillCondition {
  freqMin: number;
  freqMax: number;
  minAmplitude: number;
}

export interface SkillState {
  id: string;
  name: string;
  key: string;
  cooldownRemaining: number;
  color: string;
  condition: SkillCondition;
}

interface GameState {
  skills: SkillState[];
  soundFeatures: SoundFeatures;
  hitCount: number;
  totalAttempts: number;
  hitRate: number;
  screenShake: number;
  lastSkillTime: number;
  lastSkillId: string | null;
  comboActive: boolean;
  triggerSkill: (id: string, originX?: number, originY?: number) => void;
  updateSoundFeatures: (f: SoundFeatures) => void;
  tick: (deltaTime: number) => void;
  resetCombo: () => void;
}

const INITIAL_SKILLS: SkillState[] = [
  {
    id: 'impact',
    name: '音波冲击',
    key: '1',
    cooldownRemaining: 0,
    color: '#00d4ff',
    condition: { freqMin: 800, freqMax: 1000, minAmplitude: 0.6 },
  },
  {
    id: 'shield',
    name: '护盾共鸣',
    key: '2',
    cooldownRemaining: 0,
    color: '#ffd700',
    condition: { freqMin: 200, freqMax: 400, minAmplitude: 0.3 },
  },
  {
    id: 'blade',
    name: '音刃斩',
    key: '3',
    cooldownRemaining: 0,
    color: '#ff4444',
    condition: { freqMin: 600, freqMax: 800, minAmplitude: 0.7 },
  },
  {
    id: 'shockwave',
    name: '震荡波',
    key: '4',
    cooldownRemaining: 0,
    color: '#aa00ff',
    condition: { freqMin: 400, freqMax: 600, minAmplitude: 0.5 },
  },
  {
    id: 'echo',
    name: '回声陷阱',
    key: '5',
    cooldownRemaining: 0,
    color: '#00ff88',
    condition: { freqMin: 100, freqMax: 200, minAmplitude: 0.4 },
  },
];

const COOLDOWN_DURATION = 2;
const COMBO_WINDOW = 2;
const SCENE_WIDTH = 800;
const SCENE_HEIGHT = 500;

export const useGameStore = create<GameState>((set, get) => ({
  skills: INITIAL_SKILLS,
  soundFeatures: { frequency: 0, amplitude: 0, bpm: 0, isActive: false },
  hitCount: 0,
  totalAttempts: 0,
  hitRate: 0,
  screenShake: 0,
  lastSkillTime: 0,
  lastSkillId: null,
  comboActive: false,

  triggerSkill: (id: string, originX?: number, originY?: number) => {
    const state = get();
    const skill = state.skills.find((s) => s.id === id);
    if (!skill) return;
    if (skill.cooldownRemaining > 0) return;

    const now = performance.now() / 1000;
    const isCombo =
      state.lastSkillId !== null &&
      state.lastSkillId !== id &&
      now - state.lastSkillTime < COMBO_WINDOW;

    const x = originX ?? SCENE_WIDTH / 2;
    const y = originY ?? SCENE_HEIGHT / 2;

    particleSystem.emit(id, x, y, isCombo);

    set((prev) => {
      const newSkills = prev.skills.map((s) =>
        s.id === id ? { ...s, cooldownRemaining: COOLDOWN_DURATION } : s
      );
      const newHitCount = prev.hitCount + 1;
      const newTotalAttempts = prev.totalAttempts + 1;
      return {
        skills: newSkills,
        hitCount: newHitCount,
        totalAttempts: newTotalAttempts,
        hitRate: Math.round((newHitCount / newTotalAttempts) * 100),
        screenShake: isCombo ? 12 : 6,
        lastSkillTime: now,
        lastSkillId: id,
        comboActive: isCombo,
      };
    });

    if (isCombo) {
      setTimeout(() => {
        set({ comboActive: false });
      }, 600);
    }
  },

  updateSoundFeatures: (features: SoundFeatures) => {
    const state = get();
    set({ soundFeatures: features });

    if (features.isActive) {
      for (const skill of state.skills) {
        if (skill.cooldownRemaining > 0) continue;
        const c = skill.condition;
        if (
          features.frequency >= c.freqMin &&
          features.frequency <= c.freqMax &&
          features.amplitude >= c.minAmplitude
        ) {
          get().triggerSkill(skill.id);
          break;
        }
      }
    }
  },

  tick: (deltaTime: number) => {
    set((prev) => ({
      skills: prev.skills.map((s) => ({
        ...s,
        cooldownRemaining: Math.max(0, s.cooldownRemaining - deltaTime),
      })),
      screenShake: Math.max(0, prev.screenShake - deltaTime * 30),
    }));
  },

  resetCombo: () => {
    set({ lastSkillId: null, lastSkillTime: 0 });
  },
}));
