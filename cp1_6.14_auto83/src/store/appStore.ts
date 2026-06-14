import { create } from 'zustand';

export interface CameraState {
  theta: number;
  phi: number;
  radius: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  lookAtX: number;
  lookAtY: number;
  lookAtZ: number;
  animating: boolean;
  animStartTheta: number;
  animStartPhi: number;
  animStartRadius: number;
  animStartLookAtX: number;
  animStartLookAtY: number;
  animStartLookAtZ: number;
  animTargetTheta: number;
  animTargetPhi: number;
  animTargetRadius: number;
  animTargetLookAtX: number;
  animTargetLookAtY: number;
  animTargetLookAtZ: number;
  animDuration: number;
  animTime: number;
}

export interface ParticleParams {
  baseSize: number;
  gravity: number;
  bounceEnergy: number;
  colorIntensity: number;
}

export interface AppState {
  isPlaying: boolean;
  volume: number;
  audioFile: File | null;
  audioFileName: string;
  audioLoaded: boolean;
  performanceMode: boolean;
  particleCount: number;
  camera: CameraState;
  particleParams: ParticleParams;
  highlightedParticleIndex: number;
  highlightStartTime: number;
  setPlaying: (playing: boolean) => void;
  setVolume: (volume: number) => void;
  setAudioFile: (file: File | null, name: string) => void;
  setAudioLoaded: (loaded: boolean) => void;
  setPerformanceMode: (enabled: boolean) => void;
  setCamera: (cam: Partial<CameraState>) => void;
  setParticleParams: (params: Partial<ParticleParams>) => void;
  resetCamera: () => void;
  setHighlightedParticle: (index: number) => void;
}

const DEFAULT_CAMERA: CameraState = {
  theta: Math.PI / 4,
  phi: Math.PI / 3,
  radius: 10,
  targetX: 0,
  targetY: -0.5,
  targetZ: 0,
  lookAtX: 0,
  lookAtY: -0.5,
  lookAtZ: 0,
  animating: false,
  animStartTheta: 0,
  animStartPhi: 0,
  animStartRadius: 0,
  animStartLookAtX: 0,
  animStartLookAtY: 0,
  animStartLookAtZ: 0,
  animTargetTheta: 0,
  animTargetPhi: 0,
  animTargetRadius: 0,
  animTargetLookAtX: 0,
  animTargetLookAtY: 0,
  animTargetLookAtZ: 0,
  animDuration: 0,
  animTime: 0,
};

const DEFAULT_PARTICLE_PARAMS: ParticleParams = {
  baseSize: 0.1,
  gravity: 0.015,
  bounceEnergy: 0.6,
  colorIntensity: 1.0,
};

export const useAppStore = create<AppState>((set) => ({
  isPlaying: false,
  volume: 0.7,
  audioFile: null,
  audioFileName: '',
  audioLoaded: false,
  performanceMode: false,
  particleCount: 5000,
  camera: { ...DEFAULT_CAMERA },
  particleParams: { ...DEFAULT_PARTICLE_PARAMS },
  highlightedParticleIndex: -1,
  highlightStartTime: 0,

  setPlaying: (playing) => set({ isPlaying: playing }),
  setVolume: (volume) => set({ volume }),
  setAudioFile: (file, name) => set({ audioFile: file, audioFileName: name }),
  setAudioLoaded: (loaded) => set({ audioLoaded: loaded }),
  setPerformanceMode: (enabled) =>
    set({
      performanceMode: enabled,
      particleCount: enabled ? 2000 : 5000,
      particleParams: {
        ...DEFAULT_PARTICLE_PARAMS,
        baseSize: enabled ? 0.05 : 0.1,
      },
    }),
  setCamera: (cam) =>
    set((state) => ({
      camera: { ...state.camera, ...cam },
    })),
  setParticleParams: (params) =>
    set((state) => ({
      particleParams: { ...state.particleParams, ...params },
    })),
  resetCamera: () =>
    set((state) => ({
      camera: {
        ...state.camera,
        animating: true,
        animStartTheta: state.camera.theta,
        animStartPhi: state.camera.phi,
        animStartRadius: state.camera.radius,
        animStartLookAtX: state.camera.lookAtX,
        animStartLookAtY: state.camera.lookAtY,
        animStartLookAtZ: state.camera.lookAtZ,
        animTargetTheta: DEFAULT_CAMERA.theta,
        animTargetPhi: DEFAULT_CAMERA.phi,
        animTargetRadius: DEFAULT_CAMERA.radius,
        animTargetLookAtX: DEFAULT_CAMERA.lookAtX,
        animTargetLookAtY: DEFAULT_CAMERA.lookAtY,
        animTargetLookAtZ: DEFAULT_CAMERA.lookAtZ,
        animDuration: 0.8,
        animTime: 0,
      },
    })),
  setHighlightedParticle: (index) =>
    set({
      highlightedParticleIndex: index,
      highlightStartTime: index >= 0 ? performance.now() : 0,
    }),
}));
