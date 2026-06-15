type EventCallback = (...args: any[]) => void

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
    return () => this.off(event, callback)
  }

  off(event: string, callback: EventCallback): void {
    const callbacks = this.events.get(event)
    if (callbacks) {
      callbacks.delete(callback)
    }
  }

  emit(event: string, ...args: any[]): void {
    const callbacks = this.events.get(event)
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(...args)
        } catch (e) {
          console.error(`EventBus error in event "${event}":`, e)
        }
      })
    }
  }

  clear(): void {
    this.events.clear()
  }
}

export const eventBus = new EventBus()

export enum Events {
  SCREENSHOT_PROGRESS = 'screenshot:progress',
  SCREENSHOT_COMPLETE = 'screenshot:complete',
  SCREENSHOT_ERROR = 'screenshot:error',
  DIFF_START = 'diff:start',
  DIFF_COMPLETE = 'diff:complete',
  DIFF_ERROR = 'diff:error',
  STATUS_MESSAGE = 'status:message',
  BATCH_COMPLETE = 'batch:complete'
}
