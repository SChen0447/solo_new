import { WebSocketServer, WebSocket } from 'ws'
import type { BoardElement, HistoryAction, SyncMessage } from '../types'

const PORT = 8080

interface PersistedState {
  elements: Record<string, BoardElement>
  layerOrder: string[]
}

const state: PersistedState = {
  elements: {},
  layerOrder: []
}

const wss = new WebSocketServer({ port: PORT })

const clients = new Map<string, { ws: WebSocket; userId: string }>()
let clientCount = 0

console.log(`[syncServer] WebSocket server starting on ws://localhost:${PORT}`)

function applyHistoryAction(action: HistoryAction): void {
  switch (action.type) {
    case 'ADD': {
      state.elements[action.element.id] = action.element
      state.layerOrder.push(action.element.id)
      break
    }
    case 'UPDATE': {
      const el = state.elements[action.id]
      if (el) {
        Object.assign(el, action.next, { updatedAt: Date.now() })
      }
      break
    }
    case 'DELETE': {
      delete state.elements[action.element.id]
      state.layerOrder = state.layerOrder.filter(id => id !== action.element.id)
      break
    }
    case 'REORDER': {
      const { from, to } = action
      if (from < 0 || from >= state.layerOrder.length) return
      if (to < 0 || to >= state.layerOrder.length) return
      const [moved] = state.layerOrder.splice(from, 1)
      state.layerOrder.splice(to, 0, moved)
      break
    }
  }
}

function broadcast(msg: SyncMessage, excludeUserId?: string): void {
  const data = JSON.stringify(msg)
  for (const { ws, userId } of clients.values()) {
    if (excludeUserId && userId === excludeUserId) continue
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data)
    }
  }
}

wss.on('connection', (ws) => {
  clientCount++
  const userId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  clients.set(userId, { ws, userId })
  console.log(`[syncServer] Client connected: ${userId} (total: ${clientCount})`)

  const initMsg: SyncMessage = {
    type: 'INIT',
    elements: state.layerOrder.map(id => state.elements[id]).filter(Boolean),
    layerOrder: [...state.layerOrder]
  }
  ws.send(JSON.stringify(initMsg))

  ws.on('message', (raw) => {
    try {
      const msg: SyncMessage = JSON.parse(raw.toString())
      if (msg.type === 'ACTION') {
        applyHistoryAction(msg.action)
        broadcast(msg, msg.senderId)
      } else if (msg.type === 'CURSOR') {
        broadcast({ ...msg, userId }, userId)
      }
    } catch (err) {
      console.warn('[syncServer] Failed to parse message:', err)
    }
  })

  ws.on('close', () => {
    clientCount--
    clients.delete(userId)
    console.log(`[syncServer] Client disconnected: ${userId} (total: ${clientCount})`)
  })

  ws.on('error', (err) => {
    console.warn(`[syncServer] Client error ${userId}:`, err.message)
  })
})

wss.on('error', (err) => {
  console.error('[syncServer] Server error:', err)
})

process.on('SIGINT', () => {
  console.log('[syncServer] Shutting down...')
  wss.close()
  process.exit(0)
})
