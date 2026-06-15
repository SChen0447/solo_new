import type { EventMap } from '@/types';

type EventName = keyof EventMap;
type EventCallback<K extends EventName> = (payload: EventMap[K]) => void;

export class EventBus {
  private static instance: EventBus | null = null;
  private listeners: Map<EventName, Set<Function>> = new Map();

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  on<K extends EventName>(event: K, callback: EventCallback<K>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as Function);

    return () => {
      this.off(event, callback);
    };
  }

  off<K extends EventName>(event: K, callback: EventCallback<K>): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback as Function);
    }
  }

  emit<K extends EventName>(event: K, payload: EventMap[K]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          (cb as EventCallback<K>)(payload);
        } catch (err) {
          console.error(`[EventBus] Error in listener for "${event}":`, err);
        }
      });
    }
  }

  clear(): void {
    this.listeners.clear();
  }

  removeAllListeners<K extends EventName>(event?: K): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

export const eventBus = EventBus.getInstance();

export default eventBus;
