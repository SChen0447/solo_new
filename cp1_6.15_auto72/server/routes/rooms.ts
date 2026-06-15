import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataDir = path.join(__dirname, '../../data')

const router = Router()

interface Room {
  id: string
  name: string
  description: string
  wallColor: string
  initialCamera: {
    x: number
    y: number
    z: number
  }
  createdAt: string
  updatedAt: string
}

const roomsFile = path.join(dataDir, 'rooms.json')

const readRooms = (): Room[] => {
  if (!fs.existsSync(roomsFile)) {
    return []
  }
  const data = fs.readFileSync(roomsFile, 'utf-8')
  return JSON.parse(data)
}

const writeRooms = (rooms: Room[]) => {
  fs.writeFileSync(roomsFile, JSON.stringify(rooms, null, 2))
}

const validateRoom = (room: Partial<Room>): string | null => {
  if (!room.name || room.name.trim().length === 0) {
    return '房间名称不能为空'
  }
  if (room.name.length > 100) {
    return '房间名称不能超过100个字符'
  }
  if (room.wallColor && !/^#[0-9A-Fa-f]{6}$/.test(room.wallColor)) {
    return '墙壁颜色格式不正确，应为#RRGGBB格式'
  }
  return null
}

router.get('/', (req, res) => {
  const rooms = readRooms()
  res.json(rooms)
})

router.get('/:id', (req, res) => {
  const rooms = readRooms()
  const room = rooms.find(r => r.id === req.params.id)
  if (!room) {
    return res.status(404).json({ error: '房间不存在' })
  }
  res.json(room)
})

router.post('/', (req, res) => {
  const error = validateRoom(req.body)
  if (error) {
    return res.status(400).json({ error })
  }

  const rooms = readRooms()
  const now = new Date().toISOString()
  const newRoom: Room = {
    id: uuidv4(),
    name: req.body.name,
    description: req.body.description || '',
    wallColor: req.body.wallColor || '#2c2c3a',
    initialCamera: req.body.initialCamera || { x: 0, y: 2, z: 10 },
    createdAt: now,
    updatedAt: now,
  }
  rooms.push(newRoom)
  writeRooms(rooms)
  res.status(201).json(newRoom)
})

router.put('/:id', (req, res) => {
  const error = validateRoom(req.body)
  if (error) {
    return res.status(400).json({ error })
  }

  const rooms = readRooms()
  const index = rooms.findIndex(r => r.id === req.params.id)
  if (index === -1) {
    return res.status(404).json({ error: '房间不存在' })
  }

  rooms[index] = {
    ...rooms[index],
    ...req.body,
    id: rooms[index].id,
    createdAt: rooms[index].createdAt,
    updatedAt: new Date().toISOString(),
  }
  writeRooms(rooms)
  res.json(rooms[index])
})

router.delete('/:id', (req, res) => {
  const rooms = readRooms()
  const index = rooms.findIndex(r => r.id === req.params.id)
  if (index === -1) {
    return res.status(404).json({ error: '房间不存在' })
  }
  rooms.splice(index, 1)
  writeRooms(rooms)
  res.json({ message: '删除成功' })
})

export default router
