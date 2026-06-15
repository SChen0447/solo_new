import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { WeatherType, WeatherParams, getWeatherParams, applyFluctuation } from './weatherEngine';

export interface SkillEffect {
  id: string;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  elapsed: number;
  duration: number;
  color: string;
  speed: number;
  particleDensity: number;
  particles: Particle[];
  label: string;
  labelElapsed: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  alpha: number;
}

export interface CharacterState {
  id: string;
  x: number;
  y: number;
  targetX: number | null;
  targetY: number | null;
  moving: boolean;
  moveStartTime: number;
  moveStartX: number;
  moveStartY: number;
  moveDuration: number;
  idleTime: number;
  legPhase: number;

  baseHP: number;
  baseAttack: number;
  baseDefense: number;
  baseSpeed: number;
  baseCooldown: number;

  currentHP: number;
  currentAttack: number;
  currentDefense: number;
  currentSpeed: number;
  currentCooldown: number;

  weatherType: WeatherType;
  weatherParams: WeatherParams;
  fluctuation: number;

  skillEffects: SkillEffect[];
  totalParticles: number;
}

interface CharacterStore extends CharacterState {
  setWeather: (type: WeatherType) => void;
  applyFluctuation: () => void;
  moveTo: (x: number, y: number) => void;
  updatePosition: (dt: number) => void;
  addSkillEffect: (x: number, y: number) => void;
  updateSkillEffects: (dt: number) => void;
  clearSkillEffects: () => void;
  recalculateStats: () => void;
}

const BASE_HP = 1000;
const BASE_ATTACK = 100;
const BASE_DEFENSE = 50;
const BASE_SPEED = 200;
const BASE_COOLDOWN = 1.0;

