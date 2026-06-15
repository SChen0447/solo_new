import { FishData, FishSpecies } from "./store";

export const TANK_WIDTH = 6;
export const TANK_DEPTH = 4;
export const TANK_HEIGHT = 4;
export const TANK_WALL_THICKNESS = 0.05;
export const FISH_SPAWN_Y = 0.5;
export const SWING_AMPLITUDE = 0.08;
export const BASE_FREQ_20C = 1.2;
export const BASE_FREQ_30C = 2.0;

export const FISH_PALETTES: Record<
  FishSpecies,
  { primary: string; secondary: string; glow?: string }
> = {
  clownfish: { primary: "#ff7043", secondary: "#ffffff" },
  angelfish: { primary: "#42a5f5", secondary: "#ffee58" },
  lanternfish: { primary: "#424242", secondary: "#00e676", glow: "#00e676" },
};

export const SPECIES_NAMES: Record<FishSpecies, string> = {
  clownfish: "小丑鱼",
  angelfish: "神仙鱼",
  lanternfish: "灯笼鱼",
};

let fishIdCounter = 0;
let rippleIdCounter = 0;
let bubbleIdCounter = 0;
let surfaceRippleIdCounter = 0;

export const generateFishId = () => `fish_${++fishIdCounter}`;
export const generateRippleId = () => `ripple_${++rippleIdCounter}`;
export const generateBubbleId = () => `bubble_${++bubbleIdCounter}`;
export const generateSurfaceRippleId = () =>
  `sripple_${++surfaceRippleIdCounter}`;

export class Fish {
  id: string;
  species: FishSpecies;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  size: number;
  speed: number;
  direction: { x: number; z: number };
  phase: number;
  isSelected: boolean;
  targetPosition: { x: number; z: number } | null;
  wanderTimer: number;
  noiseOffset: number;

  constructor(
    species: FishSpecies,
    position: { x: number; y: number; z: number },
    size?: number
  ) {
    this.id = generateFishId();
    this.species = species;
    this.position = { ...position };
    this.rotation = { x: 0, y: 0, z: 0 };
    this.size = size ?? 0.3 + Math.random() * 0.2;
    this.speed = 0.8 + Math.random() * 0.4;
    const angle = Math.random() * Math.PI * 2;
    this.direction = { x: Math.cos(angle), z: Math.sin(angle) };
    this.phase = Math.random() * Math.PI * 2;
    this.isSelected = false;
    this.targetPosition = null;
    this.wanderTimer = 2 + Math.random() * 3;
    this.noiseOffset = Math.random() * 1000;
  }

  toFishData(): FishData {
    return {
      id: this.id,
      species: this.species,
      position: { ...this.position },
      rotation: { ...this.rotation },
      size: this.size,
      speed: this.speed,
      direction: { ...this.direction },
      phase: this.phase,
      isSelected: this.isSelected,
      noiseOffset: this.noiseOffset,
    };
  }
}

export function createFish(
  species: FishSpecies,
  x: number,
  z: number
): Fish {
  const y = FISH_SPAWN_Y + Math.random() * 1.5;
  const fish = new Fish(species, { x, y, z });
  return fish;
}

export function calculateSwimFrequency(temperature: number): number {
  const t = Math.max(10, Math.min(35, temperature));
  if (t <= 20) {
    const ratio = (t - 10) / 10;
    return BASE_FREQ_20C * (0.6 + ratio * 0.4);
  } else if (t >= 30) {
    const ratio = Math.min(1, (t - 30) / 5);
    return BASE_FREQ_30C * (1 + ratio * 0.3);
  } else {
    const ratio = (t - 20) / 10;
    return BASE_FREQ_20C + (BASE_FREQ_30C - BASE_FREQ_20C) * ratio;
  }
}

