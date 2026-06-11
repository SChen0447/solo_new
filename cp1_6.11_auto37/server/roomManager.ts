import type { Shape, User, HistoryEntry, RoomState } from '../src/types'

const MAX_HISTORY = 50
const TRIM_BATCH = 10

interface RoomData {
  shapes: Shape[]
  users: Map<string, User>
  history: HistoryEntry[]
  historyStart: number
  historyCount: number
  historyIndex: number
}

export class RoomManager {
  private rooms: Map<string, RoomData> = new Map()

  private ensureRoom(roomId: string): RoomData {
    if (!this.rooms.has(roomId)) {
      const initialEntry: HistoryEntry = {
        snapshot: [],
        timestamp: Date.now(),
        userId: 'system',
      }
      const history = new Array(MAX_HISTORY)
      history[0] = initialEntry
      this.rooms.set(roomId, {
        shapes: [],
        users: new Map(),
        history,
        historyStart: 0,
        historyCount: 1,
        historyIndex: 0,
      })
    }
    return this.rooms.get(roomId)!
  }

  private getHistoryAt(room: RoomData, index: number): HistoryEntry {
    const pos = (room.historyStart + index) % MAX_HISTORY
    return room.history[pos]
  }

  private setHistoryAt(room: RoomData, index: number, entry: HistoryEntry): void {
    const pos = (room.historyStart + index) % MAX_HISTORY
    room.history[pos] = entry
  }

  private trimHistoryIfNeeded(room: RoomData): void {
    if (room.historyCount > MAX_HISTORY + TRIM_BATCH) {
      const overflow = room.historyCount - MAX_HISTORY
      room.historyStart = (room.historyStart + overflow) % MAX_HISTORY
      room.historyCount = MAX_HISTORY
      room.historyIndex -= overflow
    }
  }

  getRoomState(roomId: string): RoomState {
    const room = this.ensureRoom(roomId)
    const users: Record<string, User> = {}
    room.users.forEach((user, id) => {
      users[id] = user
    })
    return {
      shapes: [...room.shapes],
      users,
    }
  }

  getUsers(roomId: string): Record<string, User> {
    const room = this.ensureRoom(roomId)
    const users: Record<string, User> = {}
    room.users.forEach((user, id) => {
      users[id] = user
    })
    return users
  }

  getShapes(roomId: string): Shape[] {
    const room = this.ensureRoom(roomId)
    return [...room.shapes]
  }

  addUser(roomId: string, user: User): boolean {
    const room = this.ensureRoom(roomId)
    const isFirst = room.users.size === 0
    room.users.set(user.id, user)
    return isFirst
  }

  removeUser(roomId: string, userId: string): void {
    const room = this.rooms.get(roomId)
    if (room) {
      room.users.delete(userId)
      if (room.users.size === 0) {
        setTimeout(() => {
          const r = this.rooms.get(roomId)
          if (r && r.users.size === 0) {
            this.rooms.delete(roomId)
          }
        }, 60000)
      }
    }
  }

  private pushHistory(roomId: string, userId: string): void {
    const room = this.ensureRoom(roomId)
    const snapshot = JSON.parse(JSON.stringify(room.shapes)) as Shape[]

    if (room.historyIndex < room.historyCount - 1) {
      room.historyCount = room.historyIndex + 1
    }

    const newEntry: HistoryEntry = {
      snapshot,
      timestamp: Date.now(),
      userId,
    }

    if (room.historyCount >= MAX_HISTORY) {
      room.historyStart = (room.historyStart + 1) % MAX_HISTORY
    } else {
      room.historyCount++
    }

    room.historyIndex = room.historyCount - 1
    this.setHistoryAt(room, room.historyIndex, newEntry)

    this.trimHistoryIfNeeded(room)
  }

  addShape(roomId: string, shape: Shape, userId: string): Shape[] {
    const room = this.ensureRoom(roomId)
    room.shapes.push(shape)
    this.pushHistory(roomId, userId)
    return [...room.shapes]
  }

  updateShape(
    roomId: string,
    shapeId: string,
    updates: Partial<Shape>,
    userId: string
  ): Shape[] | null {
    const room = this.ensureRoom(roomId)
    const idx = room.shapes.findIndex((s) => s.id === shapeId)
    if (idx === -1) return null
    room.shapes[idx] = { ...room.shapes[idx], ...updates } as Shape
    this.pushHistory(roomId, userId)
    return [...room.shapes]
  }

  deleteShape(roomId: string, shapeId: string, userId: string): Shape[] {
    const room = this.ensureRoom(roomId)
    room.shapes = room.shapes.filter((s) => s.id !== shapeId)
    this.pushHistory(roomId, userId)
    return [...room.shapes]
  }

  undo(roomId: string, userId: string): Shape[] | null {
    const room = this.ensureRoom(roomId)
    if (room.historyIndex <= 0) return null

    room.historyIndex -= 1
    const entry = this.getHistoryAt(room, room.historyIndex)
    room.shapes = JSON.parse(JSON.stringify(entry.snapshot)) as Shape[]

    const undoEntry: HistoryEntry = {
      snapshot: JSON.parse(JSON.stringify(room.shapes)),
      timestamp: Date.now(),
      userId,
    }

    if (room.historyIndex < room.historyCount - 1) {
      this.setHistoryAt(room, room.historyIndex + 1, undoEntry)
    }

    return [...room.shapes]
  }

  redo(roomId: string, userId: string): Shape[] | null {
    const room = this.ensureRoom(roomId)
    if (room.historyIndex >= room.historyCount - 1) return null

    room.historyIndex += 1
    const entry = this.getHistoryAt(room, room.historyIndex)
    room.shapes = JSON.parse(JSON.stringify(entry.snapshot)) as Shape[]
    return [...room.shapes]
  }

  canUndo(roomId: string): boolean {
    const room = this.ensureRoom(roomId)
    return room.historyIndex > 0
  }

  canRedo(roomId: string): boolean {
    const room = this.ensureRoom(roomId)
    return room.historyIndex < room.historyCount - 1
  }
}

export const roomManager = new RoomManager()
