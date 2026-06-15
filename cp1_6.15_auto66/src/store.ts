import { create } from 'zustand';

export type Vec3 = [number, number, number];

export interface CollectibleItem {
  id: string;
  position: Vec3;
  collected: boolean;
  color: string;
}

export interface WallData {
  id: string;
  position: Vec3;
  size: Vec3;
  materialType: 'rock' | 'metal';
  rotation: Vec3;
}

export interface FloorData {
  id: string;
  position: Vec3;
  size: Vec3;
}

export interface MossData {
  id: string;
  position: Vec3;
  radius: number;
  opacity: number;
  blinkPeriod: number;
}

export interface HiddenZoneData {
  id: string;
  position: Vec3;
  size: Vec3;
  entered: boolean;
}

export interface BranchPath {
  id: string;
  start: Vec3;
  end: Vec3;
  width: number;
}

export interface ScorePopup {
  id: string;
  x: number;
  y: number;
  startTime: number;
}

interface CaveMapData {
  walls: WallData[];
  floors: FloorData[];
  mossPoints: MossData[];
  hiddenZones: HiddenZoneData[];
  branches: BranchPath[];
}

interface GameStore {
  flashlight: {
    enabled: boolean;
    position: Vec3;
    rotation: Vec3;
    brightness: number;
  };
  player: {
    position: Vec3;
    velocity: Vec3;
    isRunning: boolean;
    cameraBobOffset: number;
    flashlightShakeOffset: Vec3;
  };
  collectibles: CollectibleItem[];
  collectedCount: number;
  caveMap: CaveMapData;
  ui: {
    showCompletion: boolean;
    fadeInProgress: number;
    vignetteOpacity: number;
    scorePopups: ScorePopup[];
  };
  setFlashlightRotation: (rot: Vec3) => void;
  setFlashlightPosition: (pos: Vec3) => void;
  setPlayerPosition: (pos: Vec3) => void;
  setPlayerRunning: (running: boolean) => void;
  setCameraBobOffset: (offset: number) => void;
  setFlashlightShakeOffset: (offset: Vec3) => void;
  collectItem: (id: string, screenPos?: { x: number; y: number }) => void;
  setVignetteOpacity: (val: number) => void;
  setFadeInProgress: (val: number) => void;
  setHiddenZoneEntered: (id: string) => void;
  addScorePopup: (x: number, y: number) => void;
  removeScorePopup: (id: string) => void;
  setCaveMap: (data: CaveMapData) => void;
  initCollectibles: (items: CollectibleItem[]) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  flashlight: {
    enabled: true,
    position: [0, 1.6, 0],
    rotation: [0, 0, 0],
    brightness: 1.0,
  },
  player: {
    position: [0, 1.6, 0],
    velocity: [0, 0, 0],
    isRunning: false,
    cameraBobOffset: 0,
    flashlightShakeOffset: [0, 0, 0],
  },
  collectibles: [],
  collectedCount: 0,
  caveMap: {
    walls: [],
    floors: [],
    mossPoints: [],
    hiddenZones: [],
    branches: [],
  },
  ui: {
    showCompletion: false,
    fadeInProgress: 0,
    vignetteOpacity: 0,
    scorePopups: [],
  },
  setFlashlightRotation: (rot) =>
    set((state) => ({
      flashlight: { ...state.flashlight, rotation: rot },
    })),
  setFlashlightPosition: (pos) =>
    set((state) => ({
      flashlight: { ...state.flashlight, position: pos },
    })),
  setPlayerPosition: (pos) =>
    set((state) => ({
      player: { ...state.player, position: pos },
    })),
  setPlayerRunning: (running) =>
    set((state) => ({
      player: { ...state.player, isRunning: running },
    })),
  setCameraBobOffset: (offset) =>
    set((state) => ({
      player: { ...state.player, cameraBobOffset: offset },
    })),
  setFlashlightShakeOffset: (offset) =>
    set((state) => ({
      player: { ...state.player, flashlightShakeOffset: offset },
    })),
  collectItem: (id) => {
    const state = get();
    const item = state.collectibles.find((c) => c.id === id);
    if (!item || item.collected) return;

    const newCollectibles = state.collectibles.map((c) =>
      c.id === id ? { ...c, collected: true } : c
    );
    const newCount = state.collectedCount + 1;
    const totalItems = state.collectibles.length;
    const showCompletion = newCount >= totalItems;

    set({
      collectibles: newCollectibles,
      collectedCount: newCount,
      ui: {
        ...state.ui,
        showCompletion,
      },
    });
  },
  setVignetteOpacity: (val) =>
    set((state) => ({
      ui: { ...state.ui, vignetteOpacity: val },
    })),
  setFadeInProgress: (val) =>
    set((state) => ({
      ui: { ...state.ui, fadeInProgress: val },
    })),
  setHiddenZoneEntered: (id) =>
    set((state) => ({
      caveMap: {
        ...state.caveMap,
        hiddenZones: state.caveMap.hiddenZones.map((z) =>
          z.id === id ? { ...z, entered: true } : z
        ),
      },
    })),
  addScorePopup: (x, y) => {
    const popup: ScorePopup = {
      id: `popup-${Date.now()}-${Math.random()}`,
      x,
      y,
      startTime: Date.now(),
    };
    set((state) => ({
      ui: {
        ...state.ui,
        scorePopups: [...state.ui.scorePopups, popup],
      },
    }));
  },
  removeScorePopup: (id) =>
    set((state) => ({
      ui: {
        ...state.ui,
        scorePopups: state.ui.scorePopups.filter((p) => p.id !== id),
      },
    })),
  setCaveMap: (data) => set({ caveMap: data }),
  initCollectibles: (items) => set({ collectibles: items, collectedCount: 0 }),
}));
