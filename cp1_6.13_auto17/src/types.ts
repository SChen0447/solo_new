export type ReadingStatus = 'unread' | 'reading' | 'read'

export const Tag = {
  NOVEL: '小说',
  TECHNOLOGY: '技术',
  HISTORY: '历史',
  PHILOSOPHY: '哲学',
  SCIENCE: '科学',
  BIOGRAPHY: '传记'
} as const

export type TagType = typeof Tag[keyof typeof Tag]

export const ALL_TAGS: TagType[] = [
  Tag.NOVEL,
  Tag.TECHNOLOGY,
  Tag.HISTORY,
  Tag.PHILOSOPHY,
  Tag.SCIENCE,
  Tag.BIOGRAPHY
]

export interface Book {
  id: string
  title: string
  author: string
  coverUrl: string
  tags: TagType[]
  status: ReadingStatus
  createdAt: number
}

export const STATUS_LABELS: Record<ReadingStatus, string> = {
  unread: '未读',
  reading: '在读',
  read: '已读'
}
