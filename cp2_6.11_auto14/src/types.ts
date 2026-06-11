export enum ParticleMode {
  SPHERE = 'sphere',
  BAR = 'bar'
}

export interface AudioState {
  isPlaying: boolean;
  isLoaded: boolean;
  currentTime: number;
  duration: number;
  volume: number;
}

export interface ParticleSystemConfig {
  particleCount: number;
  sphereRadius: number;
  maxDisplacement: number;
  fftSize: number;
  transitionDuration: number;
  barRows: number;
  barColumns: number;
  barSpacing: number;
}

export const DEFAULT_CONFIG: ParticleSystemConfig = {
  particleCount: 2000,
  sphereRadius: 5.0,
  maxDisplacement: 3.0,
  fftSize: 1024,
  transitionDuration: 500,
  barRows: 31,
  barColumns: 64,
  barSpacing: 0.5
};

export interface ControlsPanelCallbacks {
  onFileSelected: (file: File) => void;
  onPlayPause: () => void;
  onVolumeChange: (volume: number) => void;
  onSeek: (time: number) => void;
  onModeToggle: () => void;
}
