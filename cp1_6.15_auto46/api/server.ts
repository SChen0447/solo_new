import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import app from './app.js'
import { startEngine, stopEngine, placeBid } from './auctionEngine.js'
import { getUser } from './store.js'

const PORT = process.env.PORT || 3001

const httpServer = createServer(app)

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`)

  socket.on('join_auction', (auctionId: string) => {
    socket.join(`auction:${auctionId}`)
    console.log(`Socket ${socket.id} joined auction:${auctionId}`)
  })

  socket.on('leave_auction', (auctionId: string) => {
    socket.leave(`auction:${auctionId}`)
    console.log(`Socket ${socket.id} left auction:${auctionId}`)
  })

  socket.on('place_bid', (data: { auctionId: string; amount: number; token: string }) => {
    const user = getUser(data.token)
    if (!user) {
      socket.emit('bid_error', { error: '未授权' })
      return
    }

    const result = placeBid(data.auctionId, data.amount, user.id, user.username)
    if (!result.success) {
      socket.emit('bid_error', { error: result.error })
    }
  })

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`)
  })
})

startEngine(io)

httpServer.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`)
})

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received')
  stopEngine()
  httpServer.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('SIGINT signal received')
  stopEngine()
  httpServer.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

export default app
