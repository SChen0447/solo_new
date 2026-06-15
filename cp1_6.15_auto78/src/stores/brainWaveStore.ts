import { create } from 'zustand';
import { getBrainWaveType, frequencyToColor, frequencyToOpacity } from '../utils/particleUtils';

export type BrainWaveType = 'Delta' | 'Theta' | 'Alpha' | 'Beta';

interface BrainWaveState {
  frequency: number;
  brainWaveType: BrainWaveType;
  particleColor: { r: number; g: number; b: number };
  opacity: number;
  zoom: number;
  rotationY: number;
  rotationX: number;
  setFrequency: (freq: number) => void;
  setZoom: (zoom: number) => void;
  setRotation: (rotY: number, rotX: number) => void;
}

export const useBrainWaveStore = create<BrainWaveState>((set) => ({
  frequency: 10,
  brainWaveType: 'Alpha',
  particleColor: { r: 74, g: 144, b: 217 },
  opacity: 0.45,
  zoom: 1,
  rotationY: 0,
  rotationX: 0,
  setFrequency: (freq) => {
    const clampedFreq = Math.max(0.5, Math.min(30, freq));
    const type = getBrainWaveType(clampedFreq);
    const color = frequencyToColor(clampedFreq);
    const opacity = frequencyToOpacity(clampedFreq);
    set({
      frequency: clampedFreq,
      brainWaveType: type,
      particleColor: color,
      opacity
    });
  },
  setZoom: (zoom) => {
    const clampedZoom = Math.max(0.5, Math.min(3, zoom));
    set({ zoom: clampedZoom });
  },
  setRotation: (rotY, rotX) => {
    const clampedRotX = Math.max(-25, Math.min(25, rotX));
    set({ rotationY: rotY, rotationX: clampedRotX });
  }
}));
