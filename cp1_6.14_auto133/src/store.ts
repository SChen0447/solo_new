import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'

export type NodeType = 'commercial' | 'residential' | 'industrial'

export interface CityNode {
  id: string
  name: string
  type: NodeType
  position: [number, number, number]
  load: number
}

export interface DataFlow {
  id: string
  sourceId: string
  targetId: string
  rate: number
}

interface CityState {
  nodes: CityNode[]
  flows: DataFlow[]
  selectedNodeId: string | null
  hoveredNodeId: string | null
  setSelectedNodeId: (id: string | null) => void
  setHoveredNodeId: (id: string | null) => void
  updateFlowRate: (flowId: string, rate: number) => void
  updateNodeLoad: (nodeId: string, load: number) => void
  randomizeFlowRates: () => void
  calculateNodeLoads: () => void
}

const initialNodes: CityNode[] = [
  {
    id: 'node-1',
    name: '中央商业区',
    type: 'commercial',
    position: [0, 0, 0],
    load: 50,
  },
  {
    id: 'node-2',
    name: '东湖居民区',
    type: 'residential',
    position: [-20, 0, 15],
    load: 30,
  },
  {
    id: 'node-3',
    name: '西部工业区',
    type: 'industrial',
    position: [25, 0, -10],
    load: 70,
  },
]

const initialFlows: DataFlow[] = [
  { id: 'flow-1', sourceId: 'node-1', targetId: 'node-2', rate: 45 },
  { id: 'flow-2', sourceId: 'node-2', targetId: 'node-1', rate: 35 },
  { id: 'flow-3', sourceId: 'node-1', targetId: 'node-3', rate: 60 },
  { id: 'flow-4', sourceId: 'node-3', targetId: 'node-1', rate: 55 },
  { id: 'flow-5', sourceId: 'node-2', targetId: 'node-3', rate: 25 },
  { id: 'flow-6', sourceId: 'node-3', targetId: 'node-2', rate: 40 },
]

export const useCityStore = create<CityState>((set, get) => ({
  nodes: initialNodes,
  flows: initialFlows,
  selectedNodeId: null,
  hoveredNodeId: null,

  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  setHoveredNodeId: (id) => set({ hoveredNodeId: id }),

  updateFlowRate: (flowId, rate) =>
    set((state) => ({
      flows: state.flows.map((f) =>
        f.id === flowId ? { ...f, rate: Math.max(0, Math.min(100, rate)) } : f
      ),
    })),

  updateNodeLoad: (nodeId, load) =>
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, load: Math.max(0, Math.min(100, load)) } : n
      ),
    })),

  randomizeFlowRates: () => {
    const { flows } = get()
    if (flows.length === 0) return
    
    const randomIndex = Math.floor(Math.random() * flows.length)
    const flow = flows[randomIndex]
    const change = (Math.random() - 0.5) * 40
    const newRate = Math.max(0, Math.min(100, flow.rate + change))
    
    set((state) => ({
      flows: state.flows.map((f, i) =>
        i === randomIndex ? { ...f, rate: newRate } : f
      ),
    }))
    
    get().calculateNodeLoads()
  },

  calculateNodeLoads: () => {
    const { nodes, flows } = get()
    
    const nodeLoads: Record<string, number> = {}
    nodes.forEach((node) => {
      nodeLoads[node.id] = 0
    })

    flows.forEach((flow) => {
      if (nodeLoads[flow.sourceId] !== undefined) {
        nodeLoads[flow.sourceId] += flow.rate
      }
      if (nodeLoads[flow.targetId] !== undefined) {
        nodeLoads[flow.targetId] += flow.rate
      }
    })

    const maxLoad = Math.max(...Object.values(nodeLoads), 1)
    
    set((state) => ({
      nodes: state.nodes.map((node) => ({
        ...node,
        load: Math.min(100, (nodeLoads[node.id] / maxLoad) * 100),
      })),
    }))
  },
}))

export const useCityData = () => {
  const nodes = useCityStore((state) => state.nodes)
  const flows = useCityStore((state) => state.flows)
  const selectedNodeId = useCityStore((state) => state.selectedNodeId)
  const hoveredNodeId = useCityStore((state) => state.hoveredNodeId)
  const setSelectedNodeId = useCityStore((state) => state.setSelectedNodeId)
  const setHoveredNodeId = useCityStore((state) => state.setHoveredNodeId)
  const randomizeFlowRates = useCityStore((state) => state.randomizeFlowRates)
  const calculateNodeLoads = useCityStore((state) => state.calculateNodeLoads)

  return {
    nodes,
    flows,
    selectedNodeId,
    hoveredNodeId,
    setSelectedNodeId,
    setHoveredNodeId,
    randomizeFlowRates,
    calculateNodeLoads,
  }
}
