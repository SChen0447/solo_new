type EventCallback = (...args: any[]) => void;

class EventBus {
  private events: Map<string, Set<EventCallback>> = new Map();

  on(event: string, callback: EventCallback): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  off(event: string, callback: EventCallback): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.events.delete(event);
      }
    }
  }

  emit(event: string, ...args: any[]): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(...args);
        } catch (e) {
          console.error(`Event listener error for "${event}":`, e);
        }
      });
    }
  }

  clear(): void {
    this.events.clear();
  }
}

export const eventBus = new EventBus();

export enum Events {
  CONFIG_CHANGED = 'config-changed',
  TICK = 'tick',
  TIMER_ENDED = 'timer-ended',
  CODE_GENERATE = 'code-generate',
  TIMER_CONTROL = 'timer-control',
}
