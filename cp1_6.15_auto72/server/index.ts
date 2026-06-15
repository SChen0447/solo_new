import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import roomsRouter from './routes/rooms.js'
import artworksRouter from './routes/artworks.js'
import visitLogRouter from './routes/visit-log.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

const dataDir = path.join(__dirname, '../data')
const uploadsDir = path.join(__dirname, '../uploads')

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

app.use('/uploads', express.static(uploadsDir))

app.use('/api/rooms', roomsRouter)
app.use('/api/artworks', artworksRouter)
app.use('/api/visit-log', visitLogRouter)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Virtual Art Gallery API is running' })
})

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})

export default app
