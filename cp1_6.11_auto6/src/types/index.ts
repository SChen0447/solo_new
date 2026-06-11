export interface Issue {
  title: string
  labels: string[]
}

export interface Project {
  id: string
  name: string
  description: string
  stars: number
  forks: number
  language: string
  updatedAt: string
  url: string
  readmeSummary: string
  issues: Issue[]
}

export type Language = 'JavaScript' | 'TypeScript' | 'Python' | 'Go' | 'Rust' | 'Java'

export type SortField = 'stars' | 'updatedAt'
export type SortOrder = 'asc' | 'desc'
