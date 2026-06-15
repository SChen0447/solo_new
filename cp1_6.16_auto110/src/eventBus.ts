export type WaveType = 'P' | 'S' | 'L';

export interface SimParams {
  depth: number;
  magnitude: number;
  waveTypes: Set<WaveType>;
}

export interface WaveRadii {
  pRadius: number;
  sRadius: number;
  lRadius: number;
  time: number;
}

export type EventCallback<T = unknown> = (payload: T) => void;

export interface EventMap {
  'params:changed': SimParams;
  'simulation:start': SimParams;
  'wavefront:update': WaveRadii;
  'simulation:progress': { progress: number };
  'simulation:complete': void;
}

type EventName = keyof EventMap;

export class EventBus {
  private listeners = new Map<EventName, Set<EventCallback<any>>>();

  on<K extends EventName>(event: K, cb: EventCallback<EventMap[K]>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(cb);
  }

  off<K extends EventName>(event: K, cb: EventCallback<EventMap[K]>): void {
    this.listeners.get(event)?.delete(cb);
  }

  emit<K extends EventName>(event: K, payload: EventMap[K]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const cb of set) {
      try {
        cb(payload);
      } catch (e) {
        console.error(`[EventBus] Listener for ${String(event)} threw:`, e);
      }
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const SCALE = 1;
