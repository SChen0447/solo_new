export interface Comment {
  id: string
  piece_id: string
  author: string
  content: string
  created_at: string
}

export interface CodePiece {
  id: string
  title: string
  code: string
  language: string
  author: string
  tags: string[]
  likes: number
  favorites: number
  created_at: string
  comments?: Comment[]
}

export interface CreatePieceDto {
  title: string
  code: string
  language: string
  author: string
  tags: string[]
}
