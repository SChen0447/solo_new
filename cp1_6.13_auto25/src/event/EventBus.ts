import { EventType, EventCallback } from '../types';

class EventBus {
  private listeners: Map<EventType, Set<EventCallback>> = new Map();
  private lastEmitTimes: Map<EventType, number> = new Map();
  private throttledEvents: Map<EventType, number> = new Map();

  on<T = unknown>(event: EventType, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as EventCallback);
    
    return () => {
      this.off(event, callback);
    };
  }

  off<T = unknown>(event: EventType, callback: EventCallback<T>): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback as EventCallback);
    }
  }

  emit<T = unknown>(event: EventType, data?: T): void {
    const throttleDelay = this.throttledEvents.get(event);
    if (throttleDelay) {
      const lastEmit = this.lastEmitTimes.get(event) || 0;
      const now = performance.now();
      if (now - lastEmit < throttleDelay) {
        return;
      }
      this.lastEmitTimes.set(event, now);
    }

    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  throttle(event: EventType, delay: number): void {
    this.throttledEvents.set(event, delay);
  }

  unthrottle(event: EventType): void {
    this.throttledEvents.delete(event);
    this.lastEmitTimes.delete(event);
  }

  clear(): void {
    this.listeners.clear();
    this.lastEmitTimes.clear();
    this.throttledEvents.clear();
  }

  hasListeners(event: EventType): boolean {
    const callbacks = this.listeners.get(event);
    return callbacks !== undefined && callbacks.size > 0;
  }
}

export const eventBus = new EventBus();
export default eventBus;
