import * as THREE from 'three';
import type { MagicType, MagicProjectile, Particle, Side } from '../store/gameStore';

export interface MagicConfig {
  type: MagicType;
  name: string;
  color: string;
  emissiveColor: string;
  speed: number;
  damage: number;
  effects: string[];
  cooldown: number;
  projectileSize: number;
  particleCount: number;
  particleSize: number;
  particleSpeed: number;
  particleLife: number;
  glowIntensity: number;
}

export const MAGIC_CONFIGS: Record<MagicType, MagicConfig> = {
  fireball: {
    type: 'fireball',
    name: '火球',
    color: '#ff4500',
    emissiveColor: '#ff6600',
    speed: 8,
    damage: 15,
    effects: ['burn'],
    cooldown: 1.5,
    projectileSize: 0.5,
    particleCount: 50,
    particleSize: 0.15,
    particleSpeed: 4,
    particleLife: 0.8,
    glowIntensity: 2,
  },
  iceShard: {
    type: 'iceShard',
    name: '冰锥',
    color: '#00bfff',
    emissiveColor: '#88ddff',
    speed: 12,
    damage: 10,
    effects: ['slow'],
    cooldown: 1.0,
    projectileSize: 0.35,
    particleCount: 50,
    particleSize: 0.1,
    particleSpeed: 5,
    particleLife: 0.8,
    glowIntensity: 1.8,
  },
  lightning: {
    type: 'lightning',
    name: '闪电',
    color: '#ffff00',
    emissiveColor: '#ffffaa',
    speed: 20,
    damage: 20,
    effects: ['chain'],
    cooldown: 2.5,
    projectileSize: 0.3,
    particleCount: 50,
    particleSize: 0.08,
    particleSpeed: 6,
    particleLife: 0.8,
    glowIntensity: 2.5,
  },
};

let projectileIdCounter = 0;
let particleIdCounter = 0;

export const nextProjectileId = () => ++projectileIdCounter;
export const nextParticleId = () => ++particleIdCounter;

export function createProjectile(
  type: MagicType,
  startPosition: THREE.Vector3,
  direction: THREE.Vector3,
  owner: Side,
  speedMultiplier: number = 1
): MagicProjectile {
  const config = MAGIC_CONFIGS[type];
  return {
    id: nextProjectileId(),
    type,
    position: startPosition.clone(),
    velocity: direction.clone().normalize(),
    owner,
    damage: config.damage,
    speed: config.speed * speedMultiplier,
    color: config.color,
    effects: [...config.effects],
    createdAt: Date.now(),
  };
}

export function createExplosionParticles(
  position: THREE.Vector3,
  type: MagicType
): Particle[] {
  const config = MAGIC_CONFIGS[type];
  const particles: Particle[] = [];

  for (let i = 0; i < config.particleCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    const speed = config.particleSpeed * (0.5 + Math.random() * 0.5);

    const velocity = new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta) * speed,
      Math.sin(phi) * Math.sin(theta) * speed,
      Math.cos(phi) * speed
    );

    particles.push({
      id: nextParticleId(),
      position: position.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3
      )),
      velocity,
      color: config.color,
      life: config.particleLife * (0.7 + Math.random() * 0.3),
      maxLife: config.particleLife,
      size: config.particleSize * (0.7 + Math.random() * 0.6),
    });
  }

  return particles;
}

export function getMagicConfig(type: MagicType): MagicConfig {
  return MAGIC_CONFIGS[type];
}

export function getCooldownForType(type: MagicType): number {
  return MAGIC_CONFIGS[type].cooldown;
}

export const GESTURE_TO_MAGIC: Record<'fist' | 'open' | 'circle', MagicType> = {
  fist: 'fireball',
  open: 'iceShard',
  circle: 'lightning',
};
