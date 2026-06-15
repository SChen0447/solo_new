import { create } from 'zustand';
import type { AudioFeatures } from '@/audio/AudioEngine';
import type { SkillEffect, Enemy, CombatRecord } from '@/combat/CombatEngine';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface SkillNamePopup {
  name: string;
  timestamp: number;
  opacity: number;
  scale: number;
}

interface ShakeState {
  amplitude: number;
  duration: number;
  startTime: number;
}

interface AppState {
  audioFeatures: AudioFeatures | null;
  skillEffects: SkillEffect[];
  particles: Particle[];
  enemies: Enemy[];
  combatRecords: CombatRecord[];
  skillNamePopup: SkillNamePopup | null;
  shake: ShakeState | null;
  isMicActive: boolean;
  shieldActive: boolean;

  setAudioFeatures: (features: AudioFeatures) => void;
  addSkillEffect: (effect: SkillEffect) => void;
  setEnemies: (enemies: Enemy[]) => void;
  setCombatRecords: (records: CombatRecord[]) => void;
  setMicActive: (active: boolean) => void;
  setShieldActive: (active: boolean) => void;
  showSkillPopup: (name: string) => void;
  triggerShake: (amplitude: number, duration: number) => void;
  updateParticles: (dt: number) => void;
  clearSkillEffects: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  audioFeatures: null,
  skillEffects: [],
  particles: [],
  enemies: [],
  combatRecords: [],
  skillNamePopup: null,
  shake: null,
  isMicActive: false,
  shieldActive: false,

  setAudioFeatures: (features) => set({ audioFeatures: features }),

  addSkillEffect: (effect) =>
    set((state) => {
      const newParticles: Particle[] = [];
      for (let i = 0; i < effect.particleCount; i++) {
        const angle = (Math.PI * 2 * i) / effect.particleCount + Math.random() * 0.5;
        const speed = 2 + Math.random() * 4;
        const life = effect.particleLifeMin + Math.random() * (effect.particleLifeMax - effect.particleLifeMin);
        newParticles.push({
          x: effect.position.x,
          y: effect.position.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1,
          life,
          maxLife: life,
          color: effect.particleColor,
          size: 2 + Math.random() * 4,
        });
      }
      return {
        skillEffects: [...state.skillEffects, effect],
        particles: [...state.particles, ...newParticles],
      };
    }),

  setEnemies: (enemies) => set({ enemies }),

  setCombatRecords: (records) => set({ combatRecords: records }),

  setMicActive: (active) => set({ isMicActive: active }),

  setShieldActive: (active) => set({ shieldActive: active }),

  showSkillPopup: (name) =>
    set({
      skillNamePopup: { name, timestamp: performance.now(), opacity: 1, scale: 0.5 },
    }),

  triggerShake: (amplitude, duration) =>
    set({ shake: { amplitude, duration, startTime: performance.now() } }),

  updateParticles: (dt) =>
    set((state) => {
      const updated = state.particles
        .map((p) => ({
          ...p,
          x: p.x + p.vx * dt * 60,
          y: p.y + p.vy * dt * 60,
          vy: p.vy + 0.05 * dt * 60,
          life: p.life - dt,
        }))
        .filter((p) => p.life > 0);
      return { particles: updated };
    }),

  clearSkillEffects: () =>
    set((state) => ({
      skillEffects: state.skillEffects.filter(
        (e) => performance.now() - e.timestamp < 1500
      ),
    })),
}));
