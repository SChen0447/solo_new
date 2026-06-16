import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import type { Pet, PetType, PetState, Task, QuestionnaireData } from '../../shared/types.js'

const pets = new Map<string, Pet>()
const tasks = new Map<string, Task>()

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

function generateInitialTasks(petId: string, petType: PetType): Task[] {
  const names = petType === 'cat' ? catTasks : dogTasks
  return names.map((name) => {
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
    return task
  })
}

const router = Router()

router.post('/questionnaire', (req: Request, res: Response): void => {
  const data: QuestionnaireData = req.body
  const petId = uuidv4()
  const now = new Date().toISOString()

  const initialState: PetState = {
    hunger: 80,
    energy: 80,
    social: 80,
    hygiene: 80,
  }

  const pet: Pet = {
    id: petId,
    type: data.petType,
    name: data.petType === 'cat' ? '小猫' : '小狗',
    questionnaire: data,
    state: initialState,
    createdAt: now,
  }

  pets.set(petId, pet)
  generateInitialTasks(petId, data.petType)

  res.status(201).json({ petId })
})

router.get('/pet/:id', (req: Request, res: Response): void => {
  const pet = pets.get(req.params.id)
  if (!pet) {
    res.status(404).json({ success: false, error: 'Pet not found' })
    return
  }
  res.json(pet)
})

router.get('/pet/:id/state', (req: Request, res: Response): void => {
  const pet = pets.get(req.params.id)
  if (!pet) {
    res.status(404).json({ success: false, error: 'Pet not found' })
    return
  }
  res.json(pet.state)
})

router.get('/tasks/:petId', (req: Request, res: Response): void => {
  const petTasks: Task[] = []
  for (const task of tasks.values()) {
    if (task.petId === req.params.petId) {
      petTasks.push(task)
    }
  }
  res.json(petTasks)
})

router.put('/tasks/:taskId/complete', (req: Request, res: Response): void => {
  const task = tasks.get(req.params.taskId)
  if (!task) {
    res.status(404).json({ success: false, error: 'Task not found' })
    return
  }
  task.completed = true
  task.completedAt = new Date().toISOString()
  tasks.set(task.id, task)
  res.json(task)
})

router.get('/history/:petId/:date', (req: Request, res: Response): void => {
  const { petId, date } = req.params
  const result: Task[] = []
  for (const task of tasks.values()) {
    if (task.petId === petId && task.createdAt.startsWith(date)) {
      result.push(task)
    }
  }
  res.json(result)
})

router.get('/report/:petId', (req: Request, res: Response): void => {
  const pet = pets.get(req.params.petId)
  if (!pet) {
    res.status(404).json({ success: false, error: 'Pet not found' })
    return
  }

  const petTasks: Task[] = []
  for (const task of tasks.values()) {
    if (task.petId === req.params.petId) {
      petTasks.push(task)
    }
  }

  const historyMap = new Map<string, Task[]>()
  for (const task of petTasks) {
    const day = task.createdAt.slice(0, 10)
    if (!historyMap.has(day)) {
      historyMap.set(day, [])
    }
    historyMap.get(day)!.push(task)
  }

  const history = Array.from(historyMap.entries()).map(([date, dayTasks]) => ({
    date,
    tasks: dayTasks,
    completionRate: dayTasks.filter((t) => t.completed).length / dayTasks.length,
  }))

  res.json({ pet, tasks: petTasks, history })
})

export { pets, tasks }
export default router
