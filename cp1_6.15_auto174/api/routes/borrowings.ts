import { Router, type Request, type Response } from 'express'
import db from '../db.js'

const router = Router()

router.post('/', (req: Request, res: Response): void => {
  const { book_id, user_id } = req.body

  if (!book_id || !user_id) {
    res.status(400).json({ error: 'book_id 和 user_id 为必填项' })
    return
  }

  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(book_id) as any
  if (!book) {
    res.status(404).json({ error: '书籍不存在' })
    return
  }

  const activeCount = db
    .prepare('SELECT COUNT(*) as count FROM borrowings WHERE user_id = ? AND status = ?')
    .get(user_id, 'active') as { count: number }

  if (activeCount.count >= 3) {
    res.status(400).json({ error: '借阅数量已达上限（3本）' })
    return
  }

  const activeBorrowings = db
    .prepare('SELECT COUNT(*) as count FROM borrowings WHERE book_id = ? AND status = ?')
    .get(book_id, 'active') as { count: number }

  const available = book.quantity - activeBorrowings.count

  if (available > 0) {
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 14)

    const result = db
      .prepare(
        'INSERT INTO borrowings (book_id, user_id, status, due_date) VALUES (?, ?, ?, ?)'
      )
      .run(book_id, user_id, 'active', dueDate.toISOString())

    const borrowing = db.prepare('SELECT * FROM borrowings WHERE id = ?').get(result.lastInsertRowid) as any

    res.status(201).json({ type: 'borrow', borrowing })
  } else {
    const maxPosition = db
      .prepare('SELECT MAX(position) as max_pos FROM reservations WHERE book_id = ? AND status = ?')
      .get(book_id, 'waiting') as { max_pos: number | null }

    const position = (maxPosition.max_pos ?? 0) + 1

    const result = db
      .prepare(
        'INSERT INTO reservations (book_id, user_id, position, status) VALUES (?, ?, ?, ?)'
      )
      .run(book_id, user_id, position, 'waiting')

    const reservation = db.prepare('SELECT * FROM reservations WHERE id = ?').get(result.lastInsertRowid) as any

    res.status(201).json({ type: 'reserve', reservation })
  }
})

router.put('/:id/return', (req: Request, res: Response): void => {
  const borrowing = db.prepare('SELECT * FROM borrowings WHERE id = ?').get(req.params.id) as any

  if (!borrowing) {
    res.status(404).json({ error: '借阅记录不存在' })
    return
  }

  if (borrowing.status !== 'active') {
    res.status(400).json({ error: '该借阅已归还' })
    return
  }

  db.prepare('UPDATE borrowings SET status = ?, return_date = CURRENT_TIMESTAMP WHERE id = ?')
    .run('returned', borrowing.id)

  let nextReservation = null

  const waitingReservation = db
    .prepare('SELECT * FROM reservations WHERE book_id = ? AND status = ? ORDER BY position ASC LIMIT 1')
    .get(borrowing.book_id, 'waiting') as any

  if (waitingReservation) {
    db.prepare('UPDATE reservations SET status = ? WHERE id = ?').run('notified', waitingReservation.id)
    nextReservation = waitingReservation
  }

  res.json({
    message: '归还成功',
    nextReservation: nextReservation
      ? {
          id: nextReservation.id,
          user_id: nextReservation.user_id,
          book_id: nextReservation.book_id,
          position: nextReservation.position,
        }
      : null,
  })
})

export default router
