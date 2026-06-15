import { Router, type Request, type Response } from 'express'
import { db } from '../data.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  const { submissionId } = req.query
  if (!submissionId) {
    res.status(400).json({ error: 'submissionId参数必填' })
    return
  }
  const annotations = db.findAnnotationsBySubmission(submissionId as string)
  res.json(annotations)
})

router.post('/', (req: Request, res: Response): void => {
  const { submissionId, lineNumber, content, createdBy } = req.body
  if (!submissionId || lineNumber === undefined || !content) {
    res.status(400).json({ error: '缺少必填字段' })
    return
  }
  const submission = db.findSubmission(submissionId)
  if (!submission) {
    res.status(404).json({ error: '提交记录未找到' })
    return
  }
  const annotation = db.addAnnotation({
    submissionId,
    lineNumber,
    content,
    createdBy: createdBy || '教师',
  })
  res.status(201).json(annotation)
})

router.delete('/:id', (req: Request, res: Response): void => {
  const deleted = db.deleteAnnotation(req.params.id)
  if (!deleted) {
    res.status(404).json({ error: '批注未找到' })
    return
  }
  res.json({ success: true })
})

export default router
