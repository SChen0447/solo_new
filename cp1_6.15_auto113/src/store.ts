import { create } from "zustand";

export type FishSpecies = "clownfish" | "angelfish" | "lanternfish";

export interface FishData {
  id: string;
  species: FishSpecies;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  size: number;
  speed: number;
  direction: { x: number; z: number };
  phase: number;
  isSelected: boolean;
  noiseOffset: number;
}

export interface Ripple {
  id: string;
  position: { x: number; z: number };
  startTime: number;
  duration: number;
  maxRadius: number;
}

export interface Bubble {
  id: string;
  position: { x: number; y: number; z: number };
  radius: number;
  speed: number;
}

export interface SurfaceRipple {
  id: string;
  position: { x: number; z: number };
  startTime: number;
  duration: number;
  maxRadius: number;
}

interface AquariumState {
  fishes: FishData[];
  ripples: Ripple[];
  bubbles: Bubble[];
  surfaceRipples: SurfaceRipple[];
  selectedSpecies: FishSpecies;
  selectedFishId: string | null;
  temperature: number;
  waterQuality: number;
  lightIntensity: number;
  setSelectedSpecies: (species: FishSpecies) => void;
  setSelectedFishId: (id: string | null) => void;
  setTemperature: (value: number) => void;
  setWaterQuality: (value: number) => void;
  setLightIntensity: (value: number) => void;
  addFish: (fish: FishData) => void;
  addRipple: (ripple: Ripple) => void;
  removeRipple: (id: string) => void;
  addBubble: (bubble: Bubble) => void;
  removeBubble: (id: string) => void;
  addSurfaceRipple: (ripple: SurfaceRipple) => void;
  removeSurfaceRipple: (id: string) => void;
  updateFishes: (fishes: FishData[]) => void;
  updateBubbles: (bubbles: Bubble[]) => void;
}

export const useAquariumStore = create<AquariumState>((set) => ({
  fishes: [],
  ripples: [],
  bubbles: [],
  surfaceRipples: [],
  selectedSpecies: "clownfish",
  selectedFishId: null,
  temperature: 22,
  waterQuality: 80,
  lightIntensity: 5,
  setSelectedSpecies: (species) => set({ selectedSpecies: species }),
  setSelectedFishId: (id) => set({ selectedFishId: id }),
  setTemperature: (value) => set({ temperature: value }),
  setWaterQuality: (value) => set({ waterQuality: value }),
  setLightIntensity: (value) => set({ lightIntensity: value }),
  addFish: (fish) => set((state) => ({ fishes: [...state.fishes, fish] })),
  addRipple: (ripple) =>
    set((state) => ({ ripples: [...state.ripples, ripple] })),
  removeRipple: (id) =>
    set((state) => ({ ripples: state.ripples.filter((r) => r.id !== id) })),
  addBubble: (bubble) =>
    set((state) => ({ bubbles: [...state.bubbles, bubble] })),
  removeBubble: (id) =>
    set((state) => ({ bubbles: state.bubbles.filter((b) => b.id !== id) })),
  addSurfaceRipple: (ripple) =>
    set((state) => ({
      surfaceRipples: [...state.surfaceRipples, ripple],
    })),
  removeSurfaceRipple: (id) =>
    set((state) => ({
      surfaceRipples: state.surfaceRipples.filter((r) => r.id !== id),
    })),
  updateFishes: (fishes) => set({ fishes }),
  updateBubbles: (bubbles) => set({ bubbles }),
}));
