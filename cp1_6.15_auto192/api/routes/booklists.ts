import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../db.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  const booklists = db.prepare(`
    SELECT bl.*,
      COUNT(blb.book_id) as book_count,
      ROUND(AVG(b.avg_rating), 1) as avg_rating
    FROM booklists bl
    LEFT JOIN booklist_books blb ON bl.id = blb.booklist_id
    LEFT JOIN books b ON blb.book_id = b.id
    GROUP BY bl.id
    ORDER BY bl.created_at DESC
  `).all()
  res.json({ success: true, data: booklists })
})

router.get('/:id', (req: Request, res: Response): void => {
  const booklist = db.prepare(`
    SELECT bl.*,
      COUNT(blb.book_id) as book_count,
      ROUND(AVG(b.avg_rating), 1) as avg_rating
    FROM booklists bl
    LEFT JOIN booklist_books blb ON bl.id = blb.booklist_id
    LEFT JOIN books b ON blb.book_id = b.id
    WHERE bl.id = ?
    GROUP BY bl.id
  `).get(req.params.id) as Record<string, any> | undefined

  if (!booklist) {
    res.status(404).json({ success: false, error: 'Booklist not found' })
    return
  }

  const books = db.prepare(`
    SELECT b.* FROM books b
    INNER JOIN booklist_books blb ON b.id = blb.book_id
    WHERE blb.booklist_id = ?
    ORDER BY blb.sort_order
  `).all(req.params.id)

  res.json({ success: true, data: { ...booklist, books } })
})

router.post('/', (req: Request, res: Response): void => {
  const { title, description, bookIds } = req.body
  if (!title) {
    res.status(400).json({ success: false, error: 'Title is required' })
    return
  }

  const id = uuidv4()
  const insertBooklist = db.prepare(`
    INSERT INTO booklists (id, title, description) VALUES (?, ?, ?)
  `)
  const insertBooklistBook = db.prepare(`
    INSERT INTO booklist_books (booklist_id, book_id, sort_order) VALUES (?, ?, ?)
  `)

  const transaction = db.transaction(() => {
    insertBooklist.run(id, title, description || '')
    if (Array.isArray(bookIds)) {
      bookIds.forEach((bookId: string, index: number) => {
        insertBooklistBook.run(id, bookId, index)
      })
    }
  })

  transaction()

  const booklist = db.prepare('SELECT * FROM booklists WHERE id = ?').get(id)
  res.status(201).json({ success: true, data: booklist })
})

export default router
