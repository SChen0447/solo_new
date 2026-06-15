import { create } from 'zustand';

export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'snowy';

export interface Particle {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  opacity: number;
  type: 'rain' | 'snow' | 'drip' | 'cloud';
  life?: number;
}

export interface TreeData {
  x: number;
  z: number;
  height: number;
}

export interface StarData {
  x: number;
  y: number;
  size: number;
  blinkPhase: number;
  blinkSpeed: number;
}

interface WorldState {
  timeOfDay: number;
  sunElevation: number;
  sunAzimuth: number;
  sunIntensity: number;
  isNight: boolean;
  currentWeather: WeatherType;
  weatherTimer: number;
  particles: Particle[];
  particleIdCounter: number;
  cameraAzimuth: number;
  cameraPolar: number;
  cameraDistance: number;
  trees: TreeData[];
  stars: StarData[];
  colorTint: { r: number; g: number; b: number; opacity: number };

  setTimeOfDay: (t: number) => void;
  setWeather: (w: WeatherType) => void;
  incrementWeatherTimer: (dt: number) => void;
  addParticle: (p: Omit<Particle, 'id'>) => void;
  removeParticle: (id: number) => void;
  updateParticles: () => void;
  setCameraAzimuth: (a: number) => void;
  setCameraPolar: (p: number) => void;
  setCameraDistance: (d: number) => void;
  setColorTint: (tint: { r: number; g: number; b: number; opacity: number }) => void;
}

const WEATHER_TYPES: WeatherType[] = ['sunny', 'cloudy', 'rainy', 'snowy'];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function generateTrees(count: number, terrainSize: number): TreeData[] {
  const rand = seededRandom(42);
  const trees: TreeData[] = [];
  for (let i = 0; i < count; i++) {
    trees.push({
      x: Math.floor((rand() - 0.5) * terrainSize),
      z: Math.floor((rand() - 0.5) * terrainSize),
      height: 3 + Math.floor(rand() * 3)
    });
  }
  return trees;
}

function generateStars(count: number): StarData[] {
  const rand = seededRandom(777);
  const stars: StarData[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: rand() * 2 - 1,
      y: rand() * 0.8 + 0.1,
      size: 1 + rand() * 2,
      blinkPhase: rand() * Math.PI * 2,
      blinkSpeed: 1 + rand() * 2
    });
  }
  return stars;
}

export const useWorldStore = create<WorldState>((set, get) => ({
  timeOfDay: 0,
  sunElevation: 35,
  sunAzimuth: 0,
  sunIntensity: 0.5,
  isNight: false,
  currentWeather: 'sunny',
  weatherTimer: 0,
  particles: [],
  particleIdCounter: 0,
  cameraAzimuth: 0,
  cameraPolar: 30,
  cameraDistance: 100,
  trees: generateTrees(15, 28),
  stars: generateStars(100),
  colorTint: { r: 0, g: 0, b: 0, opacity: 0 },

  setTimeOfDay: (t: number) => {
    const cycleTime = 120;
    const normalizedT = ((t % cycleTime) + cycleTime) % cycleTime;
    const phase = normalizedT / cycleTime;
    const elevationRad = (phase * Math.PI * 2) - Math.PI / 2;
    const elevation = Math.sin(elevationRad) * 55 + 35;
    const azimuth = phase * 360;
    const intensity = elevation > 0
      ? Math.max(0.05, Math.sin((elevation / 90) * Math.PI))
      : 0.05;
    set({
      timeOfDay: normalizedT,
      sunElevation: elevation,
      sunAzimuth: azimuth,
      sunIntensity: intensity,
      isNight: elevation < 0
    });
  },

  setWeather: (w: WeatherType) => {
    const state = get();
    const currentIdx = WEATHER_TYPES.indexOf(state.currentWeather);
    const nextIdx = (currentIdx + 1) % WEATHER_TYPES.length;
    const nextWeather = w || WEATHER_TYPES[nextIdx];
    let tint = { r: 0, g: 0, b: 0, opacity: 0 };
    if (nextWeather === 'rainy') tint = { r: 100, g: 150, b: 255, opacity: 0.1 };
    else if (nextWeather === 'snowy') tint = { r: 255, g: 255, b: 255, opacity: 0.05 };
    set({ currentWeather: nextWeather, particles: [], colorTint: tint });
  },

  incrementWeatherTimer: (dt: number) => {
    const state = get();
    const newTimer = state.weatherTimer + dt;
    if (newTimer >= 30) {
      const currentIdx = WEATHER_TYPES.indexOf(state.currentWeather);
      const nextIdx = (currentIdx + 1) % WEATHER_TYPES.length;
      get().setWeather(WEATHER_TYPES[nextIdx]);
      set({ weatherTimer: 0 });
    } else {
      set({ weatherTimer: newTimer });
    }
  },

  addParticle: (p: Omit<Particle, 'id'>) => {
    const state = get();
    if (state.particles.length >= 200) {
      const nonCritical = state.particles.filter(x => x.type !== 'cloud');
      if (nonCritical.length > 0) {
        const toRemove = nonCritical[0].id;
        set(s => ({
          particles: [...s.particles.filter(x => x.id !== toRemove), { ...p, id: s.particleIdCounter }],
          particleIdCounter: s.particleIdCounter + 1
        }));
        return;
      }
    }
    set(s => ({
      particles: [...s.particles, { ...p, id: s.particleIdCounter }],
      particleIdCounter: s.particleIdCounter + 1
    }));
  },

  removeParticle: (id: number) => {
    set(s => ({ particles: s.particles.filter(p => p.id !== id) }));
  },

  updateParticles: () => {
    const state = get();
    const updated = state.particles.map(p => {
      const np = { ...p };
      np.x += p.vx;
      np.y += p.vy;
      np.z += p.vz;
      if (p.life !== undefined) {
        np.life = p.life - 1;
      }
      return np;
    });
    const filtered = updated.filter(p => {
      if (p.life !== undefined && p.life <= 0) return false;
      if (p.type === 'rain' && p.y < -20) return false;
      if (p.type === 'snow' && p.y < -20) return false;
      if (p.type === 'drip' && p.y < -5) return false;
      return true;
    });
    set({ particles: filtered });
  },

  setCameraAzimuth: (a: number) => set({ cameraAzimuth: a }),
  setCameraPolar: (p: number) => set({ cameraPolar: Math.max(-45, Math.min(60, p)) }),
  setCameraDistance: (d: number) => set({ cameraDistance: Math.max(50, Math.min(200, d)) }),
  setColorTint: (tint) => set({ colorTint: tint })
}));

export function getWeatherName(w: WeatherType): string {
  const names: Record<WeatherType, string> = {
    sunny: '晴朗',
    cloudy: '多云',
    rainy: '下雨',
    snowy: '下雪'
  };
  return names[w];
}

export function formatTime(timeOfDay: number): string {
  const totalMinutes = (timeOfDay / 120) * 24 * 60;
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = Math.floor(totalMinutes % 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}
