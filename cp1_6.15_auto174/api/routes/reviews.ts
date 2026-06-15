import { Router, type Request, type Response } from 'express'
import db from '../db.js'

const router = Router()

router.post('/', (req: Request, res: Response): void => {
  const { book_id, user_id, content, rating } = req.body

  if (!book_id || !user_id || !content || !rating) {
    res.status(400).json({ error: 'book_id、user_id、content 和 rating 为必填项' })
    return
  }

  if (rating < 1 || rating > 5) {
    res.status(400).json({ error: '评分范围为 1-5' })
    return
  }

  const result = db
    .prepare(
      'INSERT INTO reviews (book_id, user_id, content, rating, status) VALUES (?, ?, ?, ?, ?)'
    )
    .run(book_id, user_id, content, rating, 'pending')

  const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(result.lastInsertRowid) as any

  res.status(201).json(review)
})

router.put('/:id/audit', (req: Request, res: Response): void => {
  const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(req.params.id) as any

  if (!review) {
    res.status(404).json({ error: '书评不存在' })
    return
  }

  const { approved, reject_reason } = req.body

  if (approved) {
    db.prepare("UPDATE reviews SET status = 'approved', audited_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(review.id)
  } else {
    db.prepare("UPDATE reviews SET status = 'rejected', reject_reason = ?, audited_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(reject_reason || '', review.id)
  }

  const updated = db.prepare('SELECT * FROM reviews WHERE id = ?').get(review.id) as any
  res.json(updated)
})

router.get('/book/:bookId', (req: Request, res: Response): void => {
  const reviews = db
    .prepare(
      `SELECT r.*, u.display_name, u.avatar
       FROM reviews r JOIN users u ON r.user_id = u.id
       WHERE r.book_id = ? AND r.status = 'approved'
       ORDER BY r.created_at DESC`
    )
    .all(req.params.bookId) as any[]

  res.json(reviews)
})

router.get('/pending', (_req: Request, res: Response): void => {
  const reviews = db
    .prepare(
      `SELECT r.*, u.display_name, u.avatar, b.title as book_title
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       JOIN books b ON r.book_id = b.id
       WHERE r.status = 'pending'
       ORDER BY r.created_at DESC`
    )
    .all() as any[]

  res.json(reviews)
})

export default router
