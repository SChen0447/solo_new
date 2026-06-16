import type { EventCallback } from './types'

type EventMap = Record<string, any>

class EventBus<T extends EventMap = EventMap> {
  private listeners: Map<keyof T, Set<EventCallback<any>>> = new Map()

  on<K extends keyof T>(event: K, callback: (data: T[K]) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
    
    return () => {
      this.off(event, callback)
    }
  }

  off<K extends keyof T>(event: K, callback: (data: T[K]) => void): void {
    const set = this.listeners.get(event)
    if (set) {
      set.delete(callback)
    }
  }

  emit<K extends keyof T>(event: K, data: T[K]): void {
    const set = this.listeners.get(event)
    if (set) {
      set.forEach((cb) => {
        try {
          cb(data)
        } catch (e) {
          console.error(`Error in event listener for ${String(event)}:`, e)
        }
      })
    }
  }

  clear(): void {
    this.listeners.clear()
  }

  listenerCount<K extends keyof T>(event: K): number {
    return this.listeners.get(event)?.size ?? 0
  }
}

export const eventBus = new EventBus<{
  tick: import('./types').TickEvent
  weatherChange: import('./types').WeatherChangeEvent
  gameOver: import('./types').GameOverEvent
  inventoryChange: Record<string, number>
  statsChange: import('./types').PlayerStats
  craftingSuccess: { recipeId: string; output: Record<string, number> }
  craftingFail: { recipeId: string; reason: string }
  reset: void
}>()

export default EventBus
