import { Router, type Request, type Response } from 'express'
import db from '../db.js'

const router = Router()

router.get('/:userId', (req: Request, res: Response): void => {
  const userId = req.params.userId

  const topRatings = db.prepare(`
    SELECT r.book_id, r.score FROM ratings r
    WHERE r.user_id = ?
    ORDER BY r.score DESC
    LIMIT 3
  `).all(userId) as { book_id: string; score: number }[]

  if (topRatings.length === 0) {
    const fallback = db.prepare(`
      SELECT * FROM books ORDER BY rating_count DESC, avg_rating DESC LIMIT 4
    `).all()
    res.json({ success: true, data: fallback })
    return
  }

  const topBookIds = topRatings.map(r => r.book_id)

  const topBooks = db.prepare(`
    SELECT id, author, tags FROM books WHERE id IN (${topBookIds.map(() => '?').join(',')})
  `).all(...topBookIds) as { id: string; author: string; tags: string }[]

  const authors = [...new Set(topBooks.map(b => b.author))]
  const tagSet = new Set<string>()
  topBooks.forEach(b => {
    b.tags.split(',').map(t => t.trim()).filter(Boolean).forEach(t => tagSet.add(t))
  })
  const tags = [...tagSet]

  const ratedBookIds = db.prepare(`
    SELECT book_id FROM ratings WHERE user_id = ?
  `).all(userId).map((r: any) => r.book_id)

  const allBooks = db.prepare('SELECT * FROM books').all() as any[]

  const candidates = allBooks.filter(book => {
    if (ratedBookIds.includes(book.id)) return false
    const bookAuthors = [book.author]
    const bookTags = book.tags.split(',').map(t => t.trim()).filter(Boolean)
    const authorMatch = bookAuthors.some(a => authors.includes(a))
    const tagMatch = bookTags.some(t => tags.includes(t))
    return authorMatch || tagMatch
  })

  candidates.sort((a, b) => {
    if (b.rating_count !== a.rating_count) return b.rating_count - a.rating_count
    return b.avg_rating - a.avg_rating
  })

  res.json({ success: true, data: candidates.slice(0, 4) })
})

export default router
