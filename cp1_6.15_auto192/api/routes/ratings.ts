import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../db.js'

const router = Router()

router.post('/', (req: Request, res: Response): void => {
  const { user_id, book_id, score } = req.body
  if (!user_id || !book_id || !score) {
    res.status(400).json({ success: false, error: 'user_id, book_id and score are required' })
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

  const existing = db.prepare('SELECT id FROM ratings WHERE user_id = ? AND book_id = ?').get(user_id, book_id)
  const transaction = db.transaction(() => {
    if (existing) {
      db.prepare('UPDATE ratings SET score = ? WHERE user_id = ? AND book_id = ?').run(score, user_id, book_id)
    } else {
      const id = uuidv4()
      db.prepare('INSERT INTO ratings (id, user_id, book_id, score) VALUES (?, ?, ?, ?)').run(id, user_id, book_id, score)
    }

    const stats = db.prepare(`
      SELECT ROUND(AVG(score), 1) as avg_rating, COUNT(*) as rating_count
      FROM ratings WHERE book_id = ?
    `).get(book_id) as { avg_rating: number | null; rating_count: number }

    db.prepare('UPDATE books SET avg_rating = ?, rating_count = ? WHERE id = ?').run(
      stats.avg_rating || 0,
      stats.rating_count,
      book_id
    )
  })

  transaction()

  const rating = db.prepare('SELECT * FROM ratings WHERE user_id = ? AND book_id = ?').get(user_id, book_id)
  res.status(existing ? 200 : 201).json({ success: true, data: rating })
})

router.get('/user/:userId', (req: Request, res: Response): void => {
  const ratings = db.prepare(`
    SELECT r.*, b.title, b.author, b.cover, b.tags
    FROM ratings r
    INNER JOIN books b ON r.book_id = b.id
    WHERE r.user_id = ?
    ORDER BY r.created_at DESC
  `).all(req.params.userId)
  res.json({ success: true, data: ratings })
})

router.get('/user/:userId/stats', (req: Request, res: Response): void => {
  const totalResult = db.prepare('SELECT COUNT(*) as totalRatings FROM ratings WHERE user_id = ?').get(req.params.userId) as { totalRatings: number }
  const avgResult = db.prepare('SELECT ROUND(AVG(score), 1) as avgRating FROM ratings WHERE user_id = ?').get(req.params.userId) as { avgRating: number | null }

  const topAuthors = db.prepare(`
    SELECT b.author, COUNT(*) as count, ROUND(AVG(r.score), 1) as avg_score
    FROM ratings r
    INNER JOIN books b ON r.book_id = b.id
    WHERE r.user_id = ?
    GROUP BY b.author
    ORDER BY count DESC, avg_score DESC
    LIMIT 5
  `).all(req.params.userId)

  res.json({
    success: true,
    data: {
      totalRatings: totalResult.totalRatings,
      avgRating: avgResult.avgRating || 0,
      topAuthors,
    },
  })
})

export default router
