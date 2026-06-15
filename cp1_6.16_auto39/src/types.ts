export enum FurnitureType {
  SOFA = 'sofa',
  TABLE = 'table',
  DESK = 'desk',
  BED = 'bed',
  CABINET = 'cabinet',
}

export const FurnitureTypeLabels: Record<FurnitureType, string> = {
  [FurnitureType.SOFA]: '沙发',
  [FurnitureType.TABLE]: '餐桌',
  [FurnitureType.DESK]: '书桌',
  [FurnitureType.BED]: '床',
  [FurnitureType.CABINET]: '柜子',
};

export const FurnitureTypeColors: Record<FurnitureType, string> = {
  [FurnitureType.SOFA]: '#FF8C00',
  [FurnitureType.TABLE]: '#8B4513',
  [FurnitureType.DESK]: '#4682B4',
  [FurnitureType.BED]: '#9370DB',
  [FurnitureType.CABINET]: '#696969',
};

export const FurnitureDimensions: Record<FurnitureType, { width: number; height: number; depth: number }> = {
  [FurnitureType.SOFA]: { width: 2.2, height: 0.85, depth: 0.9 },
  [FurnitureType.TABLE]: { width: 1.4, height: 0.75, depth: 0.8 },
  [FurnitureType.DESK]: { width: 1.4, height: 0.75, depth: 0.6 },
  [FurnitureType.BED]: { width: 1.8, height: 0.5, depth: 2.0 },
  [FurnitureType.CABINET]: { width: 1.0, height: 2.0, depth: 0.45 },
};

export interface RecognitionResult {
  type: FurnitureType;
  confidence: number;
  imageUrl: string;
  id: string;
}

export interface FurnitureItem {
  id: string;
  type: FurnitureType;
  position: { x: number; y: number; z: number };
  rotation: number;
  confidence: number;
}

export interface RoomConfig {
  width: number;
  depth: number;
  height: number;
  floorColor: string;
  wallColor: string;
}

export type EventCallback = (...args: any[]) => void;
