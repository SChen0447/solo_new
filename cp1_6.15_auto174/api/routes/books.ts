import { Router, type Request, type Response } from 'express'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import db from '../db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const uploadDir = path.join(__dirname, '..', 'uploads')

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, allowed.includes(ext))
  },
})

const router = Router()

function getBookStatus(bookId: number, quantity: number): string {
  const activeBorrowings = db
    .prepare('SELECT COUNT(*) as count FROM borrowings WHERE book_id = ? AND status = ?')
    .get(bookId, 'active') as { count: number }
  const available = quantity - activeBorrowings.count
  if (available > 0) return 'available'
  const hasReservation = db
    .prepare('SELECT COUNT(*) as count FROM reservations WHERE book_id = ? AND status = ?')
    .get(bookId, 'waiting') as { count: number }
  return hasReservation.count > 0 ? 'reserved' : 'borrowed'
}

router.get('/', (req: Request, res: Response): void => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1)
  const pageSize = Math.max(1, Math.min(100, parseInt(req.query.pageSize as string) || 10))
  const search = (req.query.search as string) || ''
  const status = (req.query.status as string) || ''

  let whereClause = 'WHERE 1=1'
  const params: unknown[] = []

  if (search) {
    whereClause += ' AND (b.title LIKE ? OR b.author LIKE ? OR b.isbn LIKE ?)'
    const keyword = `%${search}%`
    params.push(keyword, keyword, keyword)
  }

  if (status) {
    whereClause += ' AND b.id IN (SELECT id FROM books)'
  }

  const countRow = db
    .prepare(`SELECT COUNT(*) as total FROM books b ${whereClause}`)
    .get(...params) as { total: number }

  const offset = (page - 1) * pageSize
  const books = db
    .prepare(
      `SELECT b.* FROM books b ${whereClause} ORDER BY b.created_at DESC LIMIT ? OFFSET ?`
    )
    .all(...params, pageSize, offset) as any[]

  const booksWithStatus = books.map((book) => ({
    ...book,
    status: getBookStatus(book.id, book.quantity),
  }))

  let filtered = booksWithStatus
  if (status) {
    filtered = booksWithStatus.filter((b) => b.status === status)
  }

  res.json({
    books: filtered,
    total: status ? filtered.length : countRow.total,
    page,
    pageSize,
  })
})

router.get('/:id', (req: Request, res: Response): void => {
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id) as any

  if (!book) {
    res.status(404).json({ error: '书籍不存在' })
    return
  }

  const reviews = db
    .prepare(
      `SELECT r.*, u.display_name, u.avatar FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.book_id = ? AND r.status = 'approved' ORDER BY r.created_at DESC LIMIT 3`
    )
    .all(book.id) as any[]

  const activeBorrowings = db
    .prepare('SELECT COUNT(*) as count FROM borrowings WHERE book_id = ? AND status = ?')
    .get(book.id, 'active') as { count: number }

  const waitingReservations = db
    .prepare('SELECT COUNT(*) as count FROM reservations WHERE book_id = ? AND status = ?')
    .get(book.id, 'waiting') as { count: number }

  const available = book.quantity - activeBorrowings.count

  res.json({
    ...book,
    status: available > 0 ? 'available' : waitingReservations.count > 0 ? 'reserved' : 'borrowed',
    available,
    reviews,
  })
})

router.post('/', upload.single('cover'), (req: Request, res: Response): void => {
  const { title, author, description, isbn, quantity, qr_code } = req.body

  if (!title || !author) {
    res.status(400).json({ error: '书名和作者为必填项' })
    return
  }

  const coverUrl = req.file ? `/uploads/${req.file.filename}` : ''

  const result = db
    .prepare(
      'INSERT INTO books (title, author, description, isbn, cover_url, quantity, qr_code) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    .run(title, author, description || '', isbn || '', coverUrl, parseInt(quantity) || 1, qr_code || '')

  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(result.lastInsertRowid) as any

  res.status(201).json({
    ...book,
    status: getBookStatus(book.id, book.quantity),
  })
})

export default router
