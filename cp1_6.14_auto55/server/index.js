import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3001
const DATA_FILE = path.join(__dirname, 'levelData.json')

app.use(cors())
app.use(express.json())

app.post('/api/levels', (req, res) => {
  try {
    const levelData = req.body
    if (!levelData || !Array.isArray(levelData.elements)) {
      return res.status(400).json({ error: '无效的关卡数据格式' })
    }
    const data = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      ...levelData
    }
    let levels = []
    if (fs.existsSync(DATA_FILE)) {
      const fileContent = fs.readFileSync(DATA_FILE, 'utf8')
      try {
        levels = JSON.parse(fileContent)
      } catch (e) {
        levels = []
      }
    }
    levels = [data]
    fs.writeFileSync(DATA_FILE, JSON.stringify(levels, null, 2), 'utf8')
    res.json({ success: true, message: '关卡保存成功', data })
  } catch (error) {
    res.status(500).json({ success: false, message: '保存失败：' + error.message })
  }
})

app.get('/api/levels', (req, res) => {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return res.json({ success: true, data: [] })
    }
    const fileContent = fs.readFileSync(DATA_FILE, 'utf8')
    const levels = JSON.parse(fileContent)
    res.json({ success: true, data: levels })
  } catch (error) {
    res.status(500).json({ success: false, message: '读取失败：' + error.message })
  }
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
