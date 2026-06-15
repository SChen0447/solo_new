import { EventType, EventPayloadMap } from './types';

type EventCallback<T extends EventType> = (payload: EventPayloadMap[T]) => void;

class EventBus {
  private listeners: Map<EventType, Set<Function>> = new Map();

  on<T extends EventType>(event: T, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  off<T extends EventType>(event: T, callback: EventCallback<T>): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(callback);
    }
  }

  emit<T extends EventType>(event: T, payload: EventPayloadMap[T]): void {
    const set = this.listeners.get(event);
    if (set) {
      set.forEach((cb) => cb(payload));
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const eventBus = new EventBus();
