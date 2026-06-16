import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'

export interface RecipeIngredient {
  id: string
  name: string
  amount: number
  unit: string
  pricePerGram: number
}

export interface IngredientStock {
  id: string
  name: string
  unit: string
  defaultPrice: number
  stock: number
}

export interface Recipe {
  id: string
  name: string
  yieldQuantity: number
  yieldUnit: string
  prepTime: number
  ingredients: RecipeIngredient[]
  steps: string
}

interface RecipeState {
  recipes: Recipe[]
  currentRecipe: Recipe | null
  ingredients: IngredientStock[]
  editingRowId: string | null
  setRecipes: (recipes: Recipe[]) => void
  setCurrentRecipe: (recipe: Recipe | null) => void
  setIngredients: (ingredients: IngredientStock[]) => void
  setEditingRowId: (id: string | null) => void
  addIngredient: (ingredient?: Partial<RecipeIngredient>) => void
  removeIngredient: (id: string) => void
  updateIngredient: (id: string, updates: Partial<RecipeIngredient>) => void
  updateRecipeInfo: (updates: Partial<Recipe>) => void
  calculateTotalCost: () => number
  calculateUnitCost: () => number
  calculateGrossMargin: () => number
  getStockByName: (name: string) => IngredientStock | undefined
  isLowStock: (name: string, amount: number) => boolean
  saveRecipe: () => Promise<Recipe | null>
  loadRecipe: (id: string) => Promise<void>
  loadRecipes: () => Promise<void>
  createNewRecipe: () => void
}

const emptyRecipe: Recipe = {
  id: '',
  name: '',
  yieldQuantity: 1,
  yieldUnit: '个',
  prepTime: 30,
  ingredients: [],
  steps: ''
}

export const useRecipeStore = create<RecipeState>((set, get) => ({
  recipes: [],
  currentRecipe: null,
  ingredients: [],
  editingRowId: null,

  setRecipes: (recipes) => set({ recipes }),
  setCurrentRecipe: (recipe) => set({ currentRecipe: recipe }),
  setIngredients: (ingredients) => set({ ingredients }),
  setEditingRowId: (id) => set({ editingRowId: id }),

  addIngredient: (ingredient) => {
    const { currentRecipe, ingredients } = get()
    if (!currentRecipe) return

    const defaultIngredient = ingredients[0]
    const newIngredient: RecipeIngredient = {
      id: uuidv4(),
      name: ingredient?.name || defaultIngredient?.name || '低筋面粉',
      amount: ingredient?.amount || 100,
      unit: ingredient?.unit || '克',
      pricePerGram: ingredient?.pricePerGram || defaultIngredient?.defaultPrice || 0.012,
      ...ingredient
    }

    set({
      currentRecipe: {
        ...currentRecipe,
        ingredients: [...currentRecipe.ingredients, newIngredient]
      },
      editingRowId: newIngredient.id
    })
  },

  removeIngredient: (id) => {
    const { currentRecipe } = get()
    if (!currentRecipe) return

    set({
      currentRecipe: {
        ...currentRecipe,
        ingredients: currentRecipe.ingredients.filter(ing => ing.id !== id)
      }
    })
  },

  updateIngredient: (id, updates) => {
    const { currentRecipe } = get()
    if (!currentRecipe) return

    set({
      currentRecipe: {
        ...currentRecipe,
        ingredients: currentRecipe.ingredients.map(ing =>
          ing.id === id ? { ...ing, ...updates } : ing
        )
      }
    })
  },

  updateRecipeInfo: (updates) => {
    const { currentRecipe } = get()
    if (!currentRecipe) return

    set({
      currentRecipe: { ...currentRecipe, ...updates }
    })
  },

  calculateTotalCost: () => {
    const { currentRecipe } = get()
    if (!currentRecipe) return 0

    return currentRecipe.ingredients.reduce((total, ing) => {
      return total + ing.amount * ing.pricePerGram
    }, 0)
  },

  calculateUnitCost: () => {
    const { currentRecipe, calculateTotalCost } = get()
    if (!currentRecipe || currentRecipe.yieldQuantity <= 0) return 0

    const totalCost = calculateTotalCost()
    return totalCost / currentRecipe.yieldQuantity
  },

  calculateGrossMargin: () => {
    const unitCost = get().calculateUnitCost()
    if (unitCost <= 0) return 0

    const sellingPrice = unitCost * 2.5
    return ((sellingPrice - unitCost) / sellingPrice) * 100
  },

  getStockByName: (name) => {
    return get().ingredients.find(ing => ing.name === name)
  },

  isLowStock: (name, amount) => {
    const stock = get().getStockByName(name)
    if (!stock) return false
    return (stock.stock - amount) / stock.stock < 0.2
  },

  saveRecipe: async () => {
    const { currentRecipe } = get()
    if (!currentRecipe) return null

    try {
      let savedRecipe: Recipe

      if (currentRecipe.id) {
        const response = await fetch(`/api/recipes/${currentRecipe.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(currentRecipe)
        })
        savedRecipe = await response.json()
      } else {
        const response = await fetch('/api/recipes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(currentRecipe)
        })
        savedRecipe = await response.json()
      }

      set({ currentRecipe: savedRecipe })
      return savedRecipe
    } catch (error) {
      console.error('保存配方失败:', error)
      return null
    }
  },

  loadRecipe: async (id) => {
    try {
      const response = await fetch(`/api/recipes/${id}`)
      const recipe = await response.json()
      set({ currentRecipe: recipe })
    } catch (error) {
      console.error('加载配方失败:', error)
    }
  },

  loadRecipes: async () => {
    try {
      const response = await fetch('/api/recipes')
      const recipes = await response.json()
      set({ recipes })
    } catch (error) {
      console.error('加载配方列表失败:', error)
    }
  },

  createNewRecipe: () => {
    set({
      currentRecipe: {
        ...emptyRecipe,
        id: '',
        ingredients: [
          { id: uuidv4(), name: '低筋面粉', amount: 200, unit: '克', pricePerGram: 0.012 },
          { id: uuidv4(), name: '白砂糖', amount: 80, unit: '克', pricePerGram: 0.008 },
          { id: uuidv4(), name: '无盐黄油', amount: 100, unit: '克', pricePerGram: 0.06 }
        ]
      }
    })
  }
}))