export const useCharacterStore = create<CharacterStore>((set, get) => ({
  id: uuidv4(),
  x: 400,
  y: 300,
  targetX: null,
  targetY: null,
  moving: false,
  moveStartTime: 0,
  moveStartX: 400,
  moveStartY: 300,
  moveDuration: 0,
  idleTime: 0,
  legPhase: 0,

  baseHP: BASE_HP,
  baseAttack: BASE_ATTACK,
  baseDefense: BASE_DEFENSE,
  baseSpeed: BASE_SPEED,
  baseCooldown: BASE_COOLDOWN,

  currentHP: BASE_HP,
  currentAttack: BASE_ATTACK,
  currentDefense: BASE_DEFENSE,
  currentSpeed: BASE_SPEED,
  currentCooldown: BASE_COOLDOWN,

  weatherType: 'sunny',
  weatherParams: getWeatherParams('sunny'),
  fluctuation: 0,

  skillEffects: [],
  totalParticles: 0,

  setWeather: (type: WeatherType) => {
    const params = getWeatherParams(type);
    set({ weatherType: type, weatherParams: params, fluctuation: 0 });
    get().recalculateStats();
  },

  applyFluctuation: () => {
    const f = (Math.random() * 0.10 - 0.05);
    set({ fluctuation: f });
    const current = get().weatherParams;
    set({ weatherParams: applyFluctuation(current, f) });
    get().recalculateStats();
  },

  moveTo: (x: number, y: number) => {
    const state = get();
    if (state.moving) return;
    const dx = x - state.x;
    const dy = y - state.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speedMod = 1 + state.weatherParams.speedMod;
    const actualSpeed = state.baseSpeed * Math.max(0.1, speedMod);
    const duration = (dist / actualSpeed) * 1000;
    set({
      targetX: x,
      targetY: y,
      moving: true,
      moveStartTime: performance.now(),
      moveStartX: state.x,
      moveStartY: state.y,
      moveDuration: duration,
    });
  },

  updatePosition: (dt: number) => {
    const state = get();
    if (!state.moving) {
      set({ idleTime: state.idleTime + dt });
      return;
    }
    const now = performance.now();
    let t = (now - state.moveStartTime) / state.moveDuration;
    if (t >= 1) {
      set({
        x: state.targetX!,
        y: state.targetY!,
        moving: false,
        targetX: null,
        targetY: null,
        idleTime: 0,
      });
      get().addSkillEffect(state.targetX!, state.targetY!);
      return;
    }
    const eased = 1 - Math.pow(1 - t, 3);
    const newX = state.moveStartX + (state.targetX! - state.moveStartX) * eased;
    const newY = state.moveStartY + (state.targetY! - state.moveStartY) * eased;
    const speedMod = 1 + state.weatherParams.speedMod;
    const legSpeed = Math.max(1, speedMod) * 8;
    set({
      x: newX,
      y: newY,
      legPhase: state.legPhase + dt * legSpeed,
    });
  },

  addSkillEffect: (x: number, y: number) => {
    const state = get();
    const wp = state.weatherParams;
    const particles: Particle[] = [];
    for (let i = 0; i < wp.particleDensity; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 80 * wp.skillSpeed;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.4,
        maxLife: 0.4 + Math.random() * 0.4,
        color: wp.skillColor,
        size: 5,
        alpha: 0.8,
      });
    }
    const effect: SkillEffect = {
      id: uuidv4(),
      x,
      y,
      radius: 20,
      maxRadius: 120,
      elapsed: 0,
      duration: 0.4,
      color: wp.skillColor,
      speed: wp.skillSpeed,
      particleDensity: wp.particleDensity,
      particles,
      label: '基础攻击',
      labelElapsed: 0,
    };
    const newEffects = [...state.skillEffects, effect];
    set({
      skillEffects: newEffects,
      totalParticles: newEffects.reduce((s, e) => s + e.particles.length, 0),
    });
  },

  updateSkillEffects: (dt: number) => {
    const state = get();
    let totalP = 0;
    const overLimit = state.totalParticles > 200;
    const updated = state.skillEffects
      .map((effect) => {
        const newElapsed = effect.elapsed + dt;
        const t = Math.min(newElapsed / effect.duration, 1);
        const newRadius = 20 + (effect.maxRadius - 20) * t * effect.speed;
        const newLabelElapsed = effect.labelElapsed + dt;
        const newParticles = effect.particles
          .filter((p) => p.life > 0)
          .map((p) => {
            const newLife = p.life - dt;
            const lifeRatio = Math.max(0, newLife / p.maxLife);
            const particleAlpha = overLimit ? 0.4 * lifeRatio : 0.8 * lifeRatio;
            const particleSize = overLimit ? 3 * lifeRatio : 5 * lifeRatio;
            return {
              ...p,
              x: p.x + p.vx * dt,
              y: p.y + p.vy * dt,
              life: newLife,
              alpha: particleAlpha,
              size: Math.max(0.5, particleSize),
            };
          });
        totalP += newParticles.length;
        return {
          ...effect,
          elapsed: newElapsed,
          radius: newRadius,
          labelElapsed: newLabelElapsed,
          particles: newParticles,
        };
      })
      .filter((effect) => effect.elapsed < effect.duration + 1.5 || effect.particles.length > 0);
    set({ skillEffects: updated, totalParticles: totalP });
  },

  clearSkillEffects: () => {
    set({ skillEffects: [], totalParticles: 0 });
  },

  recalculateStats: () => {
    const state = get();
    const wp = state.weatherParams;
    set({
      currentHP: state.baseHP,
      currentAttack: Math.round(state.baseAttack * (1 + wp.attackMod) * 10) / 10,
      currentDefense: Math.round(state.baseDefense * (1 + wp.defenseMod) * 10) / 10,
      currentSpeed: Math.round(state.baseSpeed * (1 + wp.speedMod) * 10) / 10,
      currentCooldown: Math.round(state.baseCooldown * (1 + wp.cooldownMod) * 100) / 100,
    });
  },
}));
