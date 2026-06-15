export type ElementType = 'circle' | 'rectangle' | 'line' | 'text'

export interface Point {
  x: number
  y: number
}

export interface BoardElement {
  id: string
  type: ElementType
  x: number
  y: number
  width: number
  height: number
  fill?: string
  stroke?: string
  strokeWidth: number
  text?: string
  fontSize?: number
  points?: Point[]
  visible: boolean
  locked: boolean
  createdAt: number
  updatedAt: number
}

export type HistoryAction =
  | { type: 'ADD'; element: BoardElement }
  | { type: 'UPDATE'; id: string; prev: Partial<BoardElement>; next: Partial<BoardElement> }
  | { type: 'DELETE'; element: BoardElement }
  | { type: 'REORDER'; from: number; to: number }

export interface VersionSnapshot {
  id: string
  name: string
  timestamp: number
  elements: BoardElement[]
  layerOrder: string[]
}

export type SyncMessage =
  | { type: 'INIT'; elements: BoardElement[]; layerOrder: string[] }
  | { type: 'ACTION'; action: HistoryAction; senderId: string }
  | { type: 'CURSOR'; userId: string; x: number; y: number }

export type ToolType = ElementType | 'select' | 'eraser'
