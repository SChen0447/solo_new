type EventCallback = (...args: any[]) => void;

interface EventEntry {
  callback: EventCallback;
  once: boolean;
}

class EventBus {
  private listeners: Map<string, EventEntry[]> = new Map();

  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push({ callback, once: false });
  }

  once(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push({ callback, once: true });
  }

  off(event: string, callback: EventCallback): void {
    const entries = this.listeners.get(event);
    if (!entries) return;
    const filtered = entries.filter((e) => e.callback !== callback);
    if (filtered.length === 0) {
      this.listeners.delete(event);
    } else {
      this.listeners.set(event, filtered);
    }
  }

  emit(event: string, ...args: any[]): void {
    const entries = this.listeners.get(event);
    if (!entries) return;
    const toRemove: number[] = [];
    entries.forEach((entry, idx) => {
      entry.callback(...args);
      if (entry.once) toRemove.push(idx);
    });
    if (toRemove.length > 0) {
      const remaining = entries.filter((_, idx) => !toRemove.includes(idx));
      if (remaining.length === 0) {
        this.listeners.delete(event);
      } else {
        this.listeners.set(event, remaining);
      }
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const eventBus = new EventBus();

export type { EventCallback };
export { EventBus };
