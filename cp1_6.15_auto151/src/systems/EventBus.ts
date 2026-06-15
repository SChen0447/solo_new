import type { GameEvent, GameEventType } from '../types/game';

type EventHandler<T = unknown> = (event: GameEvent<T>) => void;

class EventBus {
  private handlers: Map<GameEventType, Set<EventHandler>> = new Map();

  on<T = unknown>(type: GameEventType, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler as EventHandler);

    return () => {
      this.off(type, handler);
    };
  }

  off<T = unknown>(type: GameEventType, handler: EventHandler<T>): void {
    const typeHandlers = this.handlers.get(type);
    if (typeHandlers) {
      typeHandlers.delete(handler as EventHandler);
      if (typeHandlers.size === 0) {
        this.handlers.delete(type);
      }
    }
  }

  emit<T = unknown>(type: GameEventType, payload: T): void {
    const event: GameEvent<T> = {
      type,
      payload,
      timestamp: performance.now(),
    };

    const typeHandlers = this.handlers.get(type);
    if (typeHandlers) {
      typeHandlers.forEach((handler) => {
        try {
          handler(event);
        } catch (error) {
          console.error(`Error in event handler for ${type}:`, error);
        }
      });
    }

    const allHandlers = this.handlers.get('*' as GameEventType);
    if (allHandlers) {
      allHandlers.forEach((handler) => {
        try {
          handler(event);
        } catch (error) {
          console.error(`Error in wildcard event handler:`, error);
        }
      });
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}

export const eventBus = new EventBus();
