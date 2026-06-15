import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'

export interface Node {
  id: string
  type: 'rect' | 'circle'
  x: number
  y: number
  width: number
  height: number
  label: string
  createdAt: number
}

export interface Edge {
  id: string
  source: string
  target: string
  sourceAnchor?: { x: number; y: number }
  targetAnchor?: { x: number; y: number }
  pathPoints?: { x: number; y: number }[]
}

export interface Anchor {
  x: number
  y: number
  position: 'top' | 'right' | 'bottom' | 'left'
}

export type LayoutDirection = 'LR' | 'TB'

export interface LayoutResult {
  nodes: { id: string; x: number; y: number }[]
  edges: { id: string; points: { x: number; y: number }[] }[]
}

interface GraphState {
  nodes: Node[]
  edges: Edge[]
  selectedIds: Set<string>
  layoutDirection: LayoutDirection
  isDragging: boolean
  isConnecting: boolean
  connectingFrom: { nodeId: string; anchor: Anchor } | null
  zoom: number
  pan: { x: number; y: number }
  isAnimating: boolean

  addNode: (node: Omit<Node, 'id' | 'createdAt'>) => void
  removeNode: (id: string) => void
  moveNode: (id: string, x: number, y: number) => void
  updateNodeLabel: (id: string, label: string) => void
  addEdge: (edge: Omit<Edge, 'id'>) => void
  removeEdge: (id: string) => void
  setSelected: (ids: Set<string>, append?: boolean) => void
  clearSelection: () => void
  deleteSelected: () => void
  applyLayout: (result: LayoutResult) => void
  setZoom: (zoom: number) => void
  setPan: (x: number, y: number) => void
  startConnecting: (nodeId: string, anchor: Anchor) => void
  endConnecting: () => void
  setDragging: (isDragging: boolean) => void
  setAnimating: (isAnimating: boolean) => void
  setLayoutDirection: (direction: LayoutDirection) => void
}

export const useGraphStore = create<GraphState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedIds: new Set(),
  layoutDirection: 'LR',
  isDragging: false,
  isConnecting: false,
  connectingFrom: null,
  zoom: 1,
  pan: { x: 0, y: 0 },
  isAnimating: false,

  addNode: (node) => {
    const newNode: Node = {
      ...node,
      id: uuidv4(),
      createdAt: Date.now()
    }
    set((state) => ({
      nodes: [...state.nodes, newNode]
    }))
  },

  removeNode: (id) => {
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== id),
      edges: state.edges.filter((e) => e.source !== id && e.target !== id),
      selectedIds: new Set(
        Array.from(state.selectedIds).filter((sid) => sid !== id)
      )
    }))
  },

  moveNode: (id, x, y) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id ? { ...n, x: x - n.width / 2, y: y - n.height / 2 } : n
      )
    }))
  },

  updateNodeLabel: (id, label) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id ? { ...n, label } : n
      )
    }))
  },

  addEdge: (edge) => {
    const { edges } = get()
    const exists = edges.some(
      (e) => e.source === edge.source && e.target === edge.target
    )
    if (exists) return

    const newEdge: Edge = {
      ...edge,
      id: uuidv4()
    }
    set((state) => ({
      edges: [...state.edges, newEdge]
    }))
  },

  removeEdge: (id) => {
    set((state) => ({
      edges: state.edges.filter((e) => e.id !== id),
      selectedIds: new Set(
        Array.from(state.selectedIds).filter((sid) => sid !== id)
      )
    }))
  },

  setSelected: (ids, append = false) => {
    if (append) {
      set((state) => {
        const newSelected = new Set(state.selectedIds)
        ids.forEach((id) => {
          if (newSelected.has(id)) {
            newSelected.delete(id)
          } else {
            newSelected.add(id)
          }
        })
        return { selectedIds: newSelected }
      })
    } else {
      set({ selectedIds: ids })
    }
  },

  clearSelection: () => {
    set({ selectedIds: new Set() })
  },

  deleteSelected: () => {
    const { selectedIds, nodes, edges } = get()
    const nodeIdsToDelete = new Set<string>()
    const edgeIdsToDelete = new Set<string>()

    selectedIds.forEach((id) => {
      if (nodes.some((n) => n.id === id)) {
        nodeIdsToDelete.add(id)
      }
      if (edges.some((e) => e.id === id)) {
        edgeIdsToDelete.add(id)
      }
    })

    nodeIdsToDelete.forEach((nodeId) => {
      edges.forEach((edge) => {
        if (edge.source === nodeId || edge.target === nodeId) {
          edgeIdsToDelete.add(edge.id)
        }
      })
    })

    set((state) => ({
      nodes: state.nodes.filter((n) => !nodeIdsToDelete.has(n.id)),
      edges: state.edges.filter((e) => !edgeIdsToDelete.has(e.id)),
      selectedIds: new Set()
    }))
  },

  applyLayout: (result) => {
    set((state) => {
      const updatedNodes = state.nodes.map((node) => {
        const layoutNode = result.nodes.find((n) => n.id === node.id)
        if (layoutNode) {
          return {
            ...node,
            x: layoutNode.x - node.width / 2,
            y: layoutNode.y - node.height / 2
          }
        }
        return node
      })

      const updatedEdges = state.edges.map((edge) => {
        const layoutEdge = result.edges.find((e) => e.id === edge.id)
        if (layoutEdge) {
          return {
            ...edge,
            pathPoints: layoutEdge.points
          }
        }
        return edge
      })

      return {
        nodes: updatedNodes,
        edges: updatedEdges,
        isAnimating: true
      }
    })

    setTimeout(() => {
      set({ isAnimating: false })
    }, 500)
  },

  setZoom: (zoom) => {
    set({ zoom })
  },

  setPan: (x, y) => {
    set({ pan: { x, y } })
  },

  startConnecting: (nodeId, anchor) => {
    set({
      isConnecting: true,
      connectingFrom: { nodeId, anchor }
    })
  },

  endConnecting: () => {
    set({
      isConnecting: false,
      connectingFrom: null
    })
  },

  setDragging: (isDragging) => {
    set({ isDragging })
  },

  setAnimating: (isAnimating) => {
    set({ isAnimating })
  },

  setLayoutDirection: (direction) => {
    set({ layoutDirection: direction })
  }
}))
