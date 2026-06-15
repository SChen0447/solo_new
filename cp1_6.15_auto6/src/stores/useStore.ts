import { create } from 'zustand';
import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';
import { ParticleData, MotionType, ThemeType, ThemeConfig, RecordingFrame, AnimationScript } from '../types';

export const THEMES: Record<ThemeType, ThemeConfig> = {
  neonCity: {
    name: '霓虹都市',
    background: '#0a0a1a',
    colorPool: ['#ff00ff', '#00ffff', '#ff0080', '#80ff00', '#ffff00', '#ff8000', '#8000ff', '#0080ff'],
    connectionGradient: ['#ff00ff', '#00ffff']
  },
  aurora: {
    name: '极光幻境',
    background: '#0a1a1a',
    colorPool: ['#00ff88', '#00ffff', '#88ff00', '#00ffcc', '#88ffff', '#00ffaa', '#44ff88', '#aaffcc'],
    connectionGradient: ['#00ff88', '#00ffff']
  },
  lava: {
    name: '熔岩深渊',
    background: '#1a0a05',
    colorPool: ['#ff4400', '#ff8800', '#ffcc00', '#ff0000', '#ff2200', '#ff6600', '#ffaa00', '#ff0044'],
    connectionGradient: ['#ff4400', '#ffcc00']
  }
};

interface StoreState {
  particles: ParticleData[];
  selectedParticleId: string | null;
  currentTheme: ThemeType;
  isRecording: boolean;
  recordingFrames: RecordingFrame[];
  recordingStartTime: number;
  cameraPosition: THREE.Vector3;
  cameraTarget: THREE.Vector3;

  addParticle: (position: THREE.Vector3) => void;
  removeParticle: (id: string) => void;
  updateParticle: (id: string, updates: Partial<Pick<ParticleData, 'color' | 'size' | 'motionType' | 'position'>>) => void;
  selectParticle: (id: string | null) => void;
  setTheme: (theme: ThemeType) => void;
  getRandomColor: () => string;
  startRecording: () => void;
  stopRecording: () => void;
  addRecordingFrame: (timestamp: number, currentParticles: ParticleData[]) => void;
  exportAnimation: () => AnimationScript;
  setCameraPosition: (pos: THREE.Vector3) => void;
  setCameraTarget: (target: THREE.Vector3) => void;
}

export const useStore = create<StoreState>((set, get) => ({
  particles: [],
  selectedParticleId: null,
  currentTheme: 'neonCity',
  isRecording: false,
  recordingFrames: [],
  recordingStartTime: 0,
  cameraPosition: new THREE.Vector3(0, 5, 15),
  cameraTarget: new THREE.Vector3(0, 0, 0),

  addParticle: (position: THREE.Vector3) => {
    const color = get().getRandomColor();
    const newParticle: ParticleData = {
      id: uuidv4(),
      position: position.clone(),
      initialPosition: position.clone(),
      color,
      size: 0.3,
      motionType: 'static',
      createdAt: performance.now()
    };
    set((state) => ({ particles: [...state.particles, newParticle] }));
  },

  removeParticle: (id: string) => {
    set((state) => ({
      particles: state.particles.filter((p) => p.id !== id),
      selectedParticleId: state.selectedParticleId === id ? null : state.selectedParticleId
    }));
  },

  updateParticle: (id, updates) => {
    set((state) => ({
      particles: state.particles.map((p) =>
        p.id === id
          ? {
              ...p,
              ...updates,
              position: updates.position ? updates.position.clone() : p.position,
              initialPosition: updates.position ? updates.position.clone() : p.initialPosition
            }
          : p
      )
    }));
  },

  selectParticle: (id) => set({ selectedParticleId: id }),

  setTheme: (theme) => set({ currentTheme: theme }),

  getRandomColor: () => {
    const pool = THEMES[get().currentTheme].colorPool;
    return pool[Math.floor(Math.random() * pool.length)];
  },

  startRecording: () => {
    set({
      isRecording: true,
      recordingFrames: [],
      recordingStartTime: performance.now()
    });
  },

  stopRecording: () => {
    set({ isRecording: false });
  },

  addRecordingFrame: (timestamp, currentParticles) => {
    const frame: RecordingFrame = {
      timestamp,
      particles: currentParticles.map((p) => ({
        id: p.id,
        position: [p.position.x, p.position.y, p.position.z],
        color: p.color,
        size: p.size
      }))
    };
    set((state) => ({
      recordingFrames: [...state.recordingFrames, frame]
    }));
  },

  exportAnimation: () => {
    const state = get();
    const duration = state.recordingFrames.length > 0 
      ? state.recordingFrames[state.recordingFrames.length - 1].timestamp / 1000 
      : 0;
    return {
      version: '1.0',
      fps: 30,
      duration,
      frames: state.recordingFrames
    };
  },

  setCameraPosition: (pos) => set({ cameraPosition: pos.clone() }),
  setCameraTarget: (target) => set({ cameraTarget: target.clone() })
}));
