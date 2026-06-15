type EventCallback = (...args: any[]) => void

class EventBus {
  private events: Map<string, EventCallback[]> = new Map()

  on(event: string, callback: EventCallback): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, [])
    }
    this.events.get(event)!.push(callback)
    return () => this.off(event, callback)
  }

  off(event: string, callback: EventCallback): void {
    const callbacks = this.events.get(event)
    if (!callbacks) return
    const index = callbacks.indexOf(callback)
    if (index > -1) {
      callbacks.splice(index, 1)
    }
  }

  emit(event: string, ...args: any[]): void {
    const callbacks = this.events.get(event)
    if (!callbacks) return
    callbacks.forEach((cb) => {
      try {
        cb(...args)
      } catch (e) {
        console.error(`EventBus error in "${event}":`, e)
      }
    })
  }
}

export const eventBus = new EventBus()
export default eventBus
