import { v4 as uuidv4 } from 'uuid'

export interface User {
  id: string
  email: string
  username: string
  password: string
  createdAt: string
}

export interface Coffee {
  id: string
  name: string
  roastLevel: 'light' | 'medium' | 'dark'
  description: string
}

export interface Auction {
  id: string
  coffeeId: string
  startingPrice: number
  currentPrice: number
  currentBidderId: string | null
  currentBidderName: string | null
  startTime: string
  endTime: string
  status: 'upcoming' | 'active' | 'ended'
}

export interface Bid {
  id: string
  auctionId: string
  userId: string
  username: string
  amount: number
  createdAt: string
}

export interface Voucher {
  id: string
  code: string
  auctionId: string
  coffeeName: string
  userId: string
  createdAt: string
}

export const users = new Map<string, User>()
export const coffees = new Map<string, Coffee>()
export const auctions = new Map<string, Auction>()
export const bids = new Map<string, Bid>()
export const vouchers = new Map<string, Voucher>()

export function getUser(id: string): User | undefined {
  return users.get(id)
}

export function getUserByEmail(email: string): User | undefined {
  for (const user of users.values()) {
    if (user.email === email) return user
  }
  return undefined
}

export function getCoffee(id: string): Coffee | undefined {
  return coffees.get(id)
}

export function getAuction(id: string): Auction | undefined {
  return auctions.get(id)
}

export function getBidsByAuction(auctionId: string): Bid[] {
  const result: Bid[] = []
  for (const bid of bids.values()) {
    if (bid.auctionId === auctionId) result.push(bid)
  }
  return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function getBidsByUser(userId: string): Bid[] {
  const result: Bid[] = []
  for (const bid of bids.values()) {
    if (bid.userId === userId) result.push(bid)
  }
  return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function getVouchersByUser(userId: string): Voucher[] {
  const result: Voucher[] = []
  for (const v of vouchers.values()) {
    if (v.userId === userId) result.push(v)
  }
  return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function addBid(auctionId: string, userId: string, username: string, amount: number): Bid {
  const bid: Bid = {
    id: uuidv4(),
    auctionId,
    userId,
    username,
    amount,
    createdAt: new Date().toISOString(),
  }
  bids.set(bid.id, bid)
  const auction = auctions.get(auctionId)!
  auction.currentPrice = amount
  auction.currentBidderId = userId
  auction.currentBidderName = username
  return bid
}

export function addVoucher(auctionId: string, coffeeName: string, userId: string): Voucher {
  const voucher: Voucher = {
    id: uuidv4(),
    code: generateVoucherCode(),
    auctionId,
    coffeeName,
    userId,
    createdAt: new Date().toISOString(),
  }
  vouchers.set(voucher.id, voucher)
  return voucher
}

export function addUser(email: string, username: string, password: string): User {
  const user: User = {
    id: uuidv4(),
    email,
    username,
    password,
    createdAt: new Date().toISOString(),
  }
  users.set(user.id, user)
  return user
}

function generateVoucherCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

function initSampleData() {
  const sampleCoffees: Coffee[] = [
    { id: uuidv4(), name: '焦糖榛果拿铁', roastLevel: 'medium', description: '浓郁焦糖与榛果的完美融合，丝滑拿铁的经典之选' },
    { id: uuidv4(), name: '蜜桃乌龙冰萃', roastLevel: 'light', description: '清甜蜜桃与醇香乌龙的清爽碰撞，冰萃工艺锁住鲜果风味' },
    { id: uuidv4(), name: '黑芝麻豆乳咖啡', roastLevel: 'dark', description: '传统黑芝麻遇上现代豆乳，浓郁深邃的东方韵味' },
    { id: uuidv4(), name: '桂花酒酿拿铁', roastLevel: 'medium', description: '江南桂花飘香，微醺酒酿与拿铁的浪漫邂逅' },
    { id: uuidv4(), name: '玫瑰荔枝冷萃', roastLevel: 'light', description: '保加利亚玫瑰与岭南荔枝，冷萃工艺呈现花果清韵' },
    { id: uuidv4(), name: '伯爵红茶玛奇朵', roastLevel: 'dark', description: '英伦伯爵红茶与意式玛奇朵的跨界交融，茶香四溢' },
  ]

  for (const coffee of sampleCoffees) {
    coffees.set(coffee.id, coffee)
  }

  const now = Date.now()
  const prices = [28, 35, 42, 48, 58, 68]
  const startOffsets = [-5 * 60 * 1000, -3 * 60 * 1000, -1 * 60 * 1000, 2 * 60 * 1000, 5 * 60 * 1000, 8 * 60 * 1000]
  const duration = 15 * 60 * 1000

  for (let i = 0; i < sampleCoffees.length; i++) {
    const coffee = sampleCoffees[i]
    const startTime = new Date(now + startOffsets[i]).toISOString()
    const endTime = new Date(now + startOffsets[i] + duration).toISOString()
    const status: Auction['status'] = startOffsets[i] <= 0 ? 'active' : 'upcoming'

    const auction: Auction = {
      id: uuidv4(),
      coffeeId: coffee.id,
      startingPrice: prices[i],
      currentPrice: prices[i],
      currentBidderId: null,
      currentBidderName: null,
      startTime,
      endTime,
      status,
    }
    auctions.set(auction.id, auction)
  }
}

initSampleData()
