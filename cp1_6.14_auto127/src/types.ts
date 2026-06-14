export interface Room {
  id: string;
  name: string;
  size: { x: number; y: number; z: number };
  wallColor: string;
}

export type FurnitureType = 'sofa' | 'table' | 'chair' | 'bed' | 'cabinet';
export type MaterialType = 'wood' | 'fabric' | 'leather';

export interface Furniture {
  id: string;
  type: FurnitureType;
  color: string;
  material: MaterialType;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
}

export type LightType = 'ambient' | 'spot' | 'point';

export interface LightSource {
  id: string;
  type: LightType;
  colorTemp: number;
  intensity: number;
  position: { x: number; y: number; z: number };
  angle?: number;
  beamAngle?: number;
  targetPosition?: { x: number; y: number; z: number };
}

export interface LightingScheme {
  id: string;
  name: string;
  lights: LightSource[];
}

export interface SceneState {
  rooms: Room[];
  currentRoomId: string | null;
  furniture: Furniture[];
  lights: LightSource[];
  schemes: LightingScheme[];
  selectedFurnitureId: string | null;
  selectedLightId: string | null;
  activeSchemeId: string | null;
  isDragging: boolean;
  isRotating: boolean;
  fps: number;
}

export interface SceneActions {
  addRoom: (room: Omit<Room, 'id'>) => void;
  setCurrentRoom: (id: string) => void;
  addFurniture: (furniture: Omit<Furniture, 'id'>) => void;
  updateFurniturePosition: (id: string, position: Furniture['position']) => void;
  updateFurnitureRotation: (id: string, rotation: Furniture['rotation']) => void;
  deleteFurniture: (id: string) => void;
  addLight: (light: Omit<LightSource, 'id'>) => void;
  updateLightParams: (id: string, params: Partial<LightSource>) => void;
  deleteLight: (id: string) => void;
  saveScheme: (name: string) => void;
  loadScheme: (schemeId: string) => void;
  deleteScheme: (schemeId: string) => void;
  setActiveScheme: (schemeId: string | null) => void;
  selectFurniture: (id: string | null) => void;
  selectLight: (id: string | null) => void;
  setIsDragging: (value: boolean) => void;
  setIsRotating: (value: boolean) => void;
  setFps: (fps: number) => void;
  resetScene: () => void;
}

export type SceneStore = SceneState & SceneActions;

export const FURNITURE_PRESETS: Record<FurnitureType, { colors: string[]; materials: MaterialType[] }> = {
  sofa: {
    colors: ['#8B4513', '#4A4A4A', '#C4A484'],
    materials: ['fabric', 'leather'],
  },
  table: {
    colors: ['#8B4513', '#D2691E', '#2F2F2F'],
    materials: ['wood', 'wood'],
  },
  chair: {
    colors: ['#8B4513', '#4A4A4A', '#D2691E'],
    materials: ['wood', 'fabric'],
  },
  bed: {
    colors: ['#F5F5DC', '#4A4A4A', '#8B4513'],
    materials: ['fabric', 'wood'],
  },
  cabinet: {
    colors: ['#8B4513', '#2F2F2F', '#D2B48C'],
    materials: ['wood', 'wood'],
  },
};

export const FURNITURE_SIZE: Record<FurnitureType, { x: number; y: number; z: number }> = {
  sofa: { x: 2, y: 0.8, z: 0.9 },
  table: { x: 1.2, y: 0.75, z: 0.8 },
  chair: { x: 0.5, y: 0.9, z: 0.5 },
  bed: { x: 2, y: 0.5, z: 1.8 },
  cabinet: { x: 1.2, y: 2, z: 0.4 },
};

export const FURNITURE_NAMES: Record<FurnitureType, string> = {
  sofa: '沙发',
  table: '桌子',
  chair: '椅子',
  bed: '床',
  cabinet: '柜子',
};

export const MATERIAL_NAMES: Record<MaterialType, string> = {
  wood: '木纹',
  fabric: '布艺',
  leather: '皮革',
};

export const LIGHT_NAMES: Record<LightType, string> = {
  ambient: '环境光',
  spot: '聚光灯',
  point: '点光源',
};
