import { Router, type Request, type Response, type NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import db, { getRankByElo } from '../database.js'

const router = Router()
const JWT_SECRET = 'codearena-secret-2024'
const JWT_EXPIRES_IN = '7d'

declare global {
  namespace Express {
    interface Request {
      userId?: string
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'No token provided' })
    return
  }

  const token = authHeader.split(' ')[1]
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
    req.userId = decoded.userId
    next()
  } catch {
    res.status(401).json({ success: false, error: 'Invalid token' })
  }
}

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, nickname } = req.body

    if (!email || !password || !nickname) {
      res.status(400).json({ success: false, error: 'Email, password and nickname are required' })
      return
    }

    if (password.length < 6) {
      res.status(400).json({ success: false, error: 'Password must be at least 6 characters' })
      return
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
    if (existing) {
      res.status(409).json({ success: false, error: 'Email already registered' })
      return
    }

    const id = uuidv4()
    const passwordHash = await bcrypt.hash(password, 10)
    const elo = 1000
    const rank = getRankByElo(elo)

    db.prepare(
      'INSERT INTO users (id, email, password_hash, nickname, elo, rank) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, email, passwordHash, nickname, elo, rank)

    const token = jwt.sign({ userId: id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })

    res.status(201).json({
      success: true,
      token,
      user: { id, email, nickname, elo, rank, wins: 0, losses: 0 },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Registration failed' })
  }
})

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and password are required' })
      return
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any
    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid credentials' })
      return
    }

    const isValid = await bcrypt.compare(password, user.password_hash)
    if (!isValid) {
      res.status(401).json({ success: false, error: 'Invalid credentials' })
      return
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        elo: user.elo,
        rank: user.rank,
        wins: user.wins,
        losses: user.losses,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Login failed' })
  }
})

export default router
