import React, { useReducer, useEffect, useCallback } from 'react'
import type { Recipe, AppState, AppAction, Ingredient, CookingStep, Difficulty } from './types'
import RecipeList from './RecipeList'
import RecipeDetail from './RecipeDetail'
import { v4 as uuidv4 } from 'uuid'

const STORAGE_KEY = 'shiyihuan_recipes'

const sampleIngredients: Ingredient[] = [
  { id: uuidv4(), name: '牛奶', amount: 250, unit: '毫升' },
  { id: uuidv4(), name: '中筋面粉', amount: 200, unit: '克' },
  { id: uuidv4(), name: '黄油', amount: 50, unit: '克' },
  { id: uuidv4(), name: '白砂糖', amount: 30, unit: '克' },
  { id: uuidv4(), name: '鸡蛋', amount: 2, unit: '个' }
]

const sampleSteps: CookingStep[] = [
  { id: uuidv4(), description: '将黄油室温软化，加入白砂糖打发至颜色变浅、体积膨胀。' },
  { id: uuidv4(), description: '逐个加入鸡蛋，每次搅拌均匀后再加下一个。' },
  { id: uuidv4(), description: '分次加入牛奶和过筛的面粉，翻拌均匀至无颗粒。' },
  { id: uuidv4(), description: '将面糊倒入模具，烤箱预热至180度，烘烤25-30分钟。' },
  { id: uuidv4(), description: '取出晾凉，脱模后即可享用。' }
]

function createSampleRecipes(): Recipe[] {
  return [
    {
      id: uuidv4(),
      name: '经典牛奶蛋糕',
      coverImage: '🍰',
      cookTime: 45,
      difficulty: 'medium' as Difficulty,
      ingredients: sampleIngredients,
      steps: sampleSteps,
      notes: '',
      createdAt: Date.now()
    },
    {
      id: uuidv4(),
      name: '家常番茄炒鸡蛋',
      coverImage: '🍳',
      cookTime: 15,
      difficulty: 'simple' as Difficulty,
      ingredients: [
        { id: uuidv4(), name: '新鲜番茄', amount: 2, unit: '个' },
        { id: uuidv4(), name: '鸡蛋', amount: 3, unit: '个' },
        { id: uuidv4(), name: '白砂糖', amount: 5, unit: '克' },
        { id: uuidv4(), name: '花生油', amount: 20, unit: '毫升' }
      ],
      steps: [
        { id: uuidv4(), description: '番茄切块，鸡蛋打散加少许盐。' },
        { id: uuidv4(), description: '热锅下油，倒入蛋液炒至凝固盛出。' },
        { id: uuidv4(), description: '锅中再加少许油，放入番茄翻炒出汁。' },
        { id: uuidv4(), description: '加入糖和炒好的鸡蛋，翻炒均匀即可出锅。' }
      ],
      notes: '',
      createdAt: Date.now()
    },
    {
      id: uuidv4(),
      name: '黑椒牛柳意面',
      coverImage: '🍝',
      cookTime: 30,
      difficulty: 'hard' as Difficulty,
      ingredients: [
        { id: uuidv4(), name: '牛肉', amount: 200, unit: '克' },
        { id: uuidv4(), name: '中筋面粉', amount: 50, unit: '克' },
        { id: uuidv4(), name: '黑胡椒粉', amount: 3, unit: '克' },
        { id: uuidv4(), name: '黄油', amount: 15, unit: '克' },
        { id: uuidv4(), name: '洋葱', amount: 50, unit: '克' },
        { id: uuidv4(), name: '大蒜', amount: 3, unit: '瓣' }
      ],
      steps: [
        { id: uuidv4(), description: '牛肉切条，加少许盐、黑胡椒粉和中筋面粉抓匀腌制10分钟。' },
        { id: uuidv4(), description: '意面下锅煮至八分熟，捞出备用。' },
        { id: uuidv4(), description: '平底锅加热黄油，放入洋葱碎和蒜末炒香。' },
        { id: uuidv4(), description: '加入牛柳快速翻炒至变色。' },
        { id: uuidv4(), description: '倒入意面和少许煮面水，撒上黑胡椒粉翻匀出锅。' }
      ],
      notes: '',
      createdAt: Date.now()
    }
  ]
}

