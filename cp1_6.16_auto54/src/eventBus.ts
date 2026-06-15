import type { EventMap } from './types';

type EventCallback = (data: unknown) => void;

class EventBus {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  on<T extends keyof EventMap>(event: T, callback: (data: EventMap[T]) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as EventCallback);
    return () => this.off(event, callback as EventCallback);
  }

  off<T extends keyof EventMap>(event: T, callback: (data: EventMap[T]) => void): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback as EventCallback);
    }
  }

  emit<T extends keyof EventMap>(event: T, data: EventMap[T]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }
}

export const eventBus = new EventBus();
