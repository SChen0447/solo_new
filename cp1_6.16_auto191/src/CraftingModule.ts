import { InventoryModule } from './InventoryModule'
import type { Recipe } from './types'
import { eventBus } from './EventBus'

export class CraftingModule {
  private recipes: Recipe[] = []
  private inventory: InventoryModule

  constructor(inventory: InventoryModule) {
    this.inventory = inventory
  }

  setRecipes(recipes: Recipe[]): void {
    this.recipes = [...recipes]
  }

  getRecipes(): Recipe[] {
    return [...this.recipes]
  }

  canCraft(recipeId: string): boolean {
    const recipe = this.recipes.find(r => r.id === recipeId)
    if (!recipe) return false
    return this.inventory.hasItems(recipe.materials)
  }

  craft(recipeId: string): boolean {
    const recipe = this.recipes.find(r => r.id === recipeId)
    if (!recipe) {
      eventBus.emit('craftingFail', { recipeId, reason: '配方不存在' })
      return false
    }

    if (!this.inventory.consumeItems(recipe.materials)) {
      eventBus.emit('craftingFail', { recipeId, reason: '材料不足' })
      return false
    }

    for (const [itemId, quantity] of Object.entries(recipe.output)) {
      this.inventory.addItem(itemId, quantity)
    }

    eventBus.emit('craftingSuccess', { recipeId, output: { ...recipe.output } })
    return true
  }

  getRecipe(recipeId: string): Recipe | undefined {
    return this.recipes.find(r => r.id === recipeId)
  }
}

export default CraftingModule
