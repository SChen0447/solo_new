import { Router, type Request, type Response } from 'express'
import db from '../db.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  const books = db.prepare('SELECT * FROM books').all()
  res.json({ success: true, data: books })
})

router.get('/:id', (req: Request, res: Response): void => {
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id)
  if (!book) {
    res.status(404).json({ success: false, error: 'Book not found' })
    return
  }
  res.json({ success: true, data: book })
})

export default router
