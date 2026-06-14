import express from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DATA_FILE = path.join(__dirname, 'data.json')

interface Booking {
  id: string
  stationId: string
  date: string
  startTime: string
  endTime: string
  bookerName: string
  projectNote: string
  createdAt: string
}

interface Equipment {
  id: string
  name: string
  totalStock: number
  availableStock: number
  icon: string
}

interface BorrowRecord {
  id: string
  equipmentId: string
  equipmentName: string
  bookingId: string
  quantity: number
  borrowerName: string
  borrowTime: string
  expectedReturnTime: string
  returned: boolean
}

interface AppData {
  bookings: Booking[]
  equipment: Equipment[]
  borrowRecords: BorrowRecord[]
}

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

function readData(): AppData {
  const raw = fs.readFileSync(DATA_FILE, 'utf-8')
  return JSON.parse(raw)
}

function writeData(data: AppData): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function hasTimeConflict(
  bookings: Booking[],
  stationId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeId?: string
): boolean {
  const start = timeToMinutes(startTime)
  const end = timeToMinutes(endTime)
  
  return bookings.some((b) => {
    if (excludeId && b.id === excludeId) return false
    if (b.stationId !== stationId || b.date !== date) return false
    const bStart = timeToMinutes(b.startTime)
    const bEnd = timeToMinutes(b.endTime)
    return start < bEnd && end > bStart
  })
}

app.get('/api/bookings', (req, res) => {
  const { date, stationId } = req.query
  const data = readData()
  let bookings = data.bookings
  
  if (date) {
    bookings = bookings.filter((b) => b.date === date)
  }
  if (stationId) {
    bookings = bookings.filter((b) => b.stationId === stationId)
  }
  
  res.json(bookings)
})

app.post('/api/bookings', (req, res) => {
  const { stationId, date, startTime, endTime, bookerName, projectNote } = req.body
  
  if (!stationId || !date || !startTime || !endTime || !bookerName) {
    return res.status(400).json({ error: '缺少必要字段不能为空' })
  }
  
  const data = readData()
  
  if (hasTimeConflict(data.bookings, stationId, date, startTime, endTime)) {
    return res.status(409).json({ error: '该时段已被预约，请选择其他时段' })
  }
  
  const newBooking: Booking = {
    id: uuidv4(),
    stationId,
    date,
    startTime,
    endTime,
    bookerName,
    projectNote: projectNote || '',
    createdAt: new Date().toISOString(),
  }
  
  data.bookings.push(newBooking)
  writeData(data)
  
  res.status(201).json(newBooking)
})

app.get('/api/bookings/:id', (req, res) => {
  const data = readData()
  const booking = data.bookings.find((b) => b.id === req.params.id)
  
  if (!booking) {
    return res.status(404).json({ error: '预约不存在' })
  }
  
  res.json(booking)
})

app.get('/api/equipment', (_req, res) => {
  const data = readData()
  res.json(data.equipment)
})

app.post('/api/equipment/borrow', (req, res) => {
  const { equipmentId, bookingId, quantity, borrowerName, expectedReturnTime } = req.body
  
  if (!equipmentId || !bookingId || !quantity || !borrowerName || !expectedReturnTime) {
    return res.status(400).json({ error: '缺少必要字段' })
  }
  
  const data = readData()
  
  const equipment = data.equipment.find((e) => e.id === equipmentId)
  if (!equipment) {
    return res.status(404).json({ error: '设备不存在' })
  }
  
  const booking = data.bookings.find((b) => b.id === bookingId)
  if (!booking) {
    return res.status(404).json({ error: '预约不存在' })
  }
  
  if (quantity > equipment.availableStock) {
    return res.status(400).json({ error: '库存不足' })
  }
  
  equipment.availableStock -= quantity
  
  const newRecord: BorrowRecord = {
    id: uuidv4(),
    equipmentId,
    equipmentName: equipment.name,
    bookingId,
    quantity,
    borrowerName,
    borrowTime: new Date().toISOString(),
    expectedReturnTime,
    returned: false,
  }
  
  data.borrowRecords.push(newRecord)
  writeData(data)
  
  res.status(201).json(newRecord)
})

app.post('/api/equipment/return/:id', (req, res) => {
  const data = readData()
  const record = data.borrowRecords.find((r) => r.id === req.params.id)
  
  if (!record) {
    return res.status(404).json({ error: '借用记录不存在' })
  }
  
  if (record.returned) {
    return res.status(400).json({ error: '该设备已归还' })
  }
  
  record.returned = true
  
  const equipment = data.equipment.find((e) => e.id === record.equipmentId)
  if (equipment) {
    equipment.availableStock += record.quantity
  }
  
  writeData(data)
  res.json(record)
})

app.get('/api/borrow-records', (req, res) => {
  const { returned } = req.query
  const data = readData()
  let records = data.borrowRecords
  
  if (returned !== undefined) {
    const isReturned = returned === 'true'
    records = records.filter((r) => r.returned === isReturned)
  }
  
  records.sort((a, b) => new Date(b.borrowTime).getTime() - new Date(a.borrowTime).getTime())
  
  res.json(records)
})

app.get('/api/stats/dashboard', (_req, res) => {
  const data = readData()
  
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  
  const todayBookings = data.bookings.filter((b) => b.date === todayStr)
  
  const stations = ['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'B4']
  const occupiedStations = new Set(
    todayBookings.map((b) => b.stationId)
  )
  const availableStations = stations.length - occupiedStations.size
  
  const borrowedEquipment = data.borrowRecords
    .filter((r) => !r.returned)
    .reduce((sum, r) => sum + r.quantity, 0)
  
  const last7Days: { date: string; count: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const count = data.bookings.filter((b) => b.date === dateStr).length
    last7Days.push({ date: dateStr, count })
  }
  
  res.json({
    todayBookingCount: todayBookings.length,
    availableStations,
    borrowedEquipment,
    last7DaysTrend: last7Days,
  })
})

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})
