type EventCallback<T = any> = (data: T) => void;

class EventBus {
  private events: Map<string, Set<EventCallback>> = new Map();

  on<T>(event: string, callback: EventCallback<T>): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  off<T>(event: string, callback: EventCallback<T>): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  emit<T>(event: string, data?: T): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }

  once<T>(event: string, callback: EventCallback<T>): () => void {
    const wrappedCallback = (data: T) => {
      this.off(event, wrappedCallback);
      callback(data);
    };
    return this.on(event, wrappedCallback);
  }

  clear(): void {
    this.events.clear();
  }
}

export const eventBus = new EventBus();

export const Events = {
  ROOM_SIZE_CHANGED: 'room:size-changed',
  ROOM_MATERIAL_CHANGED: 'room:material-changed',
  LIGHT_ADDED: 'light:added',
  LIGHT_REMOVED: 'light:removed',
  LIGHT_PARAMS_CHANGED: 'light:params-changed',
  LIGHTS_GROUP_CHANGED: 'lights:group-changed',
  SCENE_UPDATED: 'scene:updated',
  HEATMAP_DATA_UPDATED: 'heatmap:data-updated',
  POST_PROCESSING_CHANGED: 'post:processing-changed',
  FURNITURE_MOVED: 'furniture:moved',
  PERFORMANCE_WARNING: 'performance:warning',
  RENDER: 'render',
} as const;
