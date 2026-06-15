import * as THREE from 'three';

export type MotionType = 'static' | 'float' | 'orbit' | 'sine';

export type ThemeType = 'neonCity' | 'aurora' | 'lava';

export interface ParticleData {
  id: string;
  position: THREE.Vector3;
  color: string;
  size: number;
  motionType: MotionType;
  createdAt: number;
  initialPosition: THREE.Vector3;
}

export interface ThemeConfig {
  name: string;
  background: string;
  colorPool: string[];
  connectionGradient: [string, string];
}

export interface RecordingFrame {
  timestamp: number;
  particles: {
    id: string;
    position: [number, number, number];
    color: string;
    size: number;
  }[];
}

export interface AnimationScript {
  version: string;
  fps: number;
  duration: number;
  frames: RecordingFrame[];
}
