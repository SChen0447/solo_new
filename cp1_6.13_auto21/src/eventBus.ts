import type { EventMap } from './types'

type EventKey = keyof EventMap
type EventHandler<K extends EventKey> = (payload: EventMap[K]) => void
type EventHandlerMap = {
  [K in EventKey]?: Set<EventHandler<K>>
}

class EventBus {
  private handlers: EventHandlerMap = {}

  on<K extends EventKey>(event: K, handler: EventHandler<K>): () => void {
    if (!this.handlers[event]) {
      this.handlers[event] = new Set()
    }
    ;(this.handlers[event] as Set<EventHandler<K>>).add(handler)

    return () => {
      this.off(event, handler)
    }
  }

  off<K extends EventKey>(event: K, handler: EventHandler<K>): void {
    const handlers = this.handlers[event]
    if (handlers) {
      ;(handlers as Set<EventHandler<K>>).delete(handler)
      if (handlers.size === 0) {
        delete this.handlers[event]
      }
    }
  }

  emit<K extends EventKey>(event: K, payload: EventMap[K]): void {
    const handlers = this.handlers[event]
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          ;(handler as EventHandler<K>)(payload)
        } catch (error) {
          console.error(`[EventBus] Error in handler for "${event}":`, error)
        }
      })
    }
  }

  once<K extends EventKey>(event: K, handler: EventHandler<K>): () => void {
    const wrappedHandler: EventHandler<K> = (payload) => {
      handler(payload)
      this.off(event, wrappedHandler)
    }
    return this.on(event, wrappedHandler)
  }

  clear(): void {
    this.handlers = {}
  }

  hasListeners<K extends EventKey>(event: K): boolean {
    return !!this.handlers[event] && this.handlers[event]!.size > 0
  }
}

export const eventBus = new EventBus()
export default eventBus
