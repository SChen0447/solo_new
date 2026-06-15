import { WeatherType, Particle, TreeData } from '../store/useWorldStore';
import { VOXEL_SIZE } from './voxelUtils';

export interface ParticleConfig {
  count: number;
  spawnInterval: number;
  factory: (index: number) => Omit<Particle, 'id'>;
}

const seededRand = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
};

export function getParticleConfig(weather: WeatherType): ParticleConfig | null {
  switch (weather) {
    case 'rainy':
      return {
        count: 100,
        spawnInterval: 0.5,
        factory: () => {
          const r = Math.random;
          return {
            x: (r() - 0.5) * 32 * VOXEL_SIZE,
            y: 80 + r() * 20,
            z: (r() - 0.5) * 32 * VOXEL_SIZE,
            vx: 0,
            vy: -2,
            vz: 0,
            size: 1,
            opacity: 0.6,
            type: 'rain'
          };
        }
      };

    case 'snowy':
      return {
        count: 50,
        spawnInterval: 1,
        factory: () => {
          const r = Math.random;
          return {
            x: (r() - 0.5) * 32 * VOXEL_SIZE,
            y: 80 + r() * 20,
            z: (r() - 0.5) * 32 * VOXEL_SIZE,
            vx: (r() - 0.5) * 0.5,
            vy: -0.5,
            vz: (r() - 0.5) * 0.5,
            size: 2,
            opacity: 0.9,
            type: 'snow'
          };
        }
      };

    case 'cloudy':
      return {
        count: 4,
        spawnInterval: 0,
        factory: (i: number) => {
          const r = seededRand(i + 100);
          return {
            x: (r() - 0.5) * 200,
            y: 60 + r() * 20,
            z: (r() - 0.5) * 200,
            vx: 0.1,
            vy: 0,
            vz: 0,
            size: 15 + r() * 10,
            opacity: 0.3,
            type: 'cloud'
          };
        }
      };

    default:
      return null;
  }
}

export function getDripParticles(trees: TreeData[]): Omit<Particle, 'id'>[] {
  const particles: Omit<Particle, 'id'>[] = [];
  trees.forEach((tree) => {
    if (Math.random() < 0.3) {
      const baseX = tree.x * VOXEL_SIZE;
      const baseZ = tree.z * VOXEL_SIZE;
      const canopyTop = 3 * VOXEL_SIZE + VOXEL_SIZE;
      particles.push({
        x: baseX + (Math.random() - 0.5) * VOXEL_SIZE * 2,
        y: canopyTop - VOXEL_SIZE,
        z: baseZ + (Math.random() - 0.5) * VOXEL_SIZE * 2,
        vx: 0,
        vy: -2,
        vz: 0,
        size: 0.8,
        opacity: 0.7,
        type: 'drip',
        life: 20
      });
    }
  });
  return particles;
}

export function getWeatherTint(weather: WeatherType): { r: number; g: number; b: number; opacity: number } {
  switch (weather) {
    case 'rainy':
      return { r: 100, g: 150, b: 255, opacity: 0.1 };
    case 'snowy':
      return { r: 255, g: 255, b: 255, opacity: 0.05 };
    default:
      return { r: 0, g: 0, b: 0, opacity: 0 };
  }
}
