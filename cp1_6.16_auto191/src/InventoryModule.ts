import { eventBus } from './EventBus'

export class InventoryModule {
  private items: Map<string, number> = new Map()
  private initialItems: Record<string, number> = {}

  constructor(initialItems: Record<string, number> = {}) {
    this.setInitialItems(initialItems)
  }

  setInitialItems(items: Record<string, number>): void {
    this.initialItems = { ...items }
    this.items.clear()
    for (const [key, value] of Object.entries(items)) {
      this.items.set(key, value)
    }
  }

  addItem(itemId: string, quantity: number = 1): void {
    if (quantity <= 0) return
    const current = this.items.get(itemId) ?? 0
    this.items.set(itemId, current + quantity)
    this.emitChange()
  }

  removeItem(itemId: string, quantity: number = 1): boolean {
    if (quantity <= 0) return false
    const current = this.items.get(itemId) ?? 0
    if (current < quantity) return false
    this.items.set(itemId, current - quantity)
    if (this.items.get(itemId) === 0) {
      this.items.delete(itemId)
    }
    this.emitChange()
    return true
  }

  query(itemId: string): number {
    return this.items.get(itemId) ?? 0
  }

  hasItems(requirements: Record<string, number>): boolean {
    for (const [itemId, quantity] of Object.entries(requirements)) {
      if (this.query(itemId) < quantity) {
        return false
      }
    }
    return true
  }

  consumeItems(requirements: Record<string, number>): boolean {
    if (!this.hasItems(requirements)) return false
    
    for (const [itemId, quantity] of Object.entries(requirements)) {
      this.removeItem(itemId, quantity)
    }
    return true
  }

  getAllItems(): Record<string, number> {
    const result: Record<string, number> = {}
    for (const [key, value] of this.items) {
      result[key] = value
    }
    return result
  }

  reset(): void {
    this.setInitialItems(this.initialItems)
  }

  private emitChange(): void {
    eventBus.emit('inventoryChange', this.getAllItems())
  }
}

export default InventoryModule
