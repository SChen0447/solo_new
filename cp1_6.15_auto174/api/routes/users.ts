import { Router, type Request, type Response } from 'express'
import bcrypt from 'bcryptjs'
import db from '../db.js'

const router = Router()

router.post('/register', (req: Request, res: Response): void => {
  const { username, password, display_name } = req.body

  if (!username || !password || !display_name) {
    res.status(400).json({ error: '用户名、密码和显示名为必填项' })
    return
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username) as any
  if (existing) {
    res.status(409).json({ error: '用户名已存在' })
    return
  }

  const passwordHash = bcrypt.hashSync(password, 10)
  const result = db
    .prepare('INSERT INTO users (username, password_hash, display_name) VALUES (?, ?, ?)')
    .run(username, passwordHash, display_name)

  const user = db.prepare('SELECT id, username, display_name, role, avatar, created_at FROM users WHERE id = ?').get(result.lastInsertRowid) as any

  const token = Buffer.from(String(user.id)).toString('base64')

  res.status(201).json({ user, token })
})

router.post('/login', (req: Request, res: Response): void => {
  const { username, password } = req.body

  if (!username || !password) {
    res.status(400).json({ error: '用户名和密码为必填项' })
    return
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any
  if (!user) {
    res.status(401).json({ error: '用户名或密码错误' })
    return
  }

  const valid = bcrypt.compareSync(password, user.password_hash)
  if (!valid) {
    res.status(401).json({ error: '用户名或密码错误' })
    return
  }

  const token = Buffer.from(String(user.id)).toString('base64')

  res.json({
    user: {
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      role: user.role,
      avatar: user.avatar,
      created_at: user.created_at,
    },
    token,
  })
})

router.get('/:id', (req: Request, res: Response): void => {
  const user = db
    .prepare('SELECT id, username, display_name, role, avatar, created_at FROM users WHERE id = ?')
    .get(req.params.id) as any

  if (!user) {
    res.status(404).json({ error: '用户不存在' })
    return
  }

  const borrowings = db
    .prepare(
      `SELECT b.*, bk.title as book_title, bk.author as book_author, bk.cover_url as book_cover
       FROM borrowings b JOIN books bk ON b.book_id = bk.id
       WHERE b.user_id = ? ORDER BY b.borrow_date DESC`
    )
    .all(user.id) as any[]

  const reservations = db
    .prepare(
      `SELECT r.*, bk.title as book_title, bk.author as book_author, bk.cover_url as book_cover
       FROM reservations r JOIN books bk ON r.book_id = bk.id
       WHERE r.user_id = ? ORDER BY r.created_at DESC`
    )
    .all(user.id) as any[]

  res.json({ ...user, borrowings, reservations })
})

export default router
