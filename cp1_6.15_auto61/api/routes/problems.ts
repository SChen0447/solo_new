import { Router, type Response } from 'express'
import db from '../database.js'
import { authMiddleware, type Request } from './auth.js'

const router = Router()

router.get('/random', authMiddleware, (_req: Request, res: Response): void => {
  const problem = db.prepare('SELECT * FROM problems ORDER BY RANDOM() LIMIT 1').get() as any

  if (!problem) {
    res.status(404).json({ success: false, error: 'No problems available' })
    return
  }

  const allTestCases = JSON.parse(problem.test_cases || '[]')
  const visibleTestCases = allTestCases.filter((tc: any) => !tc.isHidden)

  res.json({
    success: true,
    problem: {
      id: problem.id,
      title: problem.title,
      description: problem.description,
      difficulty: problem.difficulty,
      template: problem.template,
      testCases: visibleTestCases,
    },
  })
})

export default router
