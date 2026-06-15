import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type {
  BoardElement,
  ElementType,
  HistoryAction,
  ToolType,
  VersionSnapshot
} from '../types'

const MAX_HISTORY_STEPS = 50
const SNAPSHOT_INTERVAL = 10
const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FF8C42', '#6C5CE7']
let colorIdx = 0
function nextColor() {
  const c = COLORS[colorIdx % COLORS.length]
  colorIdx++
  return c
}

interface WhiteboardState {
  // Data
  elements: Record<string, BoardElement>
  layerOrder: string[]

  // Tool
  activeTool: ToolType
  selectedId: string | null
  strokeColor: string
  strokeWidth: number
  fillColor: string | undefined
  fontSize: number

  // View
  zoom: number
  panX: number
  panY: number

  // History
  historyStack: HistoryAction[]
  historyIndex: number
  snapshots: VersionSnapshot[]
  operationsSinceSnapshot: number

  // Remote peers cursors
  remoteCursors: Record<string, { x: number; y: number; lastSeen: number }>

  // ===== Actions =====

  // Tool
  setActiveTool: (tool: ToolType) => void
  setSelectedId: (id: string | null) => void
  setStrokeColor: (c: string) => void
  setStrokeWidth: (w: number) => void
  setFillColor: (c: string | undefined) => void

  // Viewport
  setZoom: (zoom: number) => void
  setPan: (x: number, y: number) => void
  panBy: (dx: number, dy: number) => void
  zoomAt: (factor: number, cx: number, cy: number) => void

  // Element operations
  addElement: (element: BoardElement, fromRemote?: boolean) => void
  createElement: (partial: Partial<BoardElement> & { type: ElementType }) => BoardElement
  updateElement: (id: string, patch: Partial<BoardElement>, fromRemote?: boolean) => void
  deleteElement: (id: string, fromRemote?: boolean) => void
  reorderLayer: (from: number, to: number, fromRemote?: boolean) => void
  moveLayerToTop: (id: string) => void
  moveLayerToBottom: (id: string) => void
  toggleLayerVisible: (id: string) => void
  toggleLayerLocked: (id: string) => void

  // Init from remote
  initFromRemote: (elements: BoardElement[], layerOrder: string[]) => void

  // Cursor
  updateRemoteCursor: (userId: string, x: number, y: number) => void

  // History
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean

  // Snapshots
  takeSnapshot: (name?: string) => void
  restoreSnapshot: (snapshotId: string) => void

  // Internal helper
  _pushHistory: (action: HistoryAction, fromRemote?: boolean) => void
}

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v))
}

function applyAction(
  elements: Record<string, BoardElement>,
  layerOrder: string[],
  action: HistoryAction
): { elements: Record<string, BoardElement>; layerOrder: string[] } {
  const nextEls = { ...elements }
  let nextOrder = layerOrder

  switch (action.type) {
    case 'ADD': {
      nextEls[action.element.id] = deepClone(action.element)
      nextOrder = [...nextOrder, action.element.id]
      break
    }
    case 'UPDATE': {
      const el = nextEls[action.id]
      if (el) {
        nextEls[action.id] = { ...el, ...action.next, updatedAt: Date.now() }
      }
      break
    }
    case 'DELETE': {
      const idx = nextOrder.indexOf(action.element.id)
      if (idx >= 0) {
        nextOrder = [...nextOrder.slice(0, idx), ...nextOrder.slice(idx + 1)]
      }
      delete nextEls[action.element.id]
      break
    }
    case 'REORDER': {
      const { from, to } = action
      if (from < 0 || from >= nextOrder.length) break
      if (to < 0 || to >= nextOrder.length) break
      nextOrder = [...nextOrder]
      const [moved] = nextOrder.splice(from, 1)
      nextOrder.splice(to, 0, moved)
      break
    }
  }
  return { elements: nextEls, layerOrder: nextOrder }
}

function reverseAction(
  elements: Record<string, BoardElement>,
  layerOrder: string[],
  action: HistoryAction
): { elements: Record<string, BoardElement>; layerOrder: string[] } {
  const nextEls = { ...elements }
  let nextOrder = layerOrder

  switch (action.type) {
    case 'ADD': {
      const idx = nextOrder.indexOf(action.element.id)
      if (idx >= 0) {
        nextOrder = [...nextOrder.slice(0, idx), ...nextOrder.slice(idx + 1)]
      }
      delete nextEls[action.element.id]
      break
    }
    case 'UPDATE': {
      const el = nextEls[action.id]
      if (el) {
        nextEls[action.id] = { ...el, ...action.prev, updatedAt: Date.now() }
      }
      break
    }
    case 'DELETE': {
      nextEls[action.element.id] = deepClone(action.element)
      nextOrder = [...nextOrder, action.element.id]
      break
    }
    case 'REORDER': {
      const { from, to } = action
      if (to < 0 || to >= nextOrder.length) break
      if (from < 0 || from >= nextOrder.length) break
      nextOrder = [...nextOrder]
      const [moved] = nextOrder.splice(to, 1)
      nextOrder.splice(from, 0, moved)
      break
    }
  }
  return { elements: nextEls, layerOrder: nextOrder }
}

