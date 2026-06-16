import express from 'express'
import cors from 'cors'

const app = express()
const PORT = 5000

app.use(cors())
app.use(express.json())

app.get('/init/player', (_req, res) => {
  res.json({
    hunger: 100,
    temperature: 25,
    water: 100,
    inventory: {
      wood: 5,
      stone: 3,
      berry: 2,
      rawFish: 1,
      cloth: 1,
      herb: 2
    }
  })
})

app.get('/init/recipes', (_req, res) => {
  res.json([
    {
      id: 'woodAxe',
      name: '木斧',
      icon: '🪓',
      materials: { wood: 3, stone: 1 },
      output: { woodAxe: 1 }
    },
    {
      id: 'stonePickaxe',
      name: '石镐',
      icon: '⛏️',
      materials: { wood: 2, stone: 3 },
      output: { stonePickaxe: 1 }
    },
    {
      id: 'tent',
      name: '帐篷',
      icon: '⛺',
      materials: { wood: 4, cloth: 2 },
      output: { tent: 1 }
    },
    {
      id: 'torch',
      name: '火把',
      icon: '🔦',
      materials: { wood: 1, cloth: 1 },
      output: { torch: 2 }
    },
    {
      id: 'grilledFish',
      name: '烤鱼',
      icon: '🐟',
      materials: { rawFish: 1, wood: 1 },
      output: { grilledFish: 1 }
    },
    {
      id: 'herbSoup',
      name: '草药汤',
      icon: '🍲',
      materials: { herb: 2, water: 1 },
      output: { herbSoup: 1 }
    },
    {
      id: 'leatherCoat',
      name: '皮革外套',
      icon: '🧥',
      materials: { cloth: 3, herb: 1 },
      output: { leatherCoat: 1 }
    },
    {
      id: 'waterBottle',
      name: '水壶',
      icon: '🫗',
      materials: { cloth: 2, stone: 1 },
      output: { waterBottle: 1 }
    },
    {
      id: 'trap',
      name: '陷阱',
      icon: '🪤',
      materials: { wood: 3, stone: 2, cloth: 1 },
      output: { trap: 1 }
    },
    {
      id: 'campfire',
      name: '篝火',
      icon: '🔥',
      materials: { wood: 5, stone: 2 },
      output: { campfire: 1 }
    }
  ])
})

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})
