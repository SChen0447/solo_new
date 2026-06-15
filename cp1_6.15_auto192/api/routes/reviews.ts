import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../db.js'

const router = Router()

router.post('/', (req: Request, res: Response): void => {
  const { user_id, book_id, score, content } = req.body
  if (!user_id || !book_id || !score || !content) {
    res.status(400).json({ success: false, error: 'user_id, book_id, score and content are required' })
    return
  }
  if (score < 1 || score > 5) {
    res.status(400).json({ success: false, error: 'Score must be between 1 and 5' })
    return
  }

  const book = db.prepare('SELECT id FROM books WHERE id = ?').get(book_id)
  if (!book) {
    res.status(404).json({ success: false, error: 'Book not found' })
    return
  }

  const id = uuidv4()
  db.prepare('INSERT INTO reviews (id, user_id, book_id, score, content) VALUES (?, ?, ?, ?, ?)').run(
    id, user_id, book_id, score, content
  )

  const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(id)
  res.status(201).json({ success: true, data: review })
})

router.get('/book/:bookId', (req: Request, res: Response): void => {
  const reviews = db.prepare(`
    SELECT * FROM reviews WHERE book_id = ? ORDER BY created_at DESC
  `).all(req.params.bookId)
  res.json({ success: true, data: reviews })
})

export default router
