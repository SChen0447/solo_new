import axios from 'axios'
import { CodePiece, CreatePieceDto, Comment } from './types'

const api = axios.create({
  baseURL: '/api',
})

export const getPieces = async (search?: string, language?: string) => {
  const params: Record<string, string> = {}
  if (search) params.search = search
  if (language && language !== 'all') params.language = language
  const res = await api.get('/pieces', { params })
  return res.data.pieces as CodePiece[]
}

export const getPiece = async (id: string) => {
  const res = await api.get(`/pieces/${id}`)
  return res.data as CodePiece & { comments: Comment[] }
}

export const createPiece = async (piece: CreatePieceDto) => {
  const res = await api.post('/pieces', piece)
  return res.data as CodePiece
}

export const addComment = async (pieceId: string, author: string, content: string) => {
  const res = await api.post(`/pieces/${pieceId}/comment`, { author, content })
  return res.data as Comment
}

export const likePiece = async (pieceId: string) => {
  const res = await api.post(`/pieces/${pieceId}/like`)
  return res.data.likes as number
}

export const favoritePiece = async (pieceId: string) => {
  const res = await api.post(`/pieces/${pieceId}/favorite`)
  return res.data.favorites as number
}
