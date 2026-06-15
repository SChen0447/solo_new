export enum VoxelType {
  AIR = 0,
  DIRT = 1,
  STONE = 2,
  WOOD = 3,
  GLASS = 4,
  DIAMOND = 5,
}

export interface BlockType {
  type: VoxelType;
  name: string;
  color: string;
  opacity: number;
  isTransparent: boolean;
}

export const BLOCK_DEFS: Record<VoxelType, BlockType> = {
  [VoxelType.AIR]: {
    type: VoxelType.AIR,
    name: '空气',
    color: '#000000',
    opacity: 0,
    isTransparent: true,
  },
  [VoxelType.DIRT]: {
    type: VoxelType.DIRT,
    name: '泥土',
    color: '#8B6914',
    opacity: 1,
    isTransparent: false,
  },
  [VoxelType.STONE]: {
    type: VoxelType.STONE,
    name: '石头',
    color: '#808080',
    opacity: 1,
    isTransparent: false,
  },
  [VoxelType.WOOD]: {
    type: VoxelType.WOOD,
    name: '木材',
    color: '#C4A35A',
    opacity: 1,
    isTransparent: false,
  },
  [VoxelType.GLASS]: {
    type: VoxelType.GLASS,
    name: '玻璃',
    color: '#ADD8E6',
    opacity: 0.3,
    isTransparent: true,
  },
  [VoxelType.DIAMOND]: {
    type: VoxelType.DIAMOND,
    name: '钻石',
    color: '#00CED1',
    opacity: 1,
    isTransparent: false,
  },
};

export const HOTBAR_BLOCKS: VoxelType[] = [
  VoxelType.DIRT,
  VoxelType.STONE,
  VoxelType.WOOD,
  VoxelType.GLASS,
  VoxelType.DIAMOND,
];

export interface VoxelCoord {
  x: number;
  y: number;
  z: number;
}

export interface RaycastHit {
  coord: VoxelCoord;
  normal: VoxelCoord;
  blockType: VoxelType;
}

export type WorldEventType = 'voxelAdded' | 'voxelRemoved';
export type UIEventType = 'blockSelected' | 'inventoryOpen' | 'inventoryClose';

export interface WorldEvent {
  type: WorldEventType;
  coord: VoxelCoord;
  voxelType: VoxelType;
}

export interface UIEvent {
  type: UIEventType;
  data?: unknown;
}

export type EventListener<T> = (event: T) => void;

export class EventEmitter<T> {
  private listeners: EventListener<T>[] = [];

  on(listener: EventListener<T>): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  emit(event: T): void {
    this.listeners.forEach(l => l(event));
  }
}

export const WORLD_SIZE_X = 32;
export const WORLD_SIZE_Y = 8;
export const WORLD_SIZE_Z = 32;

export const PLAYER_SPEED = 4;
export const JUMP_HEIGHT = 1.5;
export const GRAVITY = -10;
export const PLAYER_WIDTH = 0.6;
export const PLAYER_HEIGHT = 1.8;
export const PLAYER_CROUCH_HEIGHT = 1.2;

export const MOUSE_SENSITIVITY_X = 1.0;
export const MOUSE_SENSITIVITY_Y = 0.8;
export const MOUSE_Y_MIN = -80 * (Math.PI / 180);
export const MOUSE_Y_MAX = 80 * (Math.PI / 180);

export const BLOCK_ANIM_DURATION = 0.2;
export const INITIAL_BLOCK_COUNT = 64;
