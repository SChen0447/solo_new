import * as THREE from 'three';

export type LightType = 'point' | 'spot' | 'directional' | 'ambient';

export type MaterialPreset = 
  | 'white_latex'
  | 'light_gray'
  | 'light_blue'
  | 'beige'
  | 'wood_grain'
  | 'marble'
  | 'red_brick'
  | 'carpet'
  | 'dark_oak'
  | 'mirror';

export interface RoomSize {
  width: number;
  depth: number;
  height: number;
}

export interface LightParams {
  id: string;
  type: LightType;
  position: THREE.Vector3;
  color: number;
  intensity: number;
  distance: number;
  angle: number;
  penumbra: number;
  decay: number;
  castShadow: boolean;
  shadowMapSize: number;
  targetPosition?: THREE.Vector3;
}

export interface LightState extends LightParams {
  lightObject?: THREE.Light;
  helperObject?: THREE.Object3D;
  targetIntensity: number;
  targetPosition: THREE.Vector3;
}

export interface HeatmapData {
  gridSize: number;
  values: number[][];
  minValue: number;
  maxValue: number;
  roomWidth: number;
  roomDepth: number;
}

export interface MaterialConfig {
  name: string;
  color: number;
  roughness: number;
  metalness: number;
  mapUrl?: string;
}

export interface FurnitureItem {
  id: string;
  name: string;
  mesh: THREE.Object3D;
  position: THREE.Vector2;
}

export interface SceneState {
  roomSize: RoomSize;
  materials: {
    walls: MaterialPreset;
    floor: MaterialPreset;
    ceiling: MaterialPreset;
  };
  lights: LightState[];
  furniture: FurnitureItem[];
}

export interface GroupLightChange {
  lightIds: string[];
  params: Partial<LightParams>;
}

export interface PerformanceStats {
  fps: number;
  lightCount: number;
  shadowMapTotalSize: number;
  meshUpdateTime: number;
}

export const MATERIAL_PRESETS: Record<MaterialPreset, MaterialConfig> = {
  white_latex: { name: '白色乳胶漆', color: 0xf5f5f5, roughness: 0.8, metalness: 0.0 },
  light_gray: { name: '浅灰', color: 0xd0d0d0, roughness: 0.7, metalness: 0.1 },
  light_blue: { name: '淡蓝', color: 0xcfe8f5, roughness: 0.6, metalness: 0.0 },
  beige: { name: '米黄', color: 0xf5e6d3, roughness: 0.7, metalness: 0.0 },
  wood_grain: { name: '木纹', color: 0x8b7355, roughness: 0.5, metalness: 0.0 },
  marble: { name: '大理石', color: 0xe8e8e8, roughness: 0.2, metalness: 0.1 },
  red_brick: { name: '红砖', color: 0x8b4513, roughness: 0.9, metalness: 0.0 },
  carpet: { name: '地毯', color: 0x4a3728, roughness: 0.95, metalness: 0.0 },
  dark_oak: { name: '深色橡木', color: 0x3d2b1f, roughness: 0.4, metalness: 0.0 },
  mirror: { name: '镜面', color: 0xc0c0c0, roughness: 0.05, metalness: 1.0 },
};

export const SHADOW_MAP_SIZES = [256, 512, 1024, 2048] as const;

export const LIGHT_LIMITS = {
  point: 8,
  spot: 4,
  directional: 1,
  ambient: 1,
  total: 12,
} as const;
