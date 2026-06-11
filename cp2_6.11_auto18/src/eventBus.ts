import { EventType, EventCallback } from './types';

export class EventBus {
  private listeners: Map<EventType, Set<EventCallback>> = new Map();

  on(event: EventType, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: EventType, callback: EventCallback): void {
    const set = this.listeners.get(event);
    if (set) set.delete(callback);
  }

  emit(event: EventType, payload?: unknown): void {
    const set = this.listeners.get(event);
    if (!set) return;
    set.forEach((cb) => {
      try {
        cb(payload);
      } catch (e) {
        console.error(`[EventBus] error in listener for ${event}:`, e);
      }
    });
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const eventBus = new EventBus();
