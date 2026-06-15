import { create } from 'zustand';
import {
  analyzeText,
  mapToParticleParams
} from '../utils/semanticAnalyzer';
import { applyPreset } from '../utils/presets';
import {
  EXAMPLE_TEXTS,
  type ParticleParams,
  type AnalysisResult,
  type ExampleText
} from '../utils/constants';

interface AppState {
  inputText: string;
  isAnalyzing: boolean;
  analysisResult: AnalysisResult | null;
  particleParams: ParticleParams;
  emotionIntensity: number;
  particleSize: number;
  backgroundBrightness: number;
  isAutoPlaying: boolean;
  currentExampleIndex: number;
  examples: ExampleText[];
  isMobileMenuOpen: boolean;

  setInputText: (text: string) => void;
  analyzeInput: () => void;
  setEmotionIntensity: (value: number) => void;
  setParticleSize: (value: number) => void;
  setBackgroundBrightness: (value: number) => void;
  applyPresetStyle: (index: number) => void;
  toggleAutoPlay: () => void;
  setCurrentExampleIndex: (index: number) => void;
  nextExample: () => void;
  toggleMobileMenu: () => void;
}

const defaultParticleParams: ParticleParams = {
  hueShift: 0,
  motionIntensity: 0.5,
  aggregation: 1.0
};

export const useAppStore = create<AppState>((set, get) => ({
  inputText: '',
  isAnalyzing: false,
  analysisResult: null,
  particleParams: defaultParticleParams,
  emotionIntensity: 50,
  particleSize: 4,
  backgroundBrightness: 0.5,
  isAutoPlaying: false,
  currentExampleIndex: 0,
  examples: EXAMPLE_TEXTS,
  isMobileMenuOpen: false,

  setInputText: (text: string) => {
    const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    if (wordCount <= 200) {
      set({ inputText: text });
    }
  },

  analyzeInput: () => {
    const { inputText, emotionIntensity } = get();
    if (!inputText.trim()) return;

    set({ isAnalyzing: true });

    setTimeout(() => {
      const result = analyzeText(inputText, emotionIntensity);
      const params = mapToParticleParams(result, emotionIntensity);
      set({
        analysisResult: result,
        particleParams: params,
        isAnalyzing: false
      });
    }, 100);
  },

  setEmotionIntensity: (value: number) => {
    const clampedValue = Math.max(0, Math.min(100, value));
    set({ emotionIntensity: clampedValue });

    const { analysisResult } = get();
    if (analysisResult) {
      const params = mapToParticleParams(analysisResult, clampedValue);
      set({ particleParams: params });
    }
  },

  setParticleSize: (value: number) => {
    set({ particleSize: Math.max(2, Math.min(8, value)) });
  },

  setBackgroundBrightness: (value: number) => {
    set({ backgroundBrightness: Math.max(0, Math.min(1, value)) });
  },

  applyPresetStyle: (index: number) => {
    const preset = applyPreset(index);
    if (preset) {
      set({
        particleParams: preset.params,
        emotionIntensity: preset.emotionIntensity,
        particleSize: preset.particleSize,
        backgroundBrightness: preset.backgroundBrightness
      });
    }
  },

  toggleAutoPlay: () => {
    const { isAutoPlaying } = get();
    set({ isAutoPlaying: !isAutoPlaying });
  },

  setCurrentExampleIndex: (index: number) => {
    const { examples } = get();
    const clampedIndex = ((index % examples.length) + examples.length) % examples.length;
    const example = examples[clampedIndex];

    set({
      currentExampleIndex: clampedIndex,
      inputText: example.text
    });

    setTimeout(() => {
      get().analyzeInput();
    }, 200);
  },

  nextExample: () => {
    const { currentExampleIndex, examples } = get();
    const nextIndex = (currentExampleIndex + 1) % examples.length;
    get().setCurrentExampleIndex(nextIndex);
  },

  toggleMobileMenu: () => {
    set(state => ({ isMobileMenuOpen: !state.isMobileMenuOpen }));
  }
}));
