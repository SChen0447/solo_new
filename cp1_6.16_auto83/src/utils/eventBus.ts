export type EventHandler<T = any> = (data: T) => void;

export class EventBus {
  private static instance: EventBus;
  private handlers: Map<string, Set<EventHandler>> = new Map();

  private constructor() {}

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  public on<T = any>(event: string, handler: EventHandler<T>): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
  }

  public off<T = any>(event: string, handler: EventHandler<T>): void {
    const set = this.handlers.get(event);
    if (set) {
      set.delete(handler);
      if (set.size === 0) {
        this.handlers.delete(event);
      }
    }
  }

  public emit<T = any>(event: string, data?: T): void {
    const set = this.handlers.get(event);
    if (set) {
      set.forEach(handler => handler(data));
    }
  }

  public clear(): void {
    this.handlers.clear();
  }
}

export const eventBus = EventBus.getInstance();

export const Events = {
  PARAM_UPDATE: 'param:update',
  PRESET_APPLY: 'preset:apply',
  PARTICLE_DATA: 'particle:data',
  EMITTER_MOVE: 'emitter:move',
  RECORD_START: 'record:start',
  RECORD_STOP: 'record:stop',
  PLAYBACK_START: 'playback:start',
  PLAYBACK_END: 'playback:end',
  SCENE_READY: 'scene:ready',
  FPS_UPDATE: 'fps:update'
} as const;
