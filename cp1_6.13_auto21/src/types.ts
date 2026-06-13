export type BubbleStyle = 'normal' | 'thought' | 'shout'

export interface Position {
  x: number
  y: number
}

export interface CharacterAsset {
  id: string
  name: string
  type: 'character'
  emoji: string
  color: string
}

export interface PropAsset {
  id: string
  name: string
  type: 'prop'
  emoji: string
}

export type Asset = CharacterAsset | PropAsset

export interface PlacedItem {
  id: string
  assetId: string
  type: 'character' | 'prop'
  emoji: string
  name: string
  position: Position
  scale: number
  rotation: number
  color?: string
  hasBubble?: boolean
  bubble?: Bubble
}

export interface Bubble {
  id: string
  text: string
  style: BubbleStyle
  position: Position
  visible: boolean
}

export interface Scene {
  id: string
  name: string
  index: number
  items: PlacedItem[]
  background: string
}

export interface ProjectData {
  version: string
  scenes: Scene[]
  createdAt: string
  updatedAt: string
}

export interface DragStartEvent {
  asset: Asset
  clientX: number
  clientY: number
}

export interface DropEvent {
  asset: Asset
  canvasX: number
  canvasY: number
}

export interface SceneSwitchEvent {
  fromIndex: number
  toIndex: number
  direction: 'left' | 'right'
}

export type EventMap = {
  'drag:start': DragStartEvent
  'drag:end': void
  'drop:item': DropEvent
  'scene:add': void
  'scene:delete': number
  'scene:switch': SceneSwitchEvent
  'scene:reorder': { fromIndex: number; toIndex: number }
  'scene:updated': Scene
  'export:request': void
  'import:request': File
  'export:progress': number
  'import:progress': number
  'export:complete': ProjectData
  'import:complete': ProjectData
  'item:update': PlacedItem
  'item:delete': string
  'bubble:style:change': { itemId: string; style: BubbleStyle }
  'bubble:text:change': { itemId: string; text: string }
  'bubble:position:change': { itemId: string; position: Position }
  'performance:metric': { name: string; value: number; unit: string }
}
