export interface RatingDimensions {
  knowledgeDepth: number
  interactivity: number
  practicality: number
}

export interface Review {
  id: string
  courseName: string
  ratings: RatingDimensions
  tags: string[]
  content: string
  nickname: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: number
  approvedAt?: number
}

export const AVAILABLE_TAGS = [
  { label: '知识深度', value: '知识深度', color: '#6366f1' },
  { label: '互动性', value: '互动性', color: '#10b981' },
  { label: '实用性', value: '实用性', color: '#f59e0b' },
  { label: '讲师优秀', value: '讲师优秀', color: '#ec4899' },
  { label: '内容充实', value: '内容充实', color: '#8b5cf6' },
]

export const DIMENSION_LABELS: Record<keyof RatingDimensions, string> = {
  knowledgeDepth: '知识深度',
  interactivity: '互动性',
  practicality: '实用性',
}
