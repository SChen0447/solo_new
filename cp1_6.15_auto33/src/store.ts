import { create } from 'zustand';

export type ColorTheme = 
  | 'neon' 
  | 'aurora' 
  | 'lava' 
  | 'cyberpunk' 
  | 'galaxy' 
  | 'pastel';

export interface ThemeColors {
  lowFreq: string;
  midFreqStart: string;
  midFreqEnd: string;
  particleStart: string;
  particleEnd: string;
}

export const themeColors: Record<ColorTheme, ThemeColors> = {
  neon: {
    lowFreq: '#ff6b6b',
    midFreqStart: '#00ffff',
    midFreqEnd: '#ff00ff',
    particleStart: '#ffd700',
    particleEnd: '#ff4500',
  },
  aurora: {
    lowFreq: '#4ecdc4',
    midFreqStart: '#00bfff',
    midFreqEnd: '#9370db',
    particleStart: '#e0ffff',
    particleEnd: '#87ceeb',
  },
  lava: {
    lowFreq: '#ff4500',
    midFreqStart: '#ff6347',
    midFreqEnd: '#ffd700',
    particleStart: '#ff0000',
    particleEnd: '#ff8c00',
  },
  cyberpunk: {
    lowFreq: '#ff00ff',
    midFreqStart: '#00ff00',
    midFreqEnd: '#ff00ff',
    particleStart: '#ffff00',
    particleEnd: '#00ffff',
  },
  galaxy: {
    lowFreq: '#6c63ff',
    midFreqStart: '#9370db',
    midFreqEnd: '#4b0082',
    particleStart: '#e6e6fa',
    particleEnd: '#483d8b',
  },
  pastel: {
    lowFreq: '#ffb6c1',
    midFreqStart: '#b0e0e6',
    midFreqEnd: '#dda0dd',
    particleStart: '#fffacd',
    particleEnd: '#f0e68c',
  },
};

export const themeNames: Record<ColorTheme, string> = {
  neon: '霓虹幻彩',
  aurora: '极光冰蓝',
  lava: '熔岩烈焰',
  cyberpunk: '赛博朋克',
  galaxy: '星空银河',
  pastel: '柔和粉彩',
};

interface AudioState {
  frequencyData: Float32Array;
  volume: number;
  bpm: number;
  isRecording: boolean;
  isPlaying: boolean;
  audioFile: File | null;
  currentTime: number;
  duration: number;
}

interface SceneState {
  sensitivity: number;
  particleCount: number;
  colorTheme: ColorTheme;
  lodEnabled: boolean;
}

interface PerformanceState {
  fps: number;
  isPerformanceMode: boolean;
}

interface ExportState {
  analysisHistory: Array<{
    timestamp: number;
    lowFreqEnergy: number;
    midFreqEnergy: number;
    highFreqEnergy: number;
    bpm: number;
    volume: number;
  }>;
}

interface AppState extends AudioState, SceneState, PerformanceState, ExportState {
  setFrequencyData: (data: Float32Array) => void;
  setVolume: (volume: number) => void;
  setBpm: (bpm: number) => void;
  setIsRecording: (isRecording: boolean) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setAudioFile: (file: File | null) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setSensitivity: (sensitivity: number) => void;
  setParticleCount: (count: number) => void;
  setColorTheme: (theme: ColorTheme) => void;
  setLodEnabled: (enabled: boolean) => void;
  setFps: (fps: number) => void;
  setIsPerformanceMode: (enabled: boolean) => void;
  addAnalysisFrame: (frame: {
    lowFreqEnergy: number;
    midFreqEnergy: number;
    highFreqEnergy: number;
  }) => void;
  clearAnalysisHistory: () => void;
}

const initialFrequencyData = new Float32Array(256);

export const useAppStore = create<AppState>((set) => ({
  frequencyData: initialFrequencyData,
  volume: 0,
  bpm: 0,
  isRecording: false,
  isPlaying: false,
  audioFile: null,
  currentTime: 0,
  duration: 0,
  sensitivity: 1.0,
  particleCount: 100,
  colorTheme: 'neon',
  lodEnabled: false,
  fps: 60,
  isPerformanceMode: false,
  analysisHistory: [],

  setFrequencyData: (data) => set({ frequencyData: data }),
  setVolume: (volume) => set({ volume }),
  setBpm: (bpm) => set({ bpm }),
  setIsRecording: (isRecording) => set({ isRecording }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setAudioFile: (audioFile) => set({ audioFile, currentTime: 0 }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  setSensitivity: (sensitivity) => set({ sensitivity }),
  setParticleCount: (particleCount) => {
    set({ 
      particleCount, 
      lodEnabled: particleCount > 150 
    });
  },
  setColorTheme: (colorTheme) => set({ colorTheme }),
  setLodEnabled: (lodEnabled) => set({ lodEnabled }),
  setFps: (fps) => set({ fps }),
  setIsPerformanceMode: (isPerformanceMode) => set({ isPerformanceMode }),
  addAnalysisFrame: (frame) => set((state) => ({
    analysisHistory: [...state.analysisHistory, {
      timestamp: Date.now(),
      ...frame,
      bpm: state.bpm,
      volume: state.volume,
    }],
  })),
  clearAnalysisHistory: () => set({ analysisHistory: [] }),
}));
