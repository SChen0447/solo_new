import { Router, type Request, type Response } from 'express'
import multer from 'multer'
import { recognize } from 'tesseract.js'

const router = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
})

interface ParsedTask {
  name: string
  startDate: string
  endDate: string
  progress: number
  priority: 'high' | 'medium' | 'low'
}

function parseLineToTask(line: string): ParsedTask | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  const taskPattern =
    /^(.+?)\s+(\d{1,2}\/\d{1,2})\s+(\d{1,2}\/\d{1,2})\s+(\d{1,3})%?\s*$/
  const match = trimmed.match(taskPattern)

  if (!match) return null

  const name = match[1].trim()
  const startParts = match[2].split('/')
  const endParts = match[3].split('/')
  const progress = Math.min(100, Math.max(0, parseInt(match[4], 10)))

  const year = new Date().getFullYear()
  const startMonth = parseInt(startParts[0], 10)
  const startDay = parseInt(startParts[1], 10)
  const endMonth = parseInt(endParts[0], 10)
  const endDay = parseInt(endParts[1], 10)

  const startDate = `${year}-${String(startMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`
  const endDate = `${year}-${String(endMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`

  let priority: 'high' | 'medium' | 'low' = 'medium'
  if (progress >= 80) priority = 'low'
  else if (progress <= 30) priority = 'high'

  return { name, startDate, endDate, progress, priority }
}

function parseOcrText(text: string): ParsedTask[] {
  const lines = text.split('\n')
  const tasks: ParsedTask[] = []

  for (const line of lines) {
    const task = parseLineToTask(line)
    if (task) {
      tasks.push(task)
    }
  }

  return tasks
}

router.post(
  '/',
  upload.single('image'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, error: 'No image file provided' })
        return
      }

      const {
        data: { text },
      } = await recognize(req.file.buffer, 'chi_sim+eng', {
        logger: () => {},
      })

      const tasks = parseOcrText(text)

      res.status(200).json({
        success: true,
        tasks,
        rawText: text,
      })
    } catch (error) {
      console.error('OCR processing error:', error)
      res.status(500).json({
        success: false,
        error: 'OCR processing failed',
      })
    }
  }
)

export default router
