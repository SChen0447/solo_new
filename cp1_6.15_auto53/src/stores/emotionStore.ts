import { create } from 'zustand';
import {
  EmotionParams,
  EmotionPreset,
  emotionPresets,
  matchEmotion,
  generateRandomParams,
  lerpParams,
} from '../utils/emotionParams';

interface EmotionState {
  currentEmotion: string;
  currentDescription: string;
  inputKeyword: string;
  targetParams: EmotionParams;
  currentParams: EmotionParams;
  isTransitioning: boolean;
  opacity: number;
  selectedPresetName: string | null;

  setInputKeyword: (keyword: string) => void;
  applyEmotion: (keyword: string) => void;
  applyPreset: (preset: EmotionPreset) => void;
  applyRandom: () => void;
  updateParam: (key: keyof EmotionParams, value: number) => void;
  stepTransition: (deltaMs: number) => void;
  startFade: () => void;
  endFade: () => void;
}

const defaultParams: EmotionParams = {
  cohesion: 50,
  rotationSpeed: 100,
  colorTemp: 50,
  rhythm: 50,
};

export const useEmotionStore = create<EmotionState>((set, get) => ({
  currentEmotion: '喜悦',
  currentDescription: '轻盈、明亮、上扬',
  inputKeyword: '',
  targetParams: emotionPresets[0].params,
  currentParams: { ...emotionPresets[0].params },
  isTransitioning: false,
  opacity: 1,
  selectedPresetName: '喜悦',

  setInputKeyword: (keyword: string) => {
    set({ inputKeyword: keyword });
  },

  applyEmotion: (keyword: string) => {
    const preset = matchEmotion(keyword);
    if (preset) {
      get().applyPreset(preset);
    }
  },

  applyPreset: (preset: EmotionPreset) => {
    const state = get();
    state.startFade();
    set({
      currentEmotion: preset.name,
      currentDescription: preset.description,
      targetParams: { ...preset.params },
      isTransitioning: true,
      selectedPresetName: preset.name,
    });
    setTimeout(() => get().endFade(), 300);
  },

  applyRandom: () => {
    const random = generateRandomParams();
    const state = get();
    state.startFade();
    set({
      currentEmotion: '自定义',
      currentDescription: '随机生成的情绪参数组合',
      targetParams: random,
      isTransitioning: true,
      selectedPresetName: null,
    });
    setTimeout(() => get().endFade(), 300);
  },

  updateParam: (key: keyof EmotionParams, value: number) => {
    set({
      targetParams: { ...get().targetParams, [key]: value },
      currentParams: { ...get().currentParams, [key]: value },
      isTransitioning: false,
      selectedPresetName: null,
    });
  },

  stepTransition: (deltaMs: number) => {
    const state = get();
    if (!state.isTransitioning) return;
    const transitionMs = 1200;
    const step = deltaMs / transitionMs;
    const newCurrent = lerpParams(state.targetParams, state.currentParams, step * 60);
    const diff =
      Math.abs(newCurrent.cohesion - state.targetParams.cohesion) +
      Math.abs(newCurrent.rotationSpeed - state.targetParams.rotationSpeed) +
      Math.abs(newCurrent.colorTemp - state.targetParams.colorTemp) +
      Math.abs(newCurrent.rhythm - state.targetParams.rhythm);
    if (diff < 0.5) {
      set({ currentParams: { ...state.targetParams }, isTransitioning: false });
    } else {
      set({ currentParams: newCurrent });
    }
  },

  startFade: () => {
    set({ opacity: 0.2 });
  },

  endFade: () => {
    set({ opacity: 1 });
  },
}));
