import { EventMap } from '../types';

type EventCallback<T> = (data: T) => void;

class EventBus {
  private listeners: Map<keyof EventMap, Set<EventCallback<any>>> = new Map();

  on<K extends keyof EventMap>(
    event: K,
    callback: EventCallback<EventMap[K]>
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  off<K extends keyof EventMap>(
    event: K,
    callback: EventCallback<EventMap[K]>
  ): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const eventBus = new EventBus();
