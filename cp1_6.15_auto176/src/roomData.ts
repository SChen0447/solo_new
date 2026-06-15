export type RoomType = 'livingRoom' | 'bedroom' | 'kitchen';

export type FloorMaterialType = 'wood' | 'tile' | 'carpet';

export interface FurnitureSize {
  width: number;
  depth: number;
  height: number;
}

export interface FurniturePosition {
  x: number;
  z: number;
}

export interface FurnitureData {
  id: string;
  name: string;
  type: string;
  size: FurnitureSize;
  position: FurniturePosition;
  color: string;
}

export interface RoomParams {
  wallColor: string;
  floorMaterial: FloorMaterialType;
  lightAngle: number;
  lightIntensity: number;
}

export interface RoomTemplate {
  type: RoomType;
  name: string;
  roomSize: { width: number; height: number; depth: number };
  defaultParams: RoomParams;
  furniture: FurnitureData[];
}

export const FLOOR_MATERIALS: Record<FloorMaterialType, { name: string; color: string }> = {
  wood: { name: '木纹', color: '#8B4513' },
  tile: { name: '瓷砖', color: '#D3D3D3' },
  carpet: { name: '地毯', color: '#696969' },
};

export const livingRoomTemplate: RoomTemplate = {
  type: 'livingRoom',
  name: '客厅',
  roomSize: { width: 12, height: 3.5, depth: 10 },
  defaultParams: {
    wallColor: '#f5f5f5',
    floorMaterial: 'wood',
    lightAngle: 45,
    lightIntensity: 1.2,
  },
  furniture: [
    {
      id: 'sofa-1',
      name: '沙发',
      type: 'sofa',
      size: { width: 3, depth: 1, height: 0.8 },
      position: { x: -3, z: 2 },
      color: '#4a90d9',
    },
    {
      id: 'coffeeTable-1',
      name: '茶几',
      type: 'coffeeTable',
      size: { width: 1.5, depth: 0.8, height: 0.4 },
      position: { x: -3, z: 0 },
      color: '#8B4513',
    },
    {
      id: 'diningTable-1',
      name: '餐桌',
      type: 'diningTable',
      size: { width: 2, depth: 1.2, height: 0.75 },
      position: { x: 3, z: 2 },
      color: '#A0522D',
    },
    {
      id: 'chair-1',
      name: '椅子',
      type: 'chair',
      size: { width: 0.5, depth: 0.5, height: 0.9 },
      position: { x: 2.5, z: 1 },
      color: '#4a4a4a',
    },
    {
      id: 'lamp-1',
      name: '台灯',
      type: 'lamp',
      size: { width: 0.3, depth: 0.3, height: 0.6 },
      position: { x: -4.5, z: 3 },
      color: '#ffd700',
    },
  ],
};

export const bedroomTemplate: RoomTemplate = {
  type: 'bedroom',
  name: '卧室',
  roomSize: { width: 10, height: 3, depth: 8 },
  defaultParams: {
    wallColor: '#e8d5c4',
    floorMaterial: 'wood',
    lightAngle: 45,
    lightIntensity: 1.2,
  },
  furniture: [
    {
      id: 'bed-1',
      name: '床',
      type: 'bed',
      size: { width: 2.2, depth: 2, height: 0.5 },
      position: { x: -2, z: 1 },
      color: '#fff0f5',
    },
    {
      id: 'nightstand-1',
      name: '床头柜',
      type: 'nightstand',
      size: { width: 0.5, depth: 0.4, height: 0.5 },
      position: { x: -3.5, z: 2.5 },
      color: '#8B4513',
    },
    {
      id: 'wardrobe-1',
      name: '衣柜',
      type: 'wardrobe',
      size: { width: 2, depth: 0.6, height: 2.4 },
      position: { x: 3, z: -2 },
      color: '#DEB887',
    },
    {
      id: 'dresser-1',
      name: '梳妆台',
      type: 'dresser',
      size: { width: 1.2, depth: 0.5, height: 1.5 },
      position: { x: 3, z: 2 },
      color: '#F5DEB3',
    },
    {
      id: 'lamp-2',
      name: '台灯',
      type: 'lamp',
      size: { width: 0.25, depth: 0.25, height: 0.5 },
      position: { x: -3.5, z: 2.5 },
      color: '#ffd700',
    },
  ],
};

export const kitchenTemplate: RoomTemplate = {
  type: 'kitchen',
  name: '厨房',
  roomSize: { width: 8, height: 3, depth: 6 },
  defaultParams: {
    wallColor: '#f0f8ff',
    floorMaterial: 'tile',
    lightAngle: 45,
    lightIntensity: 1.5,
  },
  furniture: [
    {
      id: 'cabinet-1',
      name: '橱柜',
      type: 'cabinet',
      size: { width: 6, depth: 0.6, height: 0.9 },
      position: { x: 0, z: -2 },
      color: '#696969',
    },
    {
      id: 'island-1',
      name: '中岛',
      type: 'island',
      size: { width: 2, depth: 1, height: 0.9 },
      position: { x: 0, z: 1 },
      color: '#D2691E',
    },
    {
      id: 'fridge-1',
      name: '冰箱',
      type: 'fridge',
      size: { width: 0.8, depth: 0.7, height: 2 },
      position: { x: -3, z: -2 },
      color: '#C0C0C0',
    },
    {
      id: 'stove-1',
      name: '灶台',
      type: 'stove',
      size: { width: 0.8, depth: 0.6, height: 0.1 },
      position: { x: 1, z: -2 },
      color: '#2F4F4F',
    },
    {
      id: 'sink-1',
      name: '水槽',
      type: 'sink',
      size: { width: 0.6, depth: 0.5, height: 0.2 },
      position: { x: -1, z: -2 },
      color: '#A9A9A9',
    },
  ],
};

export const roomTemplates: Record<RoomType, RoomTemplate> = {
  livingRoom: livingRoomTemplate,
  bedroom: bedroomTemplate,
  kitchen: kitchenTemplate,
};

export interface SnapshotData {
  id: string;
  name: string;
  roomType: RoomType;
  params: RoomParams;
  furniture: FurnitureData[];
  thumbnail?: string;
}
