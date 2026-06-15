import type { Server as SocketIOServer } from 'socket.io'
import { auctions, coffees, getAuction, addVoucher, addBid } from './store.js'

type AuctionEventCallback = (event: string, data: unknown) => void

let eventCallback: AuctionEventCallback | null = null
let intervalId: ReturnType<typeof setInterval> | null = null

export function onAuctionEvent(cb: AuctionEventCallback): void {
  eventCallback = cb
}

function emitEvent(event: string, data: unknown): void {
  if (eventCallback) {
    eventCallback(event, data)
  }
}

export function validateBid(auctionId: string, amount: number, userId: string): { valid: boolean; error?: string } {
  const auction = getAuction(auctionId)
  if (!auction) {
    return { valid: false, error: '拍卖不存在' }
  }
  if (auction.status !== 'active') {
    return { valid: false, error: '拍卖未在进行中' }
  }
  if (amount <= auction.currentPrice + 5) {
    return { valid: false, error: `出价必须高于当前价格 ¥${auction.currentPrice} 至少 ¥5` }
  }
  if (auction.currentBidderId === userId) {
    return { valid: false, error: '您已经是当前最高出价者' }
  }
  return { valid: true }
}

export function placeBid(auctionId: string, amount: number, userId: string, username: string) {
  const result = validateBid(auctionId, amount, userId)
  if (!result.valid) {
    return { success: false, error: result.error }
  }
  const bid = addBid(auctionId, userId, username, amount)
  const auction = getAuction(auctionId)!

  emitEvent('bid_update', {
    auctionId,
    bid,
    auction: {
      currentPrice: auction.currentPrice,
      currentBidderId: auction.currentBidderId,
      currentBidderName: auction.currentBidderName,
    },
  })

  return { success: true, bid }
}

function checkAuctions(): void {
  const now = Date.now()

  for (const [id, auction] of auctions) {
    const startTime = new Date(auction.startTime).getTime()
    const endTime = new Date(auction.endTime).getTime()

    if (auction.status === 'upcoming' && now >= startTime) {
      auction.status = 'active'
      emitEvent('auction_started', { auctionId: id, auction })
    }

    if (auction.status === 'active' && now >= endTime) {
      auction.status = 'ended'

      if (auction.currentBidderId) {
        const coffee = coffees.get(auction.coffeeId)
        const voucher = addVoucher(
          id,
          coffee ? coffee.name : '未知咖啡',
          auction.currentBidderId,
        )
        emitEvent('auction_ended', {
          auctionId: id,
          winnerId: auction.currentBidderId,
          winnerName: auction.currentBidderName,
          finalPrice: auction.currentPrice,
          voucher,
        })
      } else {
        emitEvent('auction_ended', {
          auctionId: id,
          winnerId: null,
          winnerName: null,
          finalPrice: auction.currentPrice,
          voucher: null,
        })
      }
    }
  }
}

export function startEngine(io: SocketIOServer): void {
  onAuctionEvent((event, data) => {
    if (event === 'bid_update') {
      const { auctionId } = data as { auctionId: string }
      io.to(`auction:${auctionId}`).emit('bid_update', data)
    } else if (event === 'auction_started') {
      const { auctionId } = data as { auctionId: string }
      io.to(`auction:${auctionId}`).emit('auction_started', data)
      io.emit('auction_status_changed', data)
    } else if (event === 'auction_ended') {
      const { auctionId } = data as { auctionId: string }
      io.to(`auction:${auctionId}`).emit('auction_ended', data)
      io.emit('auction_status_changed', data)
    }
  })

  intervalId = setInterval(() => {
    checkAuctions()
  }, 1000)

  console.log('Auction engine started')
}

export function stopEngine(): void {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
}
