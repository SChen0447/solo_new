export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface FurnitureItem {
  id: string;
  type: FurnitureType;
  name: string;
  position: Vector3;
  rotation: number;
  scale: Vector3;
  material: MaterialType;
  color: string;
  roughness: number;
  metalness: number;
}

export type FurnitureType = 
  | 'sofa' 
  | 'dining-table' 
  | 'bed' 
  | 'lamp' 
  | 'chair' 
  | 'cabinet' 
  | 'table' 
  | 'plant';

export type MaterialType = 
  | 'wood' 
  | 'metal' 
  | 'fabric' 
  | 'marble' 
  | 'glass' 
  | 'leather';

export interface MaterialConfig {
  type: MaterialType;
  name: string;
  color: string;
  roughness: number;
  metalness: number;
  transparent?: boolean;
  opacity?: number;
}

export interface FurnitureCatalogItem {
  type: FurnitureType;
  name: string;
  icon: string;
  defaultSize: Vector3;
  defaultMaterial: MaterialType;
  defaultColor: string;
}

export interface LightConfig {
  ambientIntensity: number;
  directionalLight1: {
    horizontalAngle: number;
    verticalAngle: number;
    intensity: number;
    color: string;
  };
  directionalLight2: {
    horizontalAngle: number;
    verticalAngle: number;
    intensity: number;
    color: string;
  };
}

export type LightPreset = 'day' | 'dusk' | 'night';

export type CameraView = 'top' | 'front' | 'side' | 'walkthrough';

export interface SceneState {
  furniture: FurnitureItem[];
  selectedFurnitureId: string | null;
  lightConfig: LightConfig;
  currentLightPreset: LightPreset;
  currentCameraView: CameraView;
}

export interface SelectionHighlightConfig {
  color: number;
  lineWidth: number;
  pulseSpeed: number;
  pulseMinOpacity: number;
  pulseMaxOpacity: number;
}
