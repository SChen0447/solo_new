export type Difficulty = 'simple' | 'medium' | 'hard'

export type TasteChange = {
  sour?: '增强' | '减弱' | '不变'
  sweet?: '增强' | '减弱' | '不变'
  bitter?: '增强' | '减弱' | '不变'
  spicy?: '增强' | '减弱' | '不变'
  salty?: '增强' | '减弱' | '不变'
}

export interface Ingredient {
  id: string
  name: string
  amount: number
  unit: string
  isReplaced?: boolean
  originalName?: string
}

export interface CookingStep {
  id: string
  description: string
}

export interface Recipe {
  id: string
  name: string
  coverImage: string
  cookTime: number
  difficulty: Difficulty
  ingredients: Ingredient[]
  steps: CookingStep[]
  notes: string
  createdAt: number
}

export interface SubstitutionRule {
  id: string
  originalName: string
  substituteName: string
  ratio: string
  ratioValue: number
  tasteChange: TasteChange
  tasteDescription: string
}

export interface SubstitutionResult {
  rule: SubstitutionRule
  convertedAmount: number
  unit: string
}

export type View = 'list' | 'detail'

export interface AppState {
  recipes: Recipe[]
  currentRecipeId: string | null
  view: View
}

export type AppAction =
  | { type: 'ADD_RECIPE'; payload: Recipe }
  | { type: 'UPDATE_RECIPE'; payload: Recipe }
  | { type: 'DELETE_RECIPE'; payload: string }
  | { type: 'SELECT_RECIPE'; payload: string | null }
  | { type: 'SET_VIEW'; payload: View }
  | { type: 'SET_RECIPES'; payload: Recipe[] }
