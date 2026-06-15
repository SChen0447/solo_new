export type CloudRarity = 'common' | 'rare';

export interface CloudData {
  id: string;
  position: { x: number; y: number; z: number };
  size: number;
  speed: number;
  rarity: CloudRarity;
  color: string;
  name: string;
}

export interface PetData {
  id: string;
  name: string;
  cloudId: string;
  rarity: CloudRarity;
  attack: number;
  speed: number;
  cuteness: number;
  stage: number;
  color: string;
  pixelArt: string[];
}

export interface EggData {
  id: string;
  cloudId: string;
  rarity: CloudRarity;
  color: string;
  progress: number;
  maxProgress: number;
  hatched: boolean;
  petId: string | null;
}

export interface ShardData {
  id: string;
  cloudId: string;
  count: number;
  rarity: CloudRarity;
}

export type CloudEvent =
  | { type: 'CLOUD_CAPTURED'; cloud: CloudData; shards: number }
  | { type: 'CLOUD_SPAWNED'; cloud: CloudData }
  | { type: 'CLOUD_REMOVED'; cloudId: string };

export type PetEvent =
  | { type: 'EGG_CREATED'; egg: EggData }
  | { type: 'EGG_FED'; eggId: string; progress: number }
  | { type: 'PET_HATCHED'; eggId: string; pet: PetData }
  | { type: 'PET_EVOLVED'; petId: string; pet: PetData }
  | { type: 'PET_CLICKED'; petId: string }
  | { type: 'PET_JUMP'; petId: string };

export type InventoryEvent =
  | { type: 'COLLECTION_UPDATED'; cloudId: string }
  | { type: 'PET_ADDED'; pet: PetData }
  | { type: 'SHARD_UPDATED'; shard: ShardData };

type AppEvent = CloudEvent | PetEvent | InventoryEvent;

interface EventMap {
  CLOUD_CAPTURED: { type: 'CLOUD_CAPTURED'; cloud: CloudData; shards: number };
  CLOUD_SPAWNED: { type: 'CLOUD_SPAWNED'; cloud: CloudData };
  CLOUD_REMOVED: { type: 'CLOUD_REMOVED'; cloudId: string };
  EGG_CREATED: { type: 'EGG_CREATED'; egg: EggData };
  EGG_FED: { type: 'EGG_FED'; eggId: string; progress: number };
  PET_HATCHED: { type: 'PET_HATCHED'; eggId: string; pet: PetData };
  PET_EVOLVED: { type: 'PET_EVOLVED'; petId: string; pet: PetData };
  PET_CLICKED: { type: 'PET_CLICKED'; petId: string };
  PET_JUMP: { type: 'PET_JUMP'; petId: string };
  COLLECTION_UPDATED: { type: 'COLLECTION_UPDATED'; cloudId: string };
  PET_ADDED: { type: 'PET_ADDED'; pet: PetData };
  SHARD_UPDATED: { type: 'SHARD_UPDATED'; shard: ShardData };
}

type EventHandler<T extends keyof EventMap> = (event: EventMap[T]) => void;

class EventBus {
  private handlers: Map<string, Set<EventHandler<any>>> = new Map();

  on<T extends keyof EventMap>(eventType: T, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);
    return () => this.off(eventType, handler);
  }

  off<T extends keyof EventMap>(eventType: T, handler: EventHandler<T>): void {
    this.handlers.get(eventType)?.delete(handler);
  }

  emit(event: EventMap[keyof EventMap]): void {
    const eventType = event.type as keyof EventMap;
    this.handlers.get(eventType)?.forEach(handler => handler(event));
  }
}

export const eventBus = new EventBus();
