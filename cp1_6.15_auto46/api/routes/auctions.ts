import { Router, type Request, type Response } from 'express'
import { auctions, coffees, getAuction, getCoffee, getUser, getBidsByAuction } from '../store.js'
import { placeBid } from '../auctionEngine.js'

const router = Router()

function authenticate(req: Request): { id: string } | null {
  const authHeader = req.headers.authorization
  if (!authHeader) return null
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader
  const user = getUser(token)
  return user ? { id: user.id } : null
}

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const result = []
  for (const auction of auctions.values()) {
    const coffee = coffees.get(auction.coffeeId)
    result.push({ ...auction, coffee: coffee || null })
  }
  res.json({ success: true, auctions: result })
})

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const auction = getAuction(req.params.id)
  if (!auction) {
    res.status(404).json({ success: false, error: '拍卖不存在' })
    return
  }

  const coffee = getCoffee(auction.coffeeId)
  const auctionBids = getBidsByAuction(auction.id)

  res.json({
    success: true,
    auction: { ...auction, coffee: coffee || null },
    bids: auctionBids,
  })
})

router.post('/:id/bids', async (req: Request, res: Response): Promise<void> => {
  const auth = authenticate(req)
  if (!auth) {
    res.status(401).json({ success: false, error: '未授权' })
    return
  }

  const user = getUser(auth.id)
  if (!user) {
    res.status(401).json({ success: false, error: '用户不存在' })
    return
  }

  const { amount } = req.body
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    res.status(400).json({ success: false, error: '请输入有效的出价金额' })
    return
  }

  const result = placeBid(req.params.id, amount, user.id, user.username)
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error })
    return
  }

  res.status(201).json({ success: true, bid: result.bid })
})

export default router
