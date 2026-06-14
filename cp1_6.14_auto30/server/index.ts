import express from 'express'
import axios from 'axios'
import { subDays, subHours, formatISO } from 'date-fns'

const app = express()
const PORT = 4000

interface EarthquakeFeature {
  id: string
  properties: {
    mag: number
    place: string
    time: number
    updated: number
    tz: number | null
    url: string
    detail: string
    felt: number | null
    cdi: number | null
    mmi: number | null
    alert: string | null
    status: string
    tsunami: number
    sig: number
    net: string
    code: string
    ids: string
    sources: string
    types: string
    nst: number | null
    dmin: number | null
    rms: number
    gap: number | null
    magType: string
    type: string
    title: string
  }
  geometry: {
    type: string
    coordinates: [number, number, number]
  }
}

interface CachedData {
  timestamp: number
  data: EarthquakeFeature[]
  timeRange: string
  minMagnitude: number
}

const cache = new Map<string, CachedData>()
const CACHE_TTL = 5 * 60 * 1000

function getCacheKey(timeRange: string, minMagnitude: number): string {
  return `${timeRange}-${minMagnitude}`
}

function getStartTime(timeRange: string): Date {
  const now = new Date()
  switch (timeRange) {
    case '24h':
      return subHours(now, 24)
    case '48h':
      return subHours(now, 48)
    case '7d':
      return subDays(now, 7)
    default:
      return subHours(now, 24)
  }
}

async function fetchEarthquakes(timeRange: string, minMagnitude: number): Promise<EarthquakeFeature[]> {
  const startTime = getStartTime(timeRange)
  const starttime = formatISO(startTime, { representation: 'complete' })
  const endtime = formatISO(new Date(), { representation: 'complete' })

  const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${encodeURIComponent(starttime)}&endtime=${encodeURIComponent(endtime)}&minmagnitude=${minMagnitude}&orderby=time`

  try {
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
      },
    })

    if (response.data && response.data.features) {
      return response.data.features as EarthquakeFeature[]
    }
    return []
  } catch (error) {
    console.error('Error fetching earthquake data:', error)
    throw error
  }
}

app.get('/api/earthquakes', async (req, res) => {
  const timeRange = (req.query.timeRange as string) || '24h'
  const minMagnitude = parseFloat(req.query.minMagnitude as string) || 2.5

  const cacheKey = getCacheKey(timeRange, minMagnitude)
  const cached = cache.get(cacheKey)

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return res.json({
      data: cached.data,
      cached: true,
      cachedAt: cached.timestamp,
    })
  }

  try {
    const data = await fetchEarthquakes(timeRange, minMagnitude)

    cache.set(cacheKey, {
      timestamp: Date.now(),
      data,
      timeRange,
      minMagnitude,
    })

    res.json({
      data,
      cached: false,
      cachedAt: Date.now(),
    })
  } catch (error) {
    console.error('API Error:', error)
    res.status(500).json({ error: 'Failed to fetch earthquake data' })
  }
})

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', cachedQueries: cache.size })
})

app.listen(PORT, () => {
  console.log(`Earthquake API server running on port ${PORT}`)
  console.log(`GET /api/earthquakes?timeRange=24h&minMagnitude=2.5`)
})

export default app
