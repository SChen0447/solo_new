import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataDir = path.join(__dirname, '../../data')

const router = Router()

interface VisitLog {
  id: string
  artworkId: string
  visitorId: string
  duration: number
  timestamp: string
}

const visitLogFile = path.join(dataDir, 'visit-logs.json')

const readVisitLogs = (): VisitLog[] => {
  if (!fs.existsSync(visitLogFile)) {
    return []
  }
  const data = fs.readFileSync(visitLogFile, 'utf-8')
  return JSON.parse(data)
}

const writeVisitLogs = (logs: VisitLog[]) => {
  fs.writeFileSync(visitLogFile, JSON.stringify(logs, null, 2))
}

router.get('/', (req, res) => {
  const { artworkId } = req.query
  let logs = readVisitLogs()
  if (artworkId) {
    logs = logs.filter(l => l.artworkId === artworkId)
  }
  res.json(logs)
})

router.post('/', (req, res) => {
  const logs = readVisitLogs()
  const newLog: VisitLog = {
    id: uuidv4(),
    artworkId: req.body.artworkId,
    visitorId: req.body.visitorId || 'anonymous',
    duration: req.body.duration || 0,
    timestamp: new Date().toISOString(),
  }
  logs.push(newLog)
  writeVisitLogs(logs)
  res.status(201).json(newLog)
})

router.get('/stats', (req, res) => {
  const logs = readVisitLogs()
  const stats: Record<string, { views: number; totalDuration: number; avgDuration: number }> = {}

  logs.forEach(log => {
    if (!stats[log.artworkId]) {
      stats[log.artworkId] = { views: 0, totalDuration: 0, avgDuration: 0 }
    }
    stats[log.artworkId].views++
    stats[log.artworkId].totalDuration += log.duration
  })

  Object.keys(stats).forEach(id => {
    const s = stats[id]
    s.avgDuration = s.views > 0 ? s.totalDuration / s.views : 0
  })

  res.json(stats)
})

export default router
