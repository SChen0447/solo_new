import { create } from 'zustand';
import * as THREE from 'three';

export type ViewMode = 'top' | 'front' | 'side' | 'free';
export type LightMode = 'ambient' | 'points' | 'hemisphere';

export interface PointData {
  id: number;
  position: THREE.Vector3;
  originalPosition: THREE.Vector3;
}

export interface SectionResult {
  polygon: THREE.Vector2[];
  area: number;
  perimeter: number;
  fillMesh: THREE.Mesh | null;
  outlineLine: THREE.Line | null;
}

export interface AppState {
  points: THREE.Vector3[];
  buildingMesh: THREE.Mesh | null;
  wireframeMesh: THREE.LineSegments | null;
  controlPoints: PointData[];
  selectedControlPointId: number | null;
  hoverWireframe: boolean;
  heightScale: number;
  smoothIterations: number;
  cutHeight: number;
  viewMode: ViewMode;
  lightMode: LightMode;
  sectionResult: SectionResult | null;
  buildingBounds: { min: THREE.Vector3; max: THREE.Vector3 } | null;
  setPoints: (p: THREE.Vector3[]) => void;
  setBuildingMesh: (m: THREE.Mesh | null) => void;
  setWireframeMesh: (w: THREE.LineSegments | null) => void;
  setControlPoints: (cp: PointData[]) => void;
  setSelectedControlPointId: (id: number | null) => void;
  setHoverWireframe: (h: boolean) => void;
  setHeightScale: (s: number) => void;
  setSmoothIterations: (i: number) => void;
  setCutHeight: (h: number) => void;
  setViewMode: (v: ViewMode) => void;
  setLightMode: (l: LightMode) => void;
  setSectionResult: (r: SectionResult | null) => void;
  setBuildingBounds: (b: { min: THREE.Vector3; max: THREE.Vector3 } | null) => void;
  updateControlPointPosition: (id: number, pos: THREE.Vector3) => void;
  triggerRebuild: () => void;
  rebuildVersion: number;
}

export const useAppStore = create<AppState>((set, get) => ({
  points: [],
  buildingMesh: null,
  wireframeMesh: null,
  controlPoints: [],
  selectedControlPointId: null,
  hoverWireframe: false,
  heightScale: 1.0,
  smoothIterations: 2,
  cutHeight: 0.5,
  viewMode: 'free',
  lightMode: 'ambient',
  sectionResult: null,
  buildingBounds: null,
  rebuildVersion: 0,
  setPoints: (p) => set({ points: p }),
  setBuildingMesh: (m) => set({ buildingMesh: m }),
  setWireframeMesh: (w) => set({ wireframeMesh: w }),
  setControlPoints: (cp) => set({ controlPoints: cp }),
  setSelectedControlPointId: (id) => set({ selectedControlPointId: id }),
  setHoverWireframe: (h) => set({ hoverWireframe: h }),
  setHeightScale: (s) => {
    set({ heightScale: s });
    get().triggerRebuild();
  },
  setSmoothIterations: (i) => {
    set({ smoothIterations: i });
    get().triggerRebuild();
  },
  setCutHeight: (h) => set({ cutHeight: h }),
  setViewMode: (v) => set({ viewMode: v }),
  setLightMode: (l) => set({ lightMode: l }),
  setSectionResult: (r) => set({ sectionResult: r }),
  setBuildingBounds: (b) => set({ buildingBounds: b }),
  updateControlPointPosition: (id, pos) =>
    set((state) => ({
      controlPoints: state.controlPoints.map((cp) =>
        cp.id === id ? { ...cp, position: pos.clone() } : cp
      ),
    })),
  triggerRebuild: () => set((s) => ({ rebuildVersion: s.rebuildVersion + 1 })),
}));
