export type TaskType = '开发' | '测试' | '会议' | '文档'
export type Priority = '高' | '中' | '低'
export type BlockerStatus = '未解决' | '已解决' | '待沟通'
export type TemplateType = 'business' | 'creative'
export type TimeRange = 'day' | 'week' | 'month' | 'custom'
export type ViewTab = 'time' | 'items' | 'report'

export interface TimeEntry {
  id: string
  date: string
  taskName: string
  hours: number
  taskType: TaskType
  description: string
}

export interface CompletedItem {
  id: string
  content: string
  priority: Priority
  achievedGoal: boolean
  order: number
}

export interface BlockerItem {
  id: string
  content: string
  status: BlockerStatus
  order: number
}

export interface SummaryData {
  totalHours: number
  hoursByType: Record<TaskType, number>
  hoursByDate: Record<string, number>
  completedItems: CompletedItem[]
  blockerItems: BlockerItem[]
}

export const TASK_TYPES: TaskType[] = ['开发', '测试', '会议', '文档']
export const PRIORITIES: Priority[] = ['高', '中', '低']
export const BLOCKER_STATUSES: BlockerStatus[] = ['未解决', '已解决', '待沟通']

export const TYPE_COLORS: Record<TaskType, string> = {
  '开发': '#4A6FA5',
  '测试': '#F5A623',
  '会议': '#7B61FF',
  '文档': '#27AE60',
}
