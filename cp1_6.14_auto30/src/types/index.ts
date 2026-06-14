export interface Earthquake {
  id: string
  magnitude: number
  place: string
  time: number
  longitude: number
  latitude: number
  depth: number
  magType: string
  url: string
}

export type TimeRange = '24h' | '48h' | '7d'
export type MapMode = 'globe' | 'flat'

export interface EarthquakeCluster {
  id: string
  latitude: number
  longitude: number
  magnitude: number
  count: number
  avgDepth: number
  earthquakeIds: string[]
}

export interface Stats {
  total: number
  maxMagnitude: number
  avgDepth: number
  latestMagnitude: number
  latestTime: number
}
