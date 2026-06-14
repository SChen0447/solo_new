import type { Earthquake, TimeRange } from '../types'

interface EarthquakeResponse {
  data: any[]
  cached: boolean
  cachedAt: number
}

export async function fetchEarthquakes(
  timeRange: TimeRange,
  minMagnitude: number,
): Promise<Earthquake[]> {
  try {
    const response = await fetch(
      `/api/earthquakes?timeRange=${timeRange}&minMagnitude=${minMagnitude}`,
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result: EarthquakeResponse = await response.json()

    return result.data.map((feature: any) => ({
      id: feature.id,
      magnitude: feature.properties.mag,
      place: feature.properties.place,
      time: feature.properties.time,
      longitude: feature.geometry.coordinates[0],
      latitude: feature.geometry.coordinates[1],
      depth: feature.geometry.coordinates[2],
      magType: feature.properties.magType,
      url: feature.properties.url,
    }))
  } catch (error) {
    console.error('Failed to fetch earthquakes:', error)
    return getMockEarthquakes()
  }
}

function getMockEarthquakes(): Earthquake[] {
  const now = Date.now()
  const mockData: Earthquake[] = []

  for (let i = 0; i < 50; i++) {
    mockData.push({
      id: `mock-${i}`,
      magnitude: 2 + Math.random() * 5,
      place: `Mock Earthquake ${i + 1}`,
      time: now - Math.random() * 7 * 24 * 60 * 60 * 1000,
      longitude: -180 + Math.random() * 360,
      latitude: -60 + Math.random() * 120,
      depth: 5 + Math.random() * 100,
      magType: 'ml',
      url: '#',
    })
  }

  return mockData
}
