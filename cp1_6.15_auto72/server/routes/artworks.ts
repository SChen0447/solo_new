import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'
import multer from 'multer'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataDir = path.join(__dirname, '../../data')
const uploadsDir = path.join(__dirname, '../../uploads')

const router = Router()

interface Artwork {
  id: string
  roomId: string
  name: string
  author: string
  year: number
  description: string
  modelFile: string
  position: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number }
  scale: number
  createdAt: string
  updatedAt: string
}

const artworksFile = path.join(dataDir, 'artworks.json')

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    const filename = `${uuidv4()}${ext}`
    cb(null, filename)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.gltf', '.glb']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowedExts.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error('只支持 .gltf 和 .glb 格式的模型文件'))
    }
  },
})

const readArtworks = (): Artwork[] => {
  if (!fs.existsSync(artworksFile)) {
    return []
  }
  const data = fs.readFileSync(artworksFile, 'utf-8')
  return JSON.parse(data)
}

const writeArtworks = (artworks: Artwork[]) => {
  fs.writeFileSync(artworksFile, JSON.stringify(artworks, null, 2))
}

router.get('/', (req, res) => {
  const { roomId } = req.query
  let artworks = readArtworks()
  if (roomId) {
    artworks = artworks.filter(a => a.roomId === roomId)
  }
  res.json(artworks)
})

router.get('/:id', (req, res) => {
  const artworks = readArtworks()
  const artwork = artworks.find(a => a.id === req.params.id)
  if (!artwork) {
    return res.status(404).json({ error: '作品不存在' })
  }
  res.json(artwork)
})

router.post('/', upload.single('model'), (req, res) => {
  const artworks = readArtworks()
  const now = new Date().toISOString()
  const modelFile = req.file ? req.file.filename : ''

  const newArtwork: Artwork = {
    id: uuidv4(),
    roomId: req.body.roomId,
    name: req.body.name || '未命名作品',
    author: req.body.author || '未知艺术家',
    year: parseInt(req.body.year) || new Date().getFullYear(),
    description: req.body.description || '',
    modelFile,
    position: {
      x: parseFloat(req.body.positionX) || 0,
      y: parseFloat(req.body.positionY) || 0,
      z: parseFloat(req.body.positionZ) || 0,
    },
    rotation: {
      x: parseFloat(req.body.rotationX) || 0,
      y: parseFloat(req.body.rotationY) || 0,
      z: parseFloat(req.body.rotationZ) || 0,
    },
    scale: parseFloat(req.body.scale) || 1,
    createdAt: now,
    updatedAt: now,
  }
  artworks.push(newArtwork)
  writeArtworks(artworks)
  res.status(201).json(newArtwork)
})

router.put('/:id', (req, res) => {
  const artworks = readArtworks()
  const index = artworks.findIndex(a => a.id === req.params.id)
  if (index === -1) {
    return res.status(404).json({ error: '作品不存在' })
  }

  artworks[index] = {
    ...artworks[index],
    ...req.body,
    id: artworks[index].id,
    createdAt: artworks[index].createdAt,
    updatedAt: new Date().toISOString(),
  }
  writeArtworks(artworks)
  res.json(artworks[index])
})

router.delete('/:id', (req, res) => {
  const artworks = readArtworks()
  const index = artworks.findIndex(a => a.id === req.params.id)
  if (index === -1) {
    return res.status(404).json({ error: '作品不存在' })
  }

  const artwork = artworks[index]
  if (artwork.modelFile) {
    const filePath = path.join(uploadsDir, artwork.modelFile)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  }

  artworks.splice(index, 1)
  writeArtworks(artworks)
  res.json({ message: '删除成功' })
})

export default router
