import express, { Request, Response } from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'
import type { Book, StockStatus, BacklogItem, SearchSuggestion, NotifyResponse } from '../src/types'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3001
const DATA_DIR = path.join(__dirname, 'data')

app.use(express.json())

const readJSON = <T>(filename: string): T => {
  const filePath = path.join(DATA_DIR, filename)
  if (!fs.existsSync(filePath)) return [] as unknown as T
  const raw = fs.readFileSync(filePath, 'utf-8')
  return JSON.parse(raw) as T
}

const writeJSON = <T>(filename: string, data: T): void => {
  const filePath = path.join(DATA_DIR, filename)
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

const books = readJSON<Book[]>('books.json')

app.get('/api/books/search', (req: Request, res: Response) => {
  const keyword = (req.query.keyword as string || '').trim().toLowerCase()
  const category = req.query.category as string
  const status = req.query.status as StockStatus

  let filtered = [...books]

  if (keyword.length >= 2) {
    filtered = filtered.filter(book =>
      book.title.toLowerCase().includes(keyword) ||
      book.author.toLowerCase().includes(keyword)
    )
  }

  if (category) {
    filtered = filtered.filter(book => book.category === category)
  }

  if (status) {
    filtered = filtered.filter(book => book.status === status)
  }

  res.json(filtered)
})

app.get('/api/books/suggestions', (req: Request, res: Response) => {
  const keyword = (req.query.keyword as string || '').trim().toLowerCase()
  if (keyword.length < 1) {
    res.json([])
    return
  }

  const suggestions: SearchSuggestion[] = []
  const titleSet = new Set<string>()
  const authorSet = new Set<string>()

  for (const book of books) {
    if (suggestions.length >= 6) break
    if (book.title.toLowerCase().includes(keyword) && !titleSet.has(book.title)) {
      titleSet.add(book.title)
      suggestions.push({ type: 'title', value: book.title })
    }
  }

  for (const book of books) {
    if (suggestions.length >= 6) break
    if (book.author.toLowerCase().includes(keyword) && !authorSet.has(book.author)) {
      authorSet.add(book.author)
      suggestions.push({ type: 'author', value: book.author })
    }
  }

  res.json(suggestions.slice(0, 6))
})

app.get('/api/books/categories', (_req: Request, res: Response) => {
  const categories = [...new Set(books.map(b => b.category))]
  res.json(categories)
})

app.get('/api/books/:id', (req: Request, res: Response) => {
  const { id } = req.params
  const book = books.find(b => b.id === id)
  if (!book) {
    res.status(404).json({ error: '书籍未找到' })
    return
  }
  res.json(book)
})

app.get('/api/backlog', (_req: Request, res: Response) => {
  const backlog = readJSON<BacklogItem[]>('backlog.json')
  const sorted = [...backlog].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  res.json(sorted)
})

app.post('/api/backlog', (req: Request, res: Response) => {
  const { bookId, bookTitle } = req.body
  if (!bookId || !bookTitle) {
    res.status(400).json({ error: '缺少必要参数' })
    return
  }

  const backlog = readJSON<BacklogItem[]>('backlog.json')
  const existing = backlog.find(item => item.bookId === bookId)

  if (existing) {
    existing.requestCount += 1
    writeJSON('backlog.json', backlog)
    res.json(existing)
    return
  }

  const newItem: BacklogItem = {
    id: uuidv4(),
    bookId,
    bookTitle,
    date: new Date().toISOString(),
    requestCount: 1,
  }
  backlog.push(newItem)
  writeJSON('backlog.json', backlog)
  res.status(201).json(newItem)
})

app.delete('/api/backlog/:id', (req: Request, res: Response) => {
  const { id } = req.params
  const backlog = readJSON<BacklogItem[]>('backlog.json')
  const filtered = backlog.filter(item => item.id !== id)
  if (filtered.length === backlog.length) {
    res.status(404).json({ error: '记录未找到' })
    return
  }
  writeJSON('backlog.json', filtered)
  res.json({ success: true })
})

app.post('/api/notify', (req: Request, res: Response) => {
  const { bookId, email } = req.body
  if (!bookId || !email) {
    res.status(400).json({ error: '缺少必要参数' })
    return
  }

  const book = books.find(b => b.id === bookId)
  if (!book) {
    res.status(404).json({ error: '书籍未找到' })
    return
  }

  const randomMinutes = Math.floor(Math.random() * 26) + 5
  const notifyTime = new Date(Date.now() + randomMinutes * 60 * 1000).toISOString()

  const result: NotifyResponse = {
    success: true,
    notifyTime,
    bookTitle: book.title,
    message: `我们已记录您的提醒请求，预计将在 ${randomMinutes} 分钟后通过 ${email} 通知您《${book.title}》的到货信息。`,
  }

  res.json(result)
})

app.listen(PORT, () => {
  console.log(`书店库存服务已启动: http://localhost:${PORT}`)
})
