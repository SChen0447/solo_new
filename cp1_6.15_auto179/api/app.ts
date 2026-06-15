import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { getArtworks, addVote, getTotalVotes, addComment, getComments } from './db.js'

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.get('/api/artworks', (_req: Request, res: Response) => {
  const artworks = getArtworks()
  const totalVotes = getTotalVotes()
  res.json({ artworks, totalVotes })
})

app.post('/api/vote', (req: Request, res: Response) => {
  const { artworkId } = req.body
  if (!artworkId) {
    res.status(400).json({ success: false, error: 'artworkId is required' })
    return
  }
  const voteCount = addVote(artworkId)
  res.json({ success: true, voteCount })
})

app.post('/api/comment', (req: Request, res: Response) => {
  const { artworkId, username, content, avatarColor } = req.body
  if (!artworkId || !username || !content) {
    res.status(400).json({ success: false, error: 'artworkId, username and content are required' })
    return
  }
  const comment = addComment(artworkId, username, content, avatarColor || '#3498db')
  res.json({ success: true, comment })
})

app.get('/api/comments/:artworkId', (req: Request, res: Response) => {
  const { artworkId } = req.params
  const comments = getComments(artworkId)
  res.json({ comments })
})

app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ success: true, message: 'ok' })
})

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Server error:', error)
  res.status(500).json({ success: false, error: 'Server internal error' })
})

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'API not found' })
})

export default app
