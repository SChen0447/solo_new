import { EventMap, EventCallback } from './types';

type EventKey = keyof EventMap;

export class EventBus {
  private listeners: Map<EventKey, Set<EventCallback>> = new Map();

  on<K extends EventKey>(event: K, callback: EventCallback<EventMap[K]>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  emit<K extends EventKey>(event: K, data?: EventMap[K]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  off<K extends EventKey>(event: K, callback: EventCallback<EventMap[K]>): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const eventBus = new EventBus();