function loadRecipesFromStorage(): Recipe[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error('Failed to load recipes from storage', e)
  }
  const samples = createSampleRecipes()
  saveRecipesToStorage(samples)
  return samples
}

function saveRecipesToStorage(recipes: Recipe[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes))
  } catch (e) {
    console.error('Failed to save recipes to storage', e)
  }
}

const initialState: AppState = {
  recipes: [],
  currentRecipeId: null,
  view: 'list'
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_RECIPES':
      return { ...state, recipes: action.payload }
    case 'ADD_RECIPE':
      return { ...state, recipes: [action.payload, ...state.recipes] }
    case 'UPDATE_RECIPE':
      return {
        ...state,
        recipes: state.recipes.map((r) =>
          r.id === action.payload.id ? action.payload : r
        )
      }
    case 'DELETE_RECIPE':
      return {
        ...state,
        recipes: state.recipes.filter((r) => r.id !== action.payload)
      }
    case 'SELECT_RECIPE':
      return {
        ...state,
        currentRecipeId: action.payload,
        view: action.payload ? 'detail' : 'list'
      }
    case 'SET_VIEW':
      return { ...state, view: action.payload }
    default:
      return state
  }
}

const App: React.FC = () => {
  const [state, dispatch] = useReducer(appReducer, initialState)

  useEffect(() => {
    const recipes = loadRecipesFromStorage()
    dispatch({ type: 'SET_RECIPES', payload: recipes })
  }, [])

  useEffect(() => {
    if (state.recipes.length > 0) {
      saveRecipesToStorage(state.recipes)
    }
  }, [state.recipes])

  const handleSelectRecipe = useCallback((id: string) => {
    dispatch({ type: 'SELECT_RECIPE', payload: id })
  }, [])

  const handleBack = useCallback(() => {
    dispatch({ type: 'SELECT_RECIPE', payload: null })
  }, [])

  const handleUpdateRecipe = useCallback((recipe: Recipe) => {
    dispatch({ type: 'UPDATE_RECIPE', payload: recipe })
  }, [])

  const handleAddRecipe = useCallback(() => {
    const newRecipe: Recipe = {
      id: uuidv4(),
      name: '新食谱',
      coverImage: '🍽️',
      cookTime: 30,
      difficulty: 'simple',
      ingredients: [
        { id: uuidv4(), name: '牛奶', amount: 100, unit: '毫升' },
        { id: uuidv4(), name: '中筋面粉', amount: 100, unit: '克' },
        { id: uuidv4(), name: '白砂糖', amount: 20, unit: '克' }
      ],
      steps: [
        { id: uuidv4(), description: '第一步：准备好所有食材。' },
        { id: uuidv4(), description: '第二步：按照菜谱顺序操作。' }
      ],
      notes: '',
      createdAt: Date.now()
    }
    dispatch({ type: 'ADD_RECIPE', payload: newRecipe })
    dispatch({ type: 'SELECT_RECIPE', payload: newRecipe.id })
  }, [])

  const currentRecipe = state.recipes.find((r) => r.id === state.currentRecipeId) || null

  return (
    <div style={appStyles.root}>
      {state.view === 'list' || !currentRecipe ? (
        <RecipeList
          recipes={state.recipes}
          onSelectRecipe={handleSelectRecipe}
          onAddRecipe={handleAddRecipe}
        />
      ) : (
        <RecipeDetail
          recipe={currentRecipe}
          onBack={handleBack}
          onUpdateRecipe={handleUpdateRecipe}
        />
      )}
    </div>
  )
}

const appStyles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100vh',
    backgroundColor: '#FFF8F0',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif'
  }
}

export default App
