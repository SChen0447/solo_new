import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3001

app.use(express.json())

const DATA_DIR = path.join(__dirname, 'data')
const DEVICES_FILE = path.join(DATA_DIR, 'devices.json')
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json')

const readJSON = (filePath: string): any[] => {
  if (!fs.existsSync(filePath)) return []
  const raw = fs.readFileSync(filePath, 'utf-8')
  return raw ? JSON.parse(raw) : []
}

const writeJSON = (filePath: string, data: any[]) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

interface Device {
  id: string
  name: string
  category: string
  dailyPrice: number
  deposit: number
  imageUrl: string
  description: string
  ownerId: string
  ownerName: string
  createdAt: string
}

interface Order {
  id: string
  deviceId: string
  deviceName: string
  deviceImageUrl: string
  renterId: string
  renterName: string
  ownerId: string
  ownerName: string
  days: number
  totalPrice: number
  deposit: number
  status: 'pending' | 'paid' | 'renting' | 'completed' | 'cancelled'
  createdAt: string
  startDate: string
}

app.get('/api/devices', (req, res) => {
  const devices: Device[] = readJSON(DEVICES_FILE)
  res.json(devices)
})

app.get('/api/devices/:id', (req, res) => {
  const devices: Device[] = readJSON(DEVICES_FILE)
  const device = devices.find(d => d.id === req.params.id)
  if (!device) return res.status(404).json({ error: '设备不存在' })
  res.json(device)
})

app.post('/api/devices', (req, res) => {
  const devices: Device[] = readJSON(DEVICES_FILE)
  const newDevice: Device = {
    id: uuidv4(),
    ...req.body,
    createdAt: new Date().toISOString()
  }
  devices.push(newDevice)
  writeJSON(DEVICES_FILE, devices)
  res.status(201).json(newDevice)
})

app.get('/api/orders', (req, res) => {
  const orders: Order[] = readJSON(ORDERS_FILE)
  res.json(orders)
})

app.post('/api/orders', (req, res) => {
  const orders: Order[] = readJSON(ORDERS_FILE)
  const devices: Device[] = readJSON(DEVICES_FILE)

  const { deviceId, days, renterId, renterName } = req.body

  const device = devices.find(d => d.id === deviceId)
  if (!device) return res.status(404).json({ error: '设备不存在' })

  const hasActiveOrder = orders.some(
    o => o.deviceId === deviceId && 
    o.status !== 'completed' && 
    o.status !== 'cancelled'
  )
  if (hasActiveOrder) {
    return res.status(400).json({ error: '该设备当前有未完成的订单，暂不可预订' })
  }

  const totalPrice = device.dailyPrice * days

  const newOrder: Order = {
    id: uuidv4(),
    deviceId,
    deviceName: device.name,
    deviceImageUrl: device.imageUrl,
    renterId,
    renterName,
    ownerId: device.ownerId,
    ownerName: device.ownerName,
    days,
    totalPrice,
    deposit: device.deposit,
    status: 'pending',
    createdAt: new Date().toISOString(),
    startDate: new Date().toISOString()
  }

  orders.push(newOrder)
  writeJSON(ORDERS_FILE, orders)
  res.status(201).json(newOrder)
})

app.patch('/api/orders/:id/status', (req, res) => {
  const orders: Order[] = readJSON(ORDERS_FILE)
  const { status } = req.body
  const index = orders.findIndex(o => o.id === req.params.id)
  if (index === -1) return res.status(404).json({ error: '订单不存在' })
  orders[index].status = status
  writeJSON(ORDERS_FILE, orders)
  res.json(orders[index])
})

app.get('/api/stats', (req, res) => {
  const devices: Device[] = readJSON(DEVICES_FILE)
  const orders: Order[] = readJSON(ORDERS_FILE)

  const totalDevices = devices.length

  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthlyRevenue = orders
    .filter(o => {
      const orderDate = new Date(o.createdAt)
      return orderDate >= thisMonthStart && (o.status === 'paid' || o.status === 'renting' || o.status === 'completed')
    })
    .reduce((sum, o) => sum + o.totalPrice, 0)

  const rentingCount = orders.filter(o => o.status === 'renting').length

  const dailyRevenue: { date: string; revenue: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const day = subDays(startOfDay(now), i)
    const dayEnd = endOfDay(day)
    const dayRevenue = orders
      .filter(o => {
        const orderDate = new Date(o.createdAt)
        return orderDate >= day && orderDate <= dayEnd && 
          (o.status === 'paid' || o.status === 'renting' || o.status === 'completed')
      })
      .reduce((sum, o) => sum + o.totalPrice, 0)
    dailyRevenue.push({
      date: format(day, 'MM-dd'),
      revenue: dayRevenue
    })
  }

  const categoryRents: Record<string, number> = {}
  orders.forEach(order => {
    const device = devices.find(d => d.id === order.deviceId)
    if (device && (order.status === 'paid' || order.status === 'renting' || order.status === 'completed')) {
      categoryRents[device.category] = (categoryRents[device.category] || 0) + 1
    }
  })

  res.json({
    totalDevices,
    monthlyRevenue,
    rentingCount,
    dailyRevenue,
    categoryRents
  })
})

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})
