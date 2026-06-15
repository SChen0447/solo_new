import { create } from 'zustand'

export type CellType = 'plant' | 'animal'

export type OrganelleId =
  | 'nucleus'
  | 'mitochondria'
  | 'chloroplast'
  | 'golgi'
  | 'endoplasmicReticulum'
  | 'cellMembrane'
  | 'cellWall'
  | 'vacuole'

export interface DataPoint {
  timestamp: number
  value: number
}

export interface OrganelleData {
  id: OrganelleId
  name: string
  currentValue: number
  unit: string
  dataSeries: DataPoint[]
  color: string
}

export interface SimulationParams {
  lightIntensity: number
  glucoseConcentration: number
}

export interface TimeWindow {
  start: number
  end: number
}

interface AppState {
  cellType: CellType
  selectedOrganelleId: OrganelleId | null
  params: SimulationParams
  organelleData: Record<OrganelleId, OrganelleData>
  simulationTime: number
  isRunning: boolean
  timeWindow: TimeWindow
  setCellType: (type: CellType) => void
  setSelectedOrganelleId: (id: OrganelleId | null) => void
  setParams: (params: Partial<SimulationParams>) => void
  updateOrganelleData: (id: OrganelleId, data: Partial<OrganelleData>) => void
  appendDataPoint: (id: OrganelleId, value: number) => void
  setSimulationTime: (time: number) => void
  setIsRunning: (running: boolean) => void
  setTimeWindow: (window: TimeWindow) => void
  resetSimulation: () => void
}

const MAX_DATA_POINTS = 300

const createDefaultOrganelleData = (
  id: OrganelleId,
  name: string,
  unit: string,
  color: string
): OrganelleData => ({
  id,
  name,
  currentValue: 0,
  unit,
  dataSeries: [],
  color,
})

export const useStore = create<AppState>((set, get) => ({
  cellType: 'animal',
  selectedOrganelleId: null,
  params: {
    lightIntensity: 500,
    glucoseConcentration: 10,
  },
  organelleData: {
    nucleus: createDefaultOrganelleData('nucleus', '细胞核', '基因表达水平', '#9c27b0'),
    mitochondria: createDefaultOrganelleData('mitochondria', '线粒体', 'ATP合成速率 μM/s', '#e53935'),
    chloroplast: createDefaultOrganelleData('chloroplast', '叶绿体', '氧释放速率 μM/s', '#4caf50'),
    golgi: createDefaultOrganelleData('golgi', '高尔基体', '分泌蛋白速率', '#ff9800'),
    endoplasmicReticulum: createDefaultOrganelleData('endoplasmicReticulum', '内质网', 'Ca²+浓度 μM', '#2196f3'),
    cellMembrane: createDefaultOrganelleData('cellMembrane', '细胞膜', '跨膜电位 mV', '#795548'),
    cellWall: createDefaultOrganelleData('cellWall', '细胞壁', '纤维素合成速率', '#8bc34a'),
    vacuole: createDefaultOrganelleData('vacuole', '液泡', '渗透压 MPa', '#00bcd4'),
  },
  simulationTime: 0,
  isRunning: true,
  timeWindow: {
    start: 0,
    end: 60,
  },

  setCellType: (type) => {
    set({ cellType: type })
    get().resetSimulation()
  },

  setSelectedOrganelleId: (id) => set({ selectedOrganelleId: id }),

  setParams: (newParams) =>
    set((state) => ({
      params: { ...state.params, ...newParams },
    })),

  updateOrganelleData: (id, data) =>
    set((state) => ({
      organelleData: {
        ...state.organelleData,
        [id]: { ...state.organelleData[id], ...data },
      },
    })),

  appendDataPoint: (id, value) =>
    set((state) => {
      const current = state.organelleData[id]
      const newSeries = [...current.dataSeries, { timestamp: state.simulationTime, value }]
      if (newSeries.length > MAX_DATA_POINTS) {
        newSeries.shift()
      }
      return {
        organelleData: {
          ...state.organelleData,
          [id]: {
            ...current,
            currentValue: value,
            dataSeries: newSeries,
          },
        },
      }
    }),

  setSimulationTime: (time) => set({ simulationTime: time }),

  setIsRunning: (running) => set({ isRunning: running }),

  setTimeWindow: (window) => set({ timeWindow: window }),

  resetSimulation: () => {
    const state = get()
    const resetData: Record<OrganelleId, OrganelleData> = {} as Record<OrganelleId, OrganelleData>
    for (const key of Object.keys(state.organelleData) as OrganelleId[]) {
      resetData[key] = {
        ...state.organelleData[key],
        currentValue: 0,
        dataSeries: [],
      }
    }
    set({
      organelleData: resetData,
      simulationTime: 0,
      timeWindow: { start: 0, end: 60 },
    })
  },
}))
