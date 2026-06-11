export type ShapeType = 'path' | 'rect' | 'circle' | 'sticky'

export interface Point {
  x: number
  y: number
}

export interface BaseShape {
  id: string
  type: ShapeType
  x: number
  y: number
  rotation: number
  scaleX: number
  scaleY: number
  userId: string
  userName: string
  userColor: string
  createdAt: number
}

export interface PathShape extends BaseShape {
  type: 'path'
  points: Point[]
  color: string
  strokeWidth: number
}

export interface RectShape extends BaseShape {
  type: 'rect'
  width: number
  height: number
  color: string
  strokeWidth: number
  fill: string | null
}

export interface CircleShape extends BaseShape {
  type: 'circle'
  radiusX: number
  radiusY: number
  color: string
  strokeWidth: number
  fill: string | null
}

export interface StickyShape extends BaseShape {
  type: 'sticky'
  text: string
  width: number
  height: number
  fontSize: number
  bgColor: string
  textColor: string
}

export type Shape = PathShape | RectShape | CircleShape | StickyShape

export interface User {
  id: string
  name: string
  color: string
  joinedAt: number
}

export type ToolType = 'select' | 'pen' | 'rect' | 'circle' | 'sticky'

export type WSMessageType =
  | 'join'
  | 'leave'
  | 'user_list'
  | 'shapes_snapshot'
  | 'shape_add'
  | 'shape_update'
  | 'shape_delete'
  | 'undo'
  | 'redo'
  | 'history_snapshot'
  | 'ping'
  | 'pong'

export interface WSMessage {
  type: WSMessageType
  roomId: string
  userId?: string
  payload?: any
  timestamp: number
}

export interface RoomState {
  shapes: Shape[]
  users: Record<string, User>
}

export interface HistoryEntry {
  snapshot: Shape[]
  timestamp: number
  userId: string
}
