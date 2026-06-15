export type CareType = 'watering' | 'fertilizing' | 'pruning' | 'repotting' | 'sun_protection';

export interface Plant {
  id: string;
  name: string;
  createdAt: string;
  health: number;
}

export interface CareEntry {
  id: string;
  plantId: string;
  plantName: string;
  type: CareType;
  date: string;
  note: string;
  createdAt: string;
}

export interface TreeNode {
  id: string;
  entryId: string;
  depth: number;
  angle: number;
  length: number;
  leafCount: number;
}

export interface TreeData {
  plantId: string;
  trunkHeight: number;
  nodes: TreeNode[];
  totalHealth: number;
}

export interface AppState {
  plants: Plant[];
  entries: CareEntry[];
  selectedPlantId: string | null;
  selectedEntryId: string | null;
  filterDate: string | null;
}

export type EventType =
  | 'entry:added'
  | 'entry:updated'
  | 'entry:deleted'
  | 'plant:selected'
  | 'entry:selected'
  | 'filter:changed'
  | 'data:imported';

export interface EventBus {
  on: (event: EventType, callback: (...args: any[]) => void) => void;
  off: (event: EventType, callback: (...args: any[]) => void) => void;
  emit: (event: EventType, ...args: any[]) => void;
}

export const CARE_TYPE_LABELS: Record<CareType, string> = {
  watering: '浇水',
  fertilizing: '施肥',
  pruning: '修剪',
  repotting: '换盆',
  sun_protection: '防晒'
};

export const CARE_TYPE_COLORS: Record<CareType, string> = {
  watering: '#4fc3f7',
  fertilizing: '#66bb6a',
  pruning: '#ffa726',
  repotting: '#ab47bc',
  sun_protection: '#ffee58'
};

export const CARE_TYPE_HEALTH_CHANGE: Record<CareType, number> = {
  watering: -5,
  fertilizing: 3,
  pruning: 2,
  repotting: 8,
  sun_protection: 1
};
