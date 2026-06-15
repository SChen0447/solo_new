import { EventType, EventPayloadMap } from './types';

type EventCallback<T extends EventType> = (payload: EventPayloadMap[T]) => void;

class EventBus {
  private listeners: Map<EventType, Set<EventCallback<EventType>>> = new Map();

  on<T extends EventType>(event: T, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as EventCallback<EventType>);
    return () => this.off(event, callback);
  }

  off<T extends EventType>(event: T, callback: EventCallback<T>): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(callback as EventCallback<EventType>);
    }
  }

  emit<T extends EventType>(event: T, payload: EventPayloadMap[T]): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach((cb) => {
        try {
          cb(payload);
        } catch (err) {
          console.error(`[EventBus] Error in listener for "${event}":`, err);
        }
      });
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const eventBus = new EventBus();
export default eventBus;
