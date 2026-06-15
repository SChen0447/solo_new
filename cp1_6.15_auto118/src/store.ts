import { create } from 'zustand';

export interface MixParams {
  volume: number;
  bassGain: number;
  trebleGain: number;
}

export interface AudioState {
  audioSource: AudioBufferSourceNode | null;
  audioContext: AudioContext | null;
  analyser: AnalyserNode | null;
  frequencyData: Uint8Array;
  gainNode: GainNode | null;
  bassFilter: BiquadFilterNode | null;
  trebleFilter: BiquadFilterNode | null;
  isPlaying: boolean;
  fileName: string;
  autoRotate: boolean;
  volume: number;
  bassGain: number;
  trebleGain: number;

  setAudioContext: (ctx: AudioContext | null) => void;
  setAudioSource: (source: AudioBufferSourceNode | null) => void;
  setAnalyser: (analyser: AnalyserNode | null) => void;
  setGainNode: (node: GainNode | null) => void;
  setBassFilter: (filter: BiquadFilterNode | null) => void;
  setTrebleFilter: (filter: BiquadFilterNode | null) => void;
  setFrequencyData: (data: Uint8Array) => void;
  setVolume: (value: number) => void;
  setBassGain: (value: number) => void;
  setTrebleGain: (value: number) => void;
  setPlaying: (playing: boolean) => void;
  setFileName: (name: string) => void;
  setAutoRotate: (value: boolean) => void;
  reset: () => void;
}

const initialFrequencyData = new Uint8Array(400);

export const useAudioStore = create<AudioState>((set) => ({
  audioSource: null,
  audioContext: null,
  analyser: null,
  frequencyData: initialFrequencyData,
  gainNode: null,
  bassFilter: null,
  trebleFilter: null,
  isPlaying: false,
  fileName: '',
  autoRotate: true,
  volume: 1.0,
  bassGain: 0,
  trebleGain: 0,

  setAudioContext: (ctx) => set({ audioContext: ctx }),
  setAudioSource: (source) => set({ audioSource: source }),
  setAnalyser: (analyser) => set({ analyser }),
  setGainNode: (node) => set({ gainNode: node }),
  setBassFilter: (filter) => set({ bassFilter: filter }),
  setTrebleFilter: (filter) => set({ trebleFilter: filter }),
  setFrequencyData: (data) => set({ frequencyData: data }),
  setVolume: (value) => {
    set({ volume: value });
    const state = useAudioStore.getState();
    if (state.gainNode) {
      state.gainNode.gain.setTargetAtTime(value, state.audioContext?.currentTime || 0, 0.05);
    }
  },
  setBassGain: (value) => {
    set({ bassGain: value });
    const state = useAudioStore.getState();
    if (state.bassFilter) {
      state.bassFilter.gain.setTargetAtTime(value, state.audioContext?.currentTime || 0, 0.05);
    }
  },
  setTrebleGain: (value) => {
    set({ trebleGain: value });
    const state = useAudioStore.getState();
    if (state.trebleFilter) {
      state.trebleFilter.gain.setTargetAtTime(value, state.audioContext?.currentTime || 0, 0.05);
    }
  },
  setPlaying: (playing) => set({ isPlaying: playing }),
  setFileName: (name) => set({ fileName: name }),
  setAutoRotate: (value) => set({ autoRotate: value }),
  reset: () =>
    set({
      audioSource: null,
      analyser: null,
      frequencyData: initialFrequencyData,
      gainNode: null,
      bassFilter: null,
      trebleFilter: null,
      isPlaying: false,
      fileName: '',
      volume: 1.0,
      bassGain: 0,
      trebleGain: 0,
    }),
}));
