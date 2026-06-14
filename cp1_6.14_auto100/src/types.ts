export type BrickShape = 'box' | 'prism' | 'cylinder' | 'arch';

export type BrickMaterial = 'stone' | 'wood' | 'glass';

export interface Position {
  x: number;
  y: number;
  z: number;
}

export interface Rotation {
  x: number;
  y: number;
  z: number;
}

export interface BrickDimensions {
  width: number;
  height: number;
  depth: number;
}

export interface Brick {
  id: string;
  shape: BrickShape;
  material: BrickMaterial;
  position: Position;
  rotation: Rotation;
  dimensions: BrickDimensions;
  isStable: boolean;
  isSelected: boolean;
  isFalling: boolean;
  fallStartTime?: number;
  fallStartY?: number;
}

export type GameMode = 'day' | 'night';

export interface BrickTemplate {
  shape: BrickShape;
  material: BrickMaterial;
}

export const BRICK_SHAPES: BrickShape[] = ['box', 'prism', 'cylinder', 'arch'];
export const BRICK_MATERIALS: BrickMaterial[] = ['stone', 'wood', 'glass'];

export const BRICK_NAMES: Record<BrickShape, string> = {
  box: '长方体',
  prism: '三棱柱',
  cylinder: '圆柱',
  arch: '拱形',
};

export const MATERIAL_NAMES: Record<BrickMaterial, string> = {
  stone: '石质纹理',
  wood: '木质纹理',
  glass: '琉璃质感',
};

export const MATERIAL_COLORS: Record<BrickMaterial, string> = {
  stone: '#8B7355',
  wood: '#A0522D',
  glass: '#4169E1',
};

export const MATERIAL_EMISSIVE: Record<BrickMaterial, string> = {
  stone: '#FFF8DC',
  wood: '#FF8C00',
  glass: '#87CEFA',
};
