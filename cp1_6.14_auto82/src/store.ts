import { create } from 'zustand';

export interface GalaxyParams {
  count: number;
  size: number;
  rotationSpeed: number;
  radius: number;
  centerHue: number;
  edgeHue: number;
}

export interface CameraState {
  x: number;
  y: number;
  z: number;
  rotX: number;
  rotY: number;
}

interface GalaxyStore {
  camera: CameraState;
  params: GalaxyParams;
  panelOpen: boolean;
  paused: boolean;
  moveSpeed: number;
  setCamera: (cam: Partial<CameraState>) => void;
  setParams: (p: Partial<GalaxyParams>) => void;
  setPanelOpen: (open: boolean) => void;
  togglePanel: () => void;
  togglePaused: () => void;
  setMoveSpeed: (s: number) => void;
  resetCamera: () => void;
  setPresetView: (view: 'top' | 'side' | 'front') => void;
}

const INITIAL_CAMERA: CameraState = {
  x: 0,
  y: 50,
  z: 200,
  rotX: -0.1,
  rotY: 0,
};

const INITIAL_PARAMS: GalaxyParams = {
  count: 30000,
  size: 0.08,
  rotationSpeed: 0.005,
  radius: 150,
  centerHue: 45,
  edgeHue: 220,
};

export const useStore = create<GalaxyStore>((set) => ({
  camera: { ...INITIAL_CAMERA },
  params: { ...INITIAL_PARAMS },
  panelOpen: true,
  paused: false,
  moveSpeed: 1.0,

  setCamera: (cam) =>
    set((s) => ({ camera: { ...s.camera, ...cam } })),

  setParams: (p) =>
    set((s) => ({ params: { ...s.params, ...p } })),

  setPanelOpen: (open) => set({ panelOpen: open }),
  togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen })),
  togglePaused: () => set((s) => ({ paused: !s.paused })),
  setMoveSpeed: (s) => set({ moveSpeed: s }),

  resetCamera: () => set({ camera: { ...INITIAL_CAMERA } }),

  setPresetView: (view) => {
    const views: Record<string, CameraState> = {
      top: { x: 0, y: 250, z: 0, rotX: -Math.PI / 2, rotY: 0 },
      side: { x: 250, y: 20, z: 0, rotX: 0, rotY: -Math.PI / 2 },
      front: { x: 0, y: 20, z: 250, rotX: 0, rotY: 0 },
    };
    set({ camera: { ...views[view] } });
  },
}));
