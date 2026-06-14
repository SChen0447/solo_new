import { create } from 'zustand';
import { VisualStyle } from './particleSystem';

interface AppState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  visualStyle: VisualStyle;
  isRecording: boolean;
  audioLoaded: boolean;
  fileName: string;
  setIsPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  setVisualStyle: (style: VisualStyle) => void;
  setIsRecording: (recording: boolean) => void;
  setAudioLoaded: (loaded: boolean) => void;
  setFileName: (name: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  visualStyle: 'galaxy',
  isRecording: false,
  audioLoaded: false,
  fileName: '',
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration }),
  setVolume: (volume) => set({ volume }),
  setVisualStyle: (style) => set({ visualStyle: style }),
  setIsRecording: (recording) => set({ isRecording: recording }),
  setAudioLoaded: (loaded) => set({ audioLoaded: loaded }),
  setFileName: (name) => set({ fileName: name }),
}));
