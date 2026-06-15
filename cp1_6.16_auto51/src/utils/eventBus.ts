import type { CombatResult, SimulationConfig } from '../data/definitions';

export type EventType = 
  | 'config:update'
  | 'simulation:start'
  | 'simulation:progress'
  | 'simulation:complete'
  | 'simulation:error'
  | 'history:save'
  | 'history:restore'
  | 'history:clear';

export interface EventPayloadMap {
  'config:update': SimulationConfig;
  'simulation:start': SimulationConfig;
  'simulation:progress': { progress: number; currentPair: number; totalPairs: number };
  'simulation:complete': { config: SimulationConfig; results: CombatResult[] };
  'simulation:error': { error: string };
  'history:save': { config: SimulationConfig; results: CombatResult[] };
  'history:restore': string;
  'history:clear': void;
}

type EventCallback<T extends EventType> = (payload: EventPayloadMap[T]) => void;

interface EventSubscription {
  id: string;
  eventType: EventType;
  callback: EventCallback<EventType>;
}

class EventBus {
  private subscriptions: Map<EventType, Set<EventSubscription>> = new Map();
  private subscriptionIdCounter = 0;

  on<T extends EventType>(eventType: T, callback: EventCallback<T>): () => void {
    const subscription: EventSubscription = {
      id: `sub_${++this.subscriptionIdCounter}`,
      eventType,
      callback: callback as EventCallback<EventType>
    };

    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, new Set());
    }

    this.subscriptions.get(eventType)!.add(subscription);

    return () => {
      this.off(eventType, subscription.id);
    };
  }

  off<T extends EventType>(eventType: T, subscriptionId: string): void {
    const subscriptions = this.subscriptions.get(eventType);
    if (subscriptions) {
      for (const sub of subscriptions) {
        if (sub.id === subscriptionId) {
          subscriptions.delete(sub);
          break;
        }
      }
      if (subscriptions.size === 0) {
        this.subscriptions.delete(eventType);
      }
    }
  }

  emit<T extends EventType>(eventType: T, payload: EventPayloadMap[T]): void {
    const subscriptions = this.subscriptions.get(eventType);
    if (subscriptions) {
      subscriptions.forEach(sub => {
        try {
          sub.callback(payload);
        } catch (error) {
          console.error(`Error in event handler for ${eventType}:`, error);
        }
      });
    }
  }

  once<T extends EventType>(eventType: T, callback: EventCallback<T>): () => void {
    const unsubscribe = this.on(eventType, ((payload: EventPayloadMap[T]) => {
      unsubscribe();
      callback(payload);
    }) as EventCallback<T>);
    return unsubscribe;
  }

  clear(): void {
    this.subscriptions.clear();
  }

  hasSubscribers(eventType: EventType): boolean {
    const subscriptions = this.subscriptions.get(eventType);
    return subscriptions ? subscriptions.size > 0 : false;
  }
}

export const eventBus = new EventBus();

export default eventBus;
