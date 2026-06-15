import { Router, type Request, type Response } from 'express'
import { addUser, getUser, getUserByEmail, getBidsByUser, getVouchersByUser } from '../store.js'

const router = Router()

function authenticate(req: Request): { id: string } | null {
  const authHeader = req.headers.authorization
  if (!authHeader) return null
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader
  const user = getUser(token)
  return user ? { id: user.id } : null
}

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { email, username, password } = req.body

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ success: false, error: '请输入有效的邮箱地址' })
    return
  }

  if (!username || username.length < 2 || username.length > 12) {
    res.status(400).json({ success: false, error: '用户名长度需为2-12个字符' })
    return
  }

  if (!password || password.length < 1) {
    res.status(400).json({ success: false, error: '请输入密码' })
    return
  }

  const existing = getUserByEmail(email)
  if (existing) {
    res.status(409).json({ success: false, error: '该邮箱已被注册' })
    return
  }

  const user = addUser(email, username, password)
  res.status(201).json({ success: true, user, token: user.id })
})

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body

  if (!email || !password) {
    res.status(400).json({ success: false, error: '请输入邮箱和密码' })
    return
  }

  const user = getUserByEmail(email)
  if (!user || user.password !== password) {
    res.status(401).json({ success: false, error: '邮箱或密码错误' })
    return
  }

  res.json({ success: true, user, token: user.id })
})

router.get('/me', async (req: Request, res: Response): Promise<void> => {
  const auth = authenticate(req)
  if (!auth) {
    res.status(401).json({ success: false, error: '未授权' })
    return
  }

  const user = getUser(auth.id)
  if (!user) {
    res.status(404).json({ success: false, error: '用户不存在' })
    return
  }

  res.json({ success: true, user })
})

router.get('/me/bids', async (req: Request, res: Response): Promise<void> => {
  const auth = authenticate(req)
  if (!auth) {
    res.status(401).json({ success: false, error: '未授权' })
    return
  }

  const userBids = getBidsByUser(auth.id)
  res.json({ success: true, bids: userBids })
})

router.get('/me/vouchers', async (req: Request, res: Response): Promise<void> => {
  const auth = authenticate(req)
  if (!auth) {
    res.status(401).json({ success: false, error: '未授权' })
    return
  }

  const userVouchers = getVouchersByUser(auth.id)
  res.json({ success: true, vouchers: userVouchers })
})

export default router
