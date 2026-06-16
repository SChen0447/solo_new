import express from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'

const app = express()
const PORT = 4001

app.use(cors())
app.use(express.json())

interface Ingredient {
  id: string
  name: string
  unit: string
  defaultPrice: number
  stock: number
}

interface RecipeIngredient {
  id: string
  name: string
  amount: number
  unit: string
  pricePerGram: number
}

interface Recipe {
  id: string
  name: string
  yieldQuantity: number
  yieldUnit: string
  prepTime: number
  ingredients: RecipeIngredient[]
  steps: string
  createdAt: string
  updatedAt: string
}

const defaultIngredients: Ingredient[] = [
  { id: '1', name: '低筋面粉', unit: '克', defaultPrice: 0.012, stock: 5000 },
  { id: '2', name: '高筋面粉', unit: '克', defaultPrice: 0.015, stock: 5000 },
  { id: '3', name: '无盐黄油', unit: '克', defaultPrice: 0.06, stock: 3000 },
  { id: '4', name: '白砂糖', unit: '克', defaultPrice: 0.008, stock: 4000 },
  { id: '5', name: '红糖', unit: '克', defaultPrice: 0.012, stock: 2000 },
  { id: '6', name: '鸡蛋', unit: '克', defaultPrice: 0.02, stock: 2000 },
  { id: '7', name: '牛奶', unit: '克', defaultPrice: 0.01, stock: 3000 },
  { id: '8', name: '淡奶油', unit: '克', defaultPrice: 0.05, stock: 2000 },
  { id: '9', name: '巧克力', unit: '克', defaultPrice: 0.08, stock: 1500 },
  { id: '10', name: '可可粉', unit: '克', defaultPrice: 0.04, stock: 1000 },
  { id: '11', name: '香草精', unit: '克', defaultPrice: 0.5, stock: 200 },
  { id: '12', name: '泡打粉', unit: '克', defaultPrice: 0.02, stock: 500 },
  { id: '13', name: '小苏打', unit: '克', defaultPrice: 0.015, stock: 500 },
  { id: '14', name: '盐', unit: '克', defaultPrice: 0.003, stock: 1000 },
  { id: '15', name: '酵母', unit: '克', defaultPrice: 0.05, stock: 300 },
  { id: '16', name: '蜂蜜', unit: '克', defaultPrice: 0.06, stock: 1000 },
  { id: '17', name: '抹茶粉', unit: '克', defaultPrice: 0.2, stock: 300 },
  { id: '18', name: '杏仁粉', unit: '克', defaultPrice: 0.1, stock: 800 },
  { id: '19', name: '椰蓉', unit: '克', defaultPrice: 0.04, stock: 500 },
  { id: '20', name: '蔓越莓干', unit: '克', defaultPrice: 0.07, stock: 600 }
]

let ingredients: Ingredient[] = [...defaultIngredients]

let recipes: Recipe[] = [
  {
    id: uuidv4(),
    name: '经典巧克力曲奇',
    yieldQuantity: 24,
    yieldUnit: '块',
    prepTime: 45,
    ingredients: [
      { id: uuidv4(), name: '低筋面粉', amount: 200, unit: '克', pricePerGram: 0.012 },
      { id: uuidv4(), name: '无盐黄油', amount: 150, unit: '克', pricePerGram: 0.06 },
      { id: uuidv4(), name: '红糖', amount: 80, unit: '克', pricePerGram: 0.012 },
      { id: uuidv4(), name: '白砂糖', amount: 50, unit: '克', pricePerGram: 0.008 },
      { id: uuidv4(), name: '鸡蛋', amount: 50, unit: '克', pricePerGram: 0.02 },
      { id: uuidv4(), name: '巧克力', amount: 100, unit: '克', pricePerGram: 0.08 },
      { id: uuidv4(), name: '香草精', amount: 2, unit: '克', pricePerGram: 0.5 },
      { id: uuidv4(), name: '泡打粉', amount: 3, unit: '克', pricePerGram: 0.02 },
      { id: uuidv4(), name: '盐', amount: 1, unit: '克', pricePerGram: 0.003 }
    ],
    steps: '1. 黄油室温软化后加入糖打发\n2. 分次加入蛋液搅拌均匀\n3. 筛入粉类拌匀\n4. 加入巧克力豆\n5. 180度烤12分钟',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

app.get('/api/ingredients', (req, res) => {
  res.json(ingredients)
})

app.get('/api/recipes', (req, res) => {
  res.json(recipes)
})

app.get('/api/recipes/:id', (req, res) => {
  const recipe = recipes.find(r => r.id === req.params.id)
  if (!recipe) {
    return res.status(404).json({ error: '配方不存在' })
  }
  res.json(recipe)
})

app.post('/api/recipes', (req, res) => {
  const { name, yieldQuantity, yieldUnit, prepTime, ingredients: recipeIngredients, steps } = req.body
  const newRecipe: Recipe = {
    id: uuidv4(),
    name,
    yieldQuantity,
    yieldUnit,
    prepTime,
    ingredients: recipeIngredients || [],
    steps: steps || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  recipes.push(newRecipe)
  res.status(201).json(newRecipe)
})

app.put('/api/recipes/:id', (req, res) => {
  const index = recipes.findIndex(r => r.id === req.params.id)
  if (index === -1) {
    return res.status(404).json({ error: '配方不存在' })
  }
  const { name, yieldQuantity, yieldUnit, prepTime, ingredients: recipeIngredients, steps } = req.body
  recipes[index] = {
    ...recipes[index],
    name,
    yieldQuantity,
    yieldUnit,
    prepTime,
    ingredients: recipeIngredients || recipes[index].ingredients,
    steps: steps !== undefined ? steps : recipes[index].steps,
    updatedAt: new Date().toISOString()
  }
  res.json(recipes[index])
})

app.delete('/api/recipes/:id', (req, res) => {
  const index = recipes.findIndex(r => r.id === req.params.id)
  if (index === -1) {
    return res.status(404).json({ error: '配方不存在' })
  }
  recipes.splice(index, 1)
  res.json({ success: true })
})

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`)
})
