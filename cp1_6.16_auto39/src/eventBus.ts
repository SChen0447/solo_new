import { EventCallback } from './types';

class EventBus {
  private events: Map<string, Set<EventCallback>>;

  constructor() {
    this.events = new Map();
  }

  on(event: string, callback: EventCallback): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(callback);
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
      callbacks.forEach((callback) => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`[EventBus] Error in event "${event}" handler:`, error);
        }
      });
    }
  }
}

export const eventBus = new EventBus();

export const Events = {
  IMAGE_UPLOAD: 'image:upload',
  RECOGNITION_START: 'recognition:start',
  RECOGNITION_PROGRESS: 'recognition:progress',
  RECOGNITION_COMPLETE: 'recognition:complete',
  RECOGNITION_ERROR: 'recognition:error',
  FURNITURE_SELECT: 'furniture:select',
  FURNITURE_ADD: 'furniture:add',
  FURNITURE_REMOVE: 'furniture:remove',
  FURNITURE_HIGHLIGHT: 'furniture:highlight',
  SCENE_CLEAR: 'scene:clear',
  SCENE_EXPORT: 'scene:export',
  SCENE_READY: 'scene:ready',
  FURNITURE_LIST_UPDATE: 'furniture:list:update',
};
