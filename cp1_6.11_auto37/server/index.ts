import express from 'express'
import { createServer } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'
import { Packr } from 'msgpackr'
import { roomManager } from './roomManager'
import type { WSMessage, User, Shape } from '../src/types'

const packr = new Packr({ structuredClone: true })

const app = express()
app.use(cors())
app.use(express.json())

const server = createServer(app)
const wss = new WebSocketServer({ server, path: '/ws' })

interface WSClient extends WebSocket {
  userId?: string
  roomId?: string
  isAlive?: boolean
}

const clients: Map<string, Set<WSClient>> = new Map()

function broadcastToRoom(roomId: string, message: WSMessage, excludeUserId?: string) {
  const roomClients = clients.get(roomId)
  if (!roomClients) return
  const data = packr.pack(message)
  roomClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client.userId !== excludeUserId) {
      client.send(data)
    }
  })
}

function sendToClient(client: WSClient, message: WSMessage) {
  if (client.readyState === WebSocket.OPEN) {
    const data = packr.pack(message)
    client.send(data)
  }
}

function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let id = ''
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)]
  }
  return id
}

app.get('/api/room/create', (_req, res) => {
  let roomId: string
  do {
    roomId = generateRoomId()
  } while (clients.has(roomId))
  res.json({ roomId })
})

app.get('/api/room/:roomId/exists', (req, res) => {
  const exists = clients.has(req.params.roomId) || roomManager['rooms'].has(req.params.roomId)
  res.json({ exists })
})

wss.on('connection', (ws: WSClient) => {
  ws.isAlive = true

  ws.on('pong', () => {
    ws.isAlive = true
  })

  ws.on('message', (raw) => {
    try {
      const msg = packr.unpack(Buffer.from(raw as Uint8Array)) as WSMessage
      handleMessage(ws, msg)
    } catch (e) {
      console.error('Failed to unpack message:', e)
    }
  })

  ws.on('close', () => {
    handleDisconnect(ws)
  })

  ws.on('error', () => {
    handleDisconnect(ws)
  })
})

function handleMessage(ws: WSClient, msg: WSMessage) {
  const { type, roomId, userId, payload, timestamp } = msg

  switch (type) {
    case 'join': {
      const user: User = payload.user
      ws.userId = user.id
      ws.roomId = roomId

      if (!clients.has(roomId)) {
        clients.set(roomId, new Set())
      }
      clients.get(roomId)!.add(ws)

      roomManager.addUser(roomId, user)

      sendToClient(ws, {
        type: 'shapes_snapshot',
        roomId,
        payload: { shapes: roomManager.getShapes(roomId) },
        timestamp: Date.now(),
      })

      const users = roomManager.getUsers(roomId)
      broadcastToRoom(roomId, {
        type: 'user_list',
        roomId,
        payload: { users },
        timestamp: Date.now(),
      })
      break
    }

    case 'leave': {
      handleDisconnect(ws)
      break
    }

    case 'shape_add': {
      if (!roomId || !userId) return
      const shape: Shape = payload.shape
      roomManager.addShape(roomId, shape, userId)
      broadcastToRoom(roomId, {
        type: 'shape_add',
        roomId,
        userId,
        payload: { shape },
        timestamp,
      })
      break
    }

    case 'shape_update': {
      if (!roomId || !userId) return
      const { shapeId, updates } = payload
      roomManager.updateShape(roomId, shapeId, updates, userId)
      broadcastToRoom(roomId, {
        type: 'shape_update',
        roomId,
        userId,
        payload: { shapeId, updates },
        timestamp,
      })
      break
    }

    case 'shape_delete': {
      if (!roomId || !userId) return
      const { shapeId } = payload
      roomManager.deleteShape(roomId, shapeId, userId)
      broadcastToRoom(roomId, {
        type: 'shape_delete',
        roomId,
        userId,
        payload: { shapeId },
        timestamp,
      })
      break
    }

    case 'undo': {
      if (!roomId || !userId) return
      const shapes = roomManager.undo(roomId, userId)
      if (shapes) {
        broadcastToRoom(roomId, {
          type: 'history_snapshot',
          roomId,
          userId,
          payload: { shapes, action: 'undo' },
          timestamp: Date.now(),
        })
      }
      break
    }

    case 'redo': {
      if (!roomId || !userId) return
      const shapes = roomManager.redo(roomId, userId)
      if (shapes) {
        broadcastToRoom(roomId, {
          type: 'history_snapshot',
          roomId,
          userId,
          payload: { shapes, action: 'redo' },
          timestamp: Date.now(),
        })
      }
      break
    }

    case 'ping': {
      sendToClient(ws, { type: 'pong', roomId: roomId || '', timestamp: Date.now() })
      break
    }
  }
}

function handleDisconnect(ws: WSClient) {
  const roomId = ws.roomId
  const userId = ws.userId

  if (roomId && userId) {
    const roomClients = clients.get(roomId)
    if (roomClients) {
      roomClients.delete(ws)
      if (roomClients.size === 0) {
        clients.delete(roomId)
      }
    }

    roomManager.removeUser(roomId, userId)

    const users = roomManager.getUsers(roomId)
    broadcastToRoom(roomId, {
      type: 'user_list',
      roomId,
      payload: { users },
      timestamp: Date.now(),
    })
  }
}

setInterval(() => {
  wss.clients.forEach((ws) => {
    const client = ws as WSClient
    if (client.isAlive === false) {
      handleDisconnect(client)
      client.terminate()
      return
    }
    client.isAlive = false
    try {
      client.ping()
    } catch (_e) {
      handleDisconnect(client)
    }
  })
}, 30000)

const PORT = 3001
server.listen(PORT, () => {
  console.log(`[server] Server running on http://localhost:${PORT}`)
  console.log(`[server] WebSocket on ws://localhost:${PORT}/ws`)
})
