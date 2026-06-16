import { createServer } from 'http'
import { WebSocketServer, type WebSocket } from 'ws'
import { v4 as uuidv4 } from 'uuid'
import app from './app.js'
import { pets, tasks } from './routes/pet.js'
import type { WSMessage, PetState, Task, PetType } from '../../shared/types.js'

const PORT = process.env.PORT || 4000

const server = createServer(app)

const wss = new WebSocketServer({ server })

const clients = new Set<WebSocket>()

function broadcast(message: WSMessage) {
  const data = JSON.stringify(message)
  for (const client of clients) {
    if (client.readyState === client.OPEN) {
      client.send(data)
    }
  }
}

wss.on('connection', (ws) => {
  clients.add(ws)
  ws.on('close', () => {
    clients.delete(ws)
  })
})

const catTasks = ['喂食', '梳毛', '铲猫砂', '陪玩', '清洁饮水']
const dogTasks = ['喂食', '遛狗', '梳毛', '训练', '清洁饮水', '洗澡']

const taskIcons: Record<string, string> = {
  '喂食': '🍖',
  '梳毛': '✂️',
  '铲猫砂': '🧹',
  '陪玩': '🎾',
  '清洁饮水': '💧',
  '遛狗': '🦮',
  '训练': '🎯',
  '洗澡': '🛁',
}

function generateDailyTasks(petId: string, petType: PetType) {
  const names = petType === 'cat' ? catTasks : dogTasks
  const today = new Date().toISOString().slice(0, 10)
  for (const task of tasks.values()) {
    if (task.petId === petId && task.createdAt.startsWith(today) && !task.completed) {
      return
    }
  }

  for (const name of names) {
    const task: Task = {
      id: uuidv4(),
      petId,
      name,
      icon: taskIcons[name] || '📋',
      duration: Math.floor(Math.random() * 20) + 5,
      completed: false,
      createdAt: new Date().toISOString(),
    }
    tasks.set(task.id, task)
    broadcast({ type: 'task_new', payload: task })
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

setInterval(() => {
  for (const [petId, pet] of pets) {
    const state: PetState = {
      hunger: clamp(pet.state.hunger - randomInRange(3, 5), 0, 100),
      energy: clamp(pet.state.energy - randomInRange(2, 4), 0, 100),
      social: clamp(pet.state.social - randomInRange(2, 3), 0, 100),
      hygiene: clamp(pet.state.hygiene - randomInRange(1, 3), 0, 100),
    }
    pet.state = state
    broadcast({ type: 'state_update', payload: state })
    generateDailyTasks(petId, pet.type)
  }
}, 30_000)

server.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`)
})

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('SIGINT signal received')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

export { broadcast }
export default app