export const useWhiteboardStore = create<WhiteboardState>((set, get) => ({
  // Data
  elements: {},
  layerOrder: [],

  // Tool
  activeTool: 'select',
  selectedId: null,
  strokeColor: '#FF6B6B',
  strokeWidth: 3,
  fillColor: undefined,
  fontSize: 18,

  // View
  zoom: 1,
  panX: 0,
  panY: 0,

  // History
  historyStack: [],
  historyIndex: -1,
  snapshots: [],
  operationsSinceSnapshot: 0,

  remoteCursors: {},

  // ============ Tool actions ============
  setActiveTool: (tool) => set({ activeTool: tool }),
  setSelectedId: (id) => set({ selectedId: id }),
  setStrokeColor: (c) => set({ strokeColor: c }),
  setStrokeWidth: (w) => set({ strokeWidth: w }),
  setFillColor: (c) => set({ fillColor: c }),

  // ============ Viewport ============
  setZoom: (z) => set({ zoom: Math.min(4, Math.max(0.1, z)) }),
  setPan: (x, y) => set({ panX: x, panY: y }),
  panBy: (dx, dy) => set((s) => ({ panX: s.panX + dx, panY: s.panY + dy })),
  zoomAt: (factor, cx, cy) => {
    const s = get()
    const newZoom = Math.min(4, Math.max(0.1, s.zoom * factor))
    const realFactor = newZoom / s.zoom
    const worldX = (cx - s.panX) / s.zoom
    const worldY = (cy - s.panY) / s.zoom
    const newPanX = cx - worldX * newZoom
    const newPanY = cy - worldY * newZoom
    set({ zoom: newZoom, panX: newPanX, panY: newPanY })
  },

  // ============ Element operations ============
  createElement: (partial) => {
    const s = get()
    const now = Date.now()
    const stroke = s.strokeColor
    const fill = s.fillColor
    const el: BoardElement = {
      id: uuidv4(),
      type: partial.type,
      x: partial.x ?? 0,
      y: partial.y ?? 0,
      width: partial.width ?? 100,
      height: partial.height ?? 100,
      fill: fill ?? undefined,
      stroke: stroke ?? nextColor(),
      strokeWidth: partial.strokeWidth ?? s.strokeWidth,
      text: partial.text ?? undefined,
      fontSize: partial.fontSize ?? s.fontSize,
      points: partial.points ?? undefined,
      visible: true,
      locked: false,
      createdAt: now,
      updatedAt: now
    }
    return el
  },

  addElement: (element, fromRemote = false) => {
    const s = get()
    const elements = { ...s.elements, [element.id]: deepClone(element) }
    const layerOrder = [...s.layerOrder, element.id]
    set({ elements, layerOrder })
    get()._pushHistory({ type: 'ADD', element: deepClone(element) }, fromRemote)
  },

  updateElement: (id, patch, fromRemote = false) => {
    const s = get()
    const el = s.elements[id]
    if (!el) return
    if (el.locked && !fromRemote) return
    const prev: Partial<BoardElement> = {}
    const next: Partial<BoardElement> = {}
    for (const k of Object.keys(patch) as (keyof BoardElement)[]) {
      if (k in el) {
        prev[k] = el[k] as never
        next[k] = patch[k] as never
      }
    }
    const updated: BoardElement = { ...el, ...patch, updatedAt: Date.now() }
    const elements = { ...s.elements, [id]: updated }
    set({ elements })
    get()._pushHistory({ type: 'UPDATE', id, prev, next }, fromRemote)
  },

  deleteElement: (id, fromRemote = false) => {
    const s = get()
    const el = s.elements[id]
    if (!el) return
    if (el.locked && !fromRemote) return
    const elements = { ...s.elements }
    delete elements[id]
    const layerOrder = s.layerOrder.filter((x) => x !== id)
    set({
      elements,
      layerOrder,
      selectedId: s.selectedId === id ? null : s.selectedId
    })
    get()._pushHistory({ type: 'DELETE', element: deepClone(el) }, fromRemote)
  },

  reorderLayer: (from, to, fromRemote = false) => {
    const s = get()
    if (from < 0 || from >= s.layerOrder.length) return
    if (to < 0 || to >= s.layerOrder.length) return
    const layerOrder = [...s.layerOrder]
    const [moved] = layerOrder.splice(from, 1)
    layerOrder.splice(to, 0, moved)
    set({ layerOrder })
    get()._pushHistory({ type: 'REORDER', from, to }, fromRemote)
  },

  moveLayerToTop: (id) => {
    const s = get()
    const from = s.layerOrder.indexOf(id)
    if (from < 0) return
    const to = s.layerOrder.length - 1
    get().reorderLayer(from, to)
  },

  moveLayerToBottom: (id) => {
    const s = get()
    const from = s.layerOrder.indexOf(id)
    if (from < 0) return
    get().reorderLayer(from, 0)
  },

  toggleLayerVisible: (id) => {
    const s = get()
    const el = s.elements[id]
    if (!el) return
    get().updateElement(id, { visible: !el.visible })
  },

  toggleLayerLocked: (id) => {
    const s = get()
    const el = s.elements[id]
    if (!el) return
    get().updateElement(id, { locked: !el.locked })
  },

  // ============ Init from remote ============
  initFromRemote: (elements, layerOrder) => {
    const rec: Record<string, BoardElement> = {}
    for (const e of elements) {
      rec[e.id] = deepClone(e)
    }
    set({
      elements: rec,
      layerOrder: [...layerOrder],
      historyStack: [],
      historyIndex: -1,
      operationsSinceSnapshot: 0
    })
  },

  // ============ Cursor ============
  updateRemoteCursor: (userId, x, y) => {
    set((s) => ({
      remoteCursors: {
        ...s.remoteCursors,
        [userId]: { x, y, lastSeen: Date.now() }
      }
    }))
  },

  // ============ History ============
  _pushHistory: (action, fromRemote = false) => {
    if (fromRemote) return
    set((s) => {
      const stack = s.historyStack.slice(0, s.historyIndex + 1)
      stack.push(action)
      if (stack.length > MAX_HISTORY_STEPS) {
        stack.splice(0, stack.length - MAX_HISTORY_STEPS)
      }
      const newIndex = stack.length - 1
      const newOpsCount = s.operationsSinceSnapshot + 1
      let snapshots = s.snapshots
      let opsSince = newOpsCount
      if (newOpsCount >= SNAPSHOT_INTERVAL) {
        const snap: VersionSnapshot = {
          id: uuidv4(),
          name: `快照 ${snapshots.length + 1}`,
          timestamp: Date.now(),
          elements: s.layerOrder.map((id) => deepClone(s.elements[id])).filter(Boolean),
          layerOrder: [...s.layerOrder]
        }
        snapshots = [...snapshots, snap]
        opsSince = 0
      }
      return {
        historyStack: stack,
        historyIndex: newIndex,
        operationsSinceSnapshot: opsSince,
        snapshots
      }
    })
  },

  canUndo: () => get().historyIndex >= 0,
  canRedo: () => {
    const s = get()
    return s.historyIndex < s.historyStack.length - 1
  },

  undo: () => {
    const s = get()
    if (s.historyIndex < 0) return
    const action = s.historyStack[s.historyIndex]
    const { elements, layerOrder } = reverseAction(s.elements, s.layerOrder, action)
    set({
      elements,
      layerOrder,
      historyIndex: s.historyIndex - 1,
      selectedId: null
    })
  },

  redo: () => {
    const s = get()
    if (s.historyIndex >= s.historyStack.length - 1) return
    const action = s.historyStack[s.historyIndex + 1]
    const { elements, layerOrder } = applyAction(s.elements, s.layerOrder, action)
    set({
      elements,
      layerOrder,
      historyIndex: s.historyIndex + 1,
      selectedId: null
    })
  },

  // ============ Snapshots ============
  takeSnapshot: (name) => {
    const s = get()
    const snap: VersionSnapshot = {
      id: uuidv4(),
      name: name ?? `快照 ${s.snapshots.length + 1}`,
      timestamp: Date.now(),
      elements: s.layerOrder.map((id) => deepClone(s.elements[id])).filter(Boolean),
      layerOrder: [...s.layerOrder]
    }
    set((st) => ({
      snapshots: [...st.snapshots, snap],
      operationsSinceSnapshot: 0
    }))
  },

  restoreSnapshot: (snapshotId) => {
    const s = get()
    const snap = s.snapshots.find((x) => x.id === snapshotId)
    if (!snap) return
    const rec: Record<string, BoardElement> = {}
    for (const e of snap.elements) {
      rec[e.id] = deepClone(e)
    }
    set({
      elements: rec,
      layerOrder: [...snap.layerOrder],
      selectedId: null,
      historyStack: [],
      historyIndex: -1,
      operationsSinceSnapshot: 0
    })
  }
}))

// expose a global singleton helper so non-React modules can dispatch actions
export const storeApi = useWhiteboardStore
