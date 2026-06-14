import { create } from 'zustand'
import type { Earthquake, TimeRange, MapMode, EarthquakeCluster, Stats } from '../types'

interface EarthquakeState {
  earthquakes: Earthquake[]
  clusters: EarthquakeCluster[]
  loading: boolean
  error: string | null
  timeRange: TimeRange
  minMagnitude: number
  mapMode: MapMode
  selectedEarthquake: Earthquake | null
  stats: Stats
  transitionProgress: number

  setTimeRange: (range: TimeRange) => void
  setMinMagnitude: (mag: number) => void
  setMapMode: (mode: MapMode) => void
  setSelectedEarthquake: (eq: Earthquake | null) => void
  setTransitionProgress: (progress: number) => void
  loadEarthquakes: () => Promise<void>
  computeClusters: () => void
  computeStats: () => void
}

function clusterEarthquakes(earthquakes: Earthquake[], gridSize: number): EarthquakeCluster[] {
  const clusters = new Map<string, Earthquake[]>()

  for (const eq of earthquakes) {
    const latKey = Math.floor(eq.latitude / gridSize) * gridSize
    const lonKey = Math.floor(eq.longitude / gridSize) * gridSize
    const key = `${latKey.toFixed(1)},${lonKey.toFixed(1)}`

    if (!clusters.has(key)) {
      clusters.set(key, [])
    }
    clusters.get(key)!.push(eq)
  }

  const result: EarthquakeCluster[] = []
  let clusterIndex = 0

  for (const [key, eqs] of clusters.entries()) {
    if (eqs.length === 1) {
      continue
    }

    const [latStr, lonStr] = key.split(',')
    const avgMagnitude = eqs.reduce((sum, eq) => sum + eq.magnitude, 0) / eqs.length
    const avgDepth = eqs.reduce((sum, eq) => sum + eq.depth, 0) / eqs.length

    result.push({
      id: `cluster-${clusterIndex++}`,
      latitude: parseFloat(latStr) + gridSize / 2,
      longitude: parseFloat(lonStr) + gridSize / 2,
      magnitude: avgMagnitude,
      count: eqs.length,
      avgDepth,
      earthquakeIds: eqs.map((eq) => eq.id),
    })
  }

  return result
}

function computeStats(earthquakes: Earthquake[]): Stats {
  if (earthquakes.length === 0) {
    return {
      total: 0,
      maxMagnitude: 0,
      avgDepth: 0,
      latestMagnitude: 0,
      latestTime: 0,
    }
  }

  const total = earthquakes.length
  const maxMagnitude = Math.max(...earthquakes.map((eq) => eq.magnitude))
  const avgDepth = earthquakes.reduce((sum, eq) => sum + eq.depth, 0) / total

  const latest = earthquakes.reduce((a, b) => (a.time > b.time ? a : b))

  return {
    total,
    maxMagnitude,
    avgDepth,
    latestMagnitude: latest.magnitude,
    latestTime: latest.time,
  }
}

export const useEarthquakeStore = create<EarthquakeState>((set, get) => ({
  earthquakes: [],
  clusters: [],
  loading: false,
  error: null,
  timeRange: '24h',
  minMagnitude: 2.5,
  mapMode: 'globe',
  selectedEarthquake: null,
  transitionProgress: 0,
  stats: {
    total: 0,
    maxMagnitude: 0,
    avgDepth: 0,
    latestMagnitude: 0,
    latestTime: 0,
  },

  setTimeRange: (range) => {
    set({ timeRange: range })
    get().loadEarthquakes()
  },

  setMinMagnitude: (mag) => {
    set({ minMagnitude: mag })
    get().loadEarthquakes()
  },

  setMapMode: (mode) => {
    set({ mapMode: mode })
  },

  setSelectedEarthquake: (eq) => {
    set({ selectedEarthquake: eq })
  },

  setTransitionProgress: (progress) => {
    set({ transitionProgress: progress })
  },

  loadEarthquakes: async () => {
    const { timeRange, minMagnitude } = get()
    set({ loading: true, error: null })

    try {
      const { fetchEarthquakes } = await import('../api/earthquakeService')
      const data = await fetchEarthquakes(timeRange, minMagnitude)

      set({ earthquakes: data, loading: false })
      get().computeClusters()
      get().computeStats()
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  computeClusters: () => {
    const { earthquakes } = get()
    if (earthquakes.length <= 200) {
      set({ clusters: [] })
      return
    }

    const largeQuakes = earthquakes.filter((eq) => eq.magnitude >= 4.5)
    const smallQuakes = earthquakes.filter((eq) => eq.magnitude < 4.5)

    const clusters = clusterEarthquakes(smallQuakes, 0.5)

    const largeClusters = largeQuakes.map((eq) => ({
      id: `single-${eq.id}`,
      latitude: eq.latitude,
      longitude: eq.longitude,
      magnitude: eq.magnitude,
      count: 1,
      avgDepth: eq.depth,
      earthquakeIds: [eq.id],
    }))

    set({ clusters: [...largeClusters, ...clusters] })
  },

  computeStats: () => {
    const { earthquakes } = get()
    set({ stats: computeStats(earthquakes) })
  },
}))
