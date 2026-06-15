import { Router, type Request, type Response } from 'express'
import { db } from '../data.js'

const router = Router()

router.get('/', (_req: Request, res: Response): void => {
  res.json(db.assignments)
})

router.get('/:id', (req: Request, res: Response): void => {
  const assignment = db.findAssignment(req.params.id)
  if (!assignment) {
    res.status(404).json({ error: '题目未找到' })
    return
  }
  res.json(assignment)
})

router.post('/', (req: Request, res: Response): void => {
  const { title, description, difficulty, testCases } = req.body
  if (!title || !description || !difficulty) {
    res.status(400).json({ error: '标题、描述和难度为必填项' })
    return
  }
  if (title.length > 40) {
    res.status(400).json({ error: '标题最大40个字符' })
    return
  }
  if (!['beginner', 'intermediate', 'advanced'].includes(difficulty)) {
    res.status(400).json({ error: '难度等级无效' })
    return
  }
  if (testCases && testCases.length > 3) {
    res.status(400).json({ error: '示例输入输出至多3组' })
    return
  }
  const assignment = db.addAssignment({ title, description, difficulty, testCases: testCases || [] })
  res.status(201).json(assignment)
})

router.put('/:id', (req: Request, res: Response): void => {
  const { title, description, difficulty, testCases } = req.body
  if (title && title.length > 40) {
    res.status(400).json({ error: '标题最大40个字符' })
    return
  }
  if (difficulty && !['beginner', 'intermediate', 'advanced'].includes(difficulty)) {
    res.status(400).json({ error: '难度等级无效' })
    return
  }
  if (testCases && testCases.length > 3) {
    res.status(400).json({ error: '示例输入输出至多3组' })
    return
  }
  const updated = db.updateAssignment(req.params.id, req.body)
  if (!updated) {
    res.status(404).json({ error: '题目未找到' })
    return
  }
  res.json(updated)
})

router.delete('/:id', (req: Request, res: Response): void => {
  const deleted = db.deleteAssignment(req.params.id)
  if (!deleted) {
    res.status(404).json({ error: '题目未找到' })
    return
  }
  res.json({ success: true })
})

export default router
