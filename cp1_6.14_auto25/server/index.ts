import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3001
const DATA_DIR = path.join(__dirname, 'data')

app.use(express.json())

interface Activity {
  id: string
  name: string
  date: string
  location: string
  maxParticipants: number
  code: string
  status: 'active' | 'cancelled'
  createdAt: string
}

interface SignInRecord {
  id: string
  activityId: string
  name: string
  deviceId: string
  signInTime: string
}

interface Feedback {
  id: string
  activityId: string
  deviceId: string
  organizationScore: number
  atmosphereScore: number
  suggestion: string
  createdAt: string
}

const ensureDataDir = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

const readJSON = <T>(filename: string, defaultValue: T): T => {
  ensureDataDir()
  const filePath = path.join(DATA_DIR, filename)
  if (!fs.existsSync(filePath)) {
    return defaultValue
  }
  try {
    const data = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(data) as T
  } catch {
    return defaultValue
  }
}

const writeJSON = (filename: string, data: unknown) => {
  ensureDataDir()
  const filePath = path.join(DATA_DIR, filename)
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

const generateId = () => crypto.randomUUID()

const generateActivityCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

const getTodayStr = () => {
  return new Date().toISOString().split('T')[0]
}

app.get('/api/activities', (_req, res) => {
  const activities = readJSON<Activity[]>('activities.json', [])
  res.json(activities)
})

app.post('/api/activities', (req, res) => {
  const { name, date, location, maxParticipants } = req.body

  if (!name || !date || !location || !maxParticipants) {
    return res.status(400).json({ error: '缺少必填字段' })
  }

  const activities = readJSON<Activity[]>('activities.json', [])
  const newActivity: Activity = {
    id: generateId(),
    name,
    date,
    location,
    maxParticipants: Number(maxParticipants),
    code: generateActivityCode(),
    status: 'active',
    createdAt: new Date().toISOString(),
  }

  activities.push(newActivity)
  writeJSON('activities.json', activities)

  res.status(201).json(newActivity)
})

app.put('/api/activities/:id', (req, res) => {
  const { id } = req.params
  const { name, date, location, maxParticipants } = req.body

  const activities = readJSON<Activity[]>('activities.json', [])
  const index = activities.findIndex((a) => a.id === id)

  if (index === -1) {
    return res.status(404).json({ error: '活动不存在' })
  }

  activities[index] = {
    ...activities[index],
    name: name || activities[index].name,
    date: date || activities[index].date,
    location: location || activities[index].location,
    maxParticipants: maxParticipants ? Number(maxParticipants) : activities[index].maxParticipants,
  }

  writeJSON('activities.json', activities)
  res.json(activities[index])
})

app.delete('/api/activities/:id', (req, res) => {
  const { id } = req.params

  const activities = readJSON<Activity[]>('activities.json', [])
  const index = activities.findIndex((a) => a.id === id)

  if (index === -1) {
    return res.status(404).json({ error: '活动不存在' })
  }

  activities[index].status = 'cancelled'
  writeJSON('activities.json', activities)

  res.json(activities[index])
})

app.get('/api/activities/code/:code', (req, res) => {
  const { code } = req.params
  const activities = readJSON<Activity[]>('activities.json', [])
  const activity = activities.find((a) => a.code === code.toUpperCase() && a.status === 'active')

  if (!activity) {
    return res.status(404).json({ error: '活动不存在或已取消' })
  }

  res.json(activity)
})

app.get('/api/activity/:id', (req, res) => {
  const { id } = req.params
  const activities = readJSON<Activity[]>('activities.json', [])
  const activity = activities.find((a) => a.id === id)

  if (!activity) {
    return res.status(404).json({ error: '活动不存在' })
  }

  const signIns = readJSON<SignInRecord[]>('signins.json', [])
  const activitySignIns = signIns.filter((s) => s.activityId === id)

  const feedbacks = readJSON<Feedback[]>('feedbacks.json', [])
  const activityFeedbacks = feedbacks.filter((f) => f.activityId === id)

  res.json({
    activity,
    signIns: activitySignIns,
    feedbacks: activityFeedbacks,
    signInCount: activitySignIns.length,
  })
})

app.post('/api/signin', (req, res) => {
  const { activityId, name, deviceId } = req.body

  if (!activityId || !name || !deviceId) {
    return res.status(400).json({ error: '缺少必填字段' })
  }

  const activities = readJSON<Activity[]>('activities.json', [])
  const activity = activities.find((a) => a.id === activityId)

  if (!activity) {
    return res.status(404).json({ error: '活动不存在' })
  }

  if (activity.status === 'cancelled') {
    return res.status(400).json({ error: '活动已取消' })
  }

  const signIns = readJSON<SignInRecord[]>('signins.json', [])
  const today = getTodayStr()

  const alreadySigned = signIns.find(
    (s) => s.activityId === activityId && s.deviceId === deviceId && s.signInTime.startsWith(today)
  )

  if (alreadySigned) {
    return res.status(400).json({ error: '该设备今日已签到过此活动' })
  }

  const activitySignIns = signIns.filter((s) => s.activityId === activityId)
  if (activitySignIns.length >= activity.maxParticipants) {
    return res.status(400).json({ error: '活动名额已满' })
  }

  const newSignIn: SignInRecord = {
    id: generateId(),
    activityId,
    name,
    deviceId,
    signInTime: new Date().toISOString(),
  }

  signIns.push(newSignIn)
  writeJSON('signins.json', signIns)

  res.status(201).json(newSignIn)
})

app.post('/api/feedback', (req, res) => {
  const { activityId, deviceId, organizationScore, atmosphereScore, suggestion } = req.body

  if (!activityId || !deviceId || organizationScore == null || atmosphereScore == null) {
    return res.status(400).json({ error: '缺少必填字段' })
  }

  if (organizationScore < 1 || organizationScore > 5 || atmosphereScore < 1 || atmosphereScore > 5) {
    return res.status(400).json({ error: '评分必须在1-5之间' })
  }

  const feedbacks = readJSON<Feedback[]>('feedbacks.json', [])
  const newFeedback: Feedback = {
    id: generateId(),
    activityId,
    deviceId,
    organizationScore: Number(organizationScore),
    atmosphereScore: Number(atmosphereScore),
    suggestion: (suggestion || '').slice(0, 100),
    createdAt: new Date().toISOString(),
  }

  feedbacks.push(newFeedback)
  writeJSON('feedbacks.json', feedbacks)

  res.status(201).json(newFeedback)
})

app.get('/api/export/:id', (req, res) => {
  const { id } = req.params
  const activities = readJSON<Activity[]>('activities.json', [])
  const activity = activities.find((a) => a.id === id)

  if (!activity) {
    return res.status(404).json({ error: '活动不存在' })
  }

  const signIns = readJSON<SignInRecord[]>('signins.json', [])
  const activitySignIns = signIns.filter((s) => s.activityId === id)

  const feedbacks = readJSON<Feedback[]>('feedbacks.json', [])
  const activityFeedbacks = feedbacks.filter((f) => f.activityId === id)

  const feedbackMap = new Map(activityFeedbacks.map((f) => [f.deviceId, f]))

  let csv = '\uFEFF姓名,签到时间,活动组织评分,现场氛围评分,建议\n'

  activitySignIns.forEach((signIn) => {
    const feedback = feedbackMap.get(signIn.deviceId)
    const orgScore = feedback ? feedback.organizationScore : ''
    const atmScore = feedback ? feedback.atmosphereScore : ''
    const suggestion = feedback ? `"${feedback.suggestion.replace(/"/g, '""')}"` : ''

    csv += `"${signIn.name}","${signIn.signInTime}",${orgScore},${atmScore},${suggestion}\n`
  })

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${activity.name}_签到反馈.csv"`)
  res.send(csv)
})

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})
