import type { HistoryAction, SyncMessage, BoardElement } from '../types'

const WS_URL = 'ws://localhost:8080'
const MAX_RECONNECT_ATTEMPTS = 10
const RECONNECT_DELAY_BASE = 500

type Listener = (msg: SyncMessage) => void

export interface WebSocketClient {
  connect: () => void
  disconnect: () => void
  sendAction: (action: HistoryAction) => void
  sendCursor: (x: number, y: number) => void
  subscribe: (listener: Listener) => () => void
  getUserId: () => string
  isConnected: () => boolean
}

export function createWebSocketClient(): WebSocketClient {
  let ws: WebSocket | null = null
  let reconnectAttempts = 0
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let connected = false
  const userId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const listeners = new Set<Listener>()

  const pendingActions: HistoryAction[] = []
  let cursorThrottleTimer: ReturnType<typeof setTimeout> | null = null
  let pendingCursor: { x: number; y: number } | null = null

  function notifyListeners(msg: SyncMessage) {
    for (const l of listeners) {
      try {
        l(msg)
      } catch (e) {
        console.warn('[ws] listener error:', e)
      }
    }
  }

  function scheduleReconnect() {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('[ws] Max reconnect attempts reached, giving up')
      return
    }
    reconnectAttempts++
    const delay = RECONNECT_DELAY_BASE * Math.pow(1.5, reconnectAttempts - 1)
    console.log(`[ws] Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`)
    reconnectTimer = setTimeout(connect, delay)
  }

  function flushPendingActions() {
    while (pendingActions.length > 0 && ws && ws.readyState === WebSocket.OPEN) {
      const action = pendingActions.shift()!
      sendAction(action)
    }
  }

  function connect() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      return
    }
    try {
      ws = new WebSocket(WS_URL)
    } catch (e) {
      console.warn('[ws] Failed to create WebSocket:', e)
      scheduleReconnect()
      return
    }

    ws.onopen = () => {
      console.log('[ws] Connected')
      connected = true
      reconnectAttempts = 0
      flushPendingActions()
    }

    ws.onmessage = (event) => {
      try {
        const msg: SyncMessage = JSON.parse(event.data)
        notifyListeners(msg)
      } catch (e) {
        console.warn('[ws] Failed to parse server message:', e)
      }
    }

    ws.onclose = (event) => {
      console.log(`[ws] Disconnected (code=${event.code})`)
      connected = false
      ws = null
      scheduleReconnect()
    }

    ws.onerror = (err) => {
      console.warn('[ws] WebSocket error:', err)
    }
  }

  function disconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    reconnectAttempts = MAX_RECONNECT_ATTEMPTS
    if (ws) {
      ws.close()
      ws = null
    }
    connected = false
  }

  function sendAction(action: HistoryAction) {
    const msg: SyncMessage = { type: 'ACTION', action, senderId: userId }
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg))
    } else {
      pendingActions.push(action)
      if (!ws || ws.readyState === WebSocket.CLOSED) {
        connect()
      }
    }
  }

  function sendCursor(x: number, y: number) {
    pendingCursor = { x, y }
    if (cursorThrottleTimer) return
    cursorThrottleTimer = setTimeout(() => {
      cursorThrottleTimer = null
      if (!pendingCursor) return
      const { x, y } = pendingCursor
      pendingCursor = null
      if (ws && ws.readyState === WebSocket.OPEN) {
        const msg: SyncMessage = { type: 'CURSOR', userId, x, y }
        ws.send(JSON.stringify(msg))
      }
    }, 50)
  }

  function subscribe(listener: Listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  return {
    connect,
    disconnect,
    sendAction,
    sendCursor,
    subscribe,
    getUserId: () => userId,
    isConnected: () => connected
  }
}
