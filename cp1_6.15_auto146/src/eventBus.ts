type EventCallback = (...args: any[]) => void;

class EventBus {
  private events: Record<string, EventCallback[]> = {};

  on(event: string, callback: EventCallback): () => void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
    return () => {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    };
  }

  emit(event: string, ...args: any[]): void {
    if (this.events[event]) {
      this.events[event].forEach(callback => callback(...args));
    }
  }

  off(event: string, callback: EventCallback): void {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    }
  }
}

export const eventBus = new EventBus();

export const EVENTS = {
  LEVEL_UPDATED: 'level:updated',
  TEST_MODE_CHANGED: 'test:modeChanged',
  ELEMENTS_SYNC: 'test:syncElements',
};
