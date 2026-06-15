type EventCallback = (...args: unknown[]) => void

class EventBus {
  private events: Map<string, Set<EventCallback>>

  constructor() {
    this.events = new Map()
  }

  on(event: string, callback: EventCallback): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set())
    }
    this.events.get(event)!.add(callback)

    return () => {
      this.off(event, callback)
    }
  }

  off(event: string, callback: EventCallback): void {
    const callbacks = this.events.get(event)
    if (callbacks) {
      callbacks.delete(callback)
      if (callbacks.size === 0) {
        this.events.delete(event)
      }
    }
  }

  emit(event: string, ...args: unknown[]): void {
    const callbacks = this.events.get(event)
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(...args)
        } catch (error) {
          console.error(`Error in event handler for "${event}":`, error)
        }
      })
    }
  }

  clear(): void {
    this.events.clear()
  }

  hasListeners(event: string): boolean {
    const callbacks = this.events.get(event)
    return callbacks !== undefined && callbacks.size > 0
  }
}

export const eventBus = new EventBus()

export const EventType = {
  DOM_PARSED: 'dom:parsed',
  PERFORMANCE_UPDATED: 'performance:updated',
  NODE_SELECTED: 'node:selected',
  NODE_HIGHLIGHT: 'node:highlight',
  CODE_UPDATED: 'code:updated',
  VIEW_CHANGED: 'view:changed',
  ZOOM_CHANGED: 'zoom:changed',
  SUGGESTIONS_GENERATED: 'suggestions:generated',
  SCROLL_SYNC: 'scroll:sync',
  HEATMAP_TOGGLE: 'heatmap:toggle',
} as const

export type EventType = typeof EventType[keyof typeof EventType]

export default eventBus