function pseudoNoise(x: number, y: number, t: number): number {
  const a = Math.sin(x * 12.9898 + y * 78.233 + t * 0.1) * 43758.5453;
  return a - Math.floor(a);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function updateFishes(
  fishes: Fish[],
  dt: number,
  temperature: number,
  waterQuality: number,
  lightIntensity: number
): Fish[] {
  const freq = calculateSwimFrequency(temperature);
  const tempFactor = (temperature - 10) / 25;
  const qualityLow = waterQuality < 30;
  const qualityHigh = waterQuality > 70;

  const halfW = TANK_WIDTH / 2 - 0.3;
  const halfD = TANK_DEPTH / 2 - 0.3;
  const minY = 0.2;
  const maxY = TANK_HEIGHT - 0.4;

  for (const f of fishes) {
    f.wanderTimer -= dt;

    let baseSpeed = 0.6 + tempFactor * 1.0;
    if (qualityLow) baseSpeed *= 1.8;
    if (qualityHigh) baseSpeed *= 0.6;
    f.speed = baseSpeed;

    const noiseX = pseudoNoise(f.noiseOffset, 0, performance.now() / 1000);
    const noiseZ = pseudoNoise(f.noiseOffset + 100, 0, performance.now() / 1000);
    const turnBiasX = (noiseX - 0.5) * 2;
    const turnBiasZ = (noiseZ - 0.5) * 2;

    let dirX = f.direction.x + turnBiasX * dt * 1.5;
    let dirZ = f.direction.z + turnBiasZ * dt * 1.5;

    if (qualityLow && Math.random() < dt * 2) {
      const angle = Math.random() * Math.PI * 2;
      dirX = Math.cos(angle);
      dirZ = Math.sin(angle);
    }

    if (qualityHigh) {
      let flockCenterX = 0,
        flockCenterZ = 0,
        count = 0;
      for (const other of fishes) {
        const dx = other.position.x - f.position.x;
        const dz = other.position.z - f.position.z;
        const distSq = dx * dx + dz * dz;
        if (other.id !== f.id && distSq < 4) {
          flockCenterX += other.position.x;
          flockCenterZ += other.position.z;
          count++;
        }
      }
      if (count > 0) {
        flockCenterX /= count;
        flockCenterZ /= count;
        const toX = flockCenterX - f.position.x;
        const toZ = flockCenterZ - f.position.z;
        const toLen = Math.sqrt(toX * toX + toZ * toZ) || 1;
        dirX += (toX / toLen) * dt * 0.8;
        dirZ += (toZ / toLen) * dt * 0.8;
      }
    }

    const dirLen = Math.sqrt(dirX * dirX + dirZ * dirZ) || 1;
    f.direction = { x: dirX / dirLen, z: dirZ / dirLen };

    f.position.x += f.direction.x * f.speed * dt;
    f.position.z += f.direction.z * f.speed * dt;

    const yNoise =
      pseudoNoise(f.noiseOffset + 500, 0, performance.now() / 2000) - 0.5;
    f.position.y += yNoise * dt * 0.3;

    if (f.position.x > halfW) {
      f.position.x = halfW;
      f.direction.x = -Math.abs(f.direction.x);
    } else if (f.position.x < -halfW) {
      f.position.x = -halfW;
      f.direction.x = Math.abs(f.direction.x);
    }
    if (f.position.z > halfD) {
      f.position.z = halfD;
      f.direction.z = -Math.abs(f.direction.z);
    } else if (f.position.z < -halfD) {
      f.position.z = -halfD;
      f.direction.z = Math.abs(f.direction.z);
    }
    f.position.y = clamp(f.position.y, minY, maxY);

    const targetYaw = Math.atan2(f.direction.x, f.direction.z);
    f.rotation.y = targetYaw;

    f.phase += freq * dt * Math.PI * 2;
    const swing = Math.sin(f.phase) * SWING_AMPLITUDE;
    f.rotation.z = swing;
    f.rotation.x = Math.sin(f.phase * 0.5) * 0.05;
  }

  return fishes;
}
