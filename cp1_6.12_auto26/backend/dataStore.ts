import { v4 as uuidv4 } from 'uuid'

export type TaskType = '开发' | '测试' | '会议' | '文档'
export type Priority = '高' | '中' | '低'
export type BlockerStatus = '未解决' | '已解决' | '待沟通'
export type TemplateType = 'business' | 'creative'

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

export interface ExportRequest {
  summary: SummaryData
  template: TemplateType
  projectName: string
  exporterName: string
  startDate: string
  endDate: string
}

const entries = new Map<string, TimeEntry>()
const completedItems = new Map<string, CompletedItem>()
const blockerItems = new Map<string, BlockerItem>()

function initMockData() {
  const today = new Date()
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const dates = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    dates.push(fmt(d))
  }

  const mockEntries: Omit<TimeEntry, 'id'>[] = [
    { date: dates[0], taskName: '用户登录模块开发', hours: 4, taskType: '开发', description: '实现登录表单和验证逻辑' },
    { date: dates[0], taskName: '需求评审会议', hours: 1.5, taskType: '会议', description: '与产品经理讨论Q3需求' },
    { date: dates[1], taskName: '用户登录模块开发', hours: 3, taskType: '开发', description: '对接后端登录接口' },
    { date: dates[1], taskName: '编写单元测试', hours: 2, taskType: '测试', description: '登录模块单元测试用例' },
    { date: dates[2], taskName: '接口文档更新', hours: 2, taskType: '文档', description: '更新用户模块API文档' },
    { date: dates[2], taskName: '代码审查', hours: 1.5, taskType: '开发', description: '审查同事提交的PR' },
    { date: dates[3], taskName: '性能优化', hours: 3, taskType: '开发', description: '首页加载速度优化' },
    { date: dates[3], taskName: '站会沟通', hours: 0.5, taskType: '会议', description: '每日站会' },
    { date: dates[4], taskName: '用户模块联调测试', hours: 3.5, taskType: '测试', description: '前后端联调测试' },
    { date: dates[5], taskName: '项目复盘文档', hours: 2.5, taskType: '文档', description: '编写本周项目复盘文档' },
    { date: dates[5], taskName: '技术分享会', hours: 2, taskType: '会议', description: 'React性能优化分享' },
    { date: dates[6], taskName: 'Bug修复', hours: 3, taskType: '开发', description: '修复线上用户反馈的3个bug' },
  ]

  mockEntries.forEach(e => {
    const id = uuidv4()
    entries.set(id, { ...e, id })
  })

  const mockCompleted: Omit<CompletedItem, 'id'>[] = [
    { content: '完成用户登录模块前端开发', priority: '高', achievedGoal: true, order: 0 },
    { content: '完成登录模块单元测试覆盖率达85%', priority: '中', achievedGoal: true, order: 1 },
    { content: '首页性能优化，加载速度提升40%', priority: '高', achievedGoal: true, order: 2 },
    { content: '编写项目技术文档v2.0', priority: '低', achievedGoal: false, order: 3 },
  ]
  mockCompleted.forEach(c => {
    const id = uuidv4()
    completedItems.set(id, { ...c, id })
  })

  const mockBlockers: Omit<BlockerItem, 'id'>[] = [
    { content: '后端登录接口响应时间过长，需要优化', status: '待沟通', order: 0 },
    { content: '第三方短信服务不稳定，影响注册流程', status: '未解决', order: 1 },
    { content: 'UI设计稿延迟交付，影响首页改版进度', status: '已解决', order: 2 },
  ]
  mockBlockers.forEach(b => {
    const id = uuidv4()
    blockerItems.set(id, { ...b, id })
  })
}

initMockData()

export function addEntry(entry: Omit<TimeEntry, 'id'>): TimeEntry {
  const id = uuidv4()
  const newEntry = { ...entry, id }
  entries.set(id, newEntry)
  return newEntry
}

export function getEntries(startDate?: string, endDate?: string): TimeEntry[] {
  const all = Array.from(entries.values())
  return all.filter(e => {
    if (startDate && e.date < startDate) return false
    if (endDate && e.date > endDate) return false
    return true
  }).sort((a, b) => a.date.localeCompare(b.date) || a.taskName.localeCompare(b.taskName))
}

export function deleteEntry(id: string): boolean {
  return entries.delete(id)
}

export function addCompletedItem(item: Omit<CompletedItem, 'id'>): CompletedItem {
  const id = uuidv4()
  const newItem = { ...item, id }
  completedItems.set(id, newItem)
  return newItem
}

export function getCompletedItems(): CompletedItem[] {
  return Array.from(completedItems.values()).sort((a, b) => a.order - b.order)
}

export function updateCompletedItem(id: string, updates: Partial<CompletedItem>): CompletedItem | null {
  const item = completedItems.get(id)
  if (!item) return null
  const updated = { ...item, ...updates }
  completedItems.set(id, updated)
  return updated
}

export function deleteCompletedItem(id: string): boolean {
  return completedItems.delete(id)
}

export function addBlockerItem(item: Omit<BlockerItem, 'id'>): BlockerItem {
  const id = uuidv4()
  const newItem = { ...item, id }
  blockerItems.set(id, newItem)
  return newItem
}

export function getBlockerItems(): BlockerItem[] {
  return Array.from(blockerItems.values()).sort((a, b) => a.order - b.order)
}

export function updateBlockerItem(id: string, updates: Partial<BlockerItem>): BlockerItem | null {
  const item = blockerItems.get(id)
  if (!item) return null
  const updated = { ...item, ...updates }
  blockerItems.set(id, updated)
  return updated
}

export function deleteBlockerItem(id: string): boolean {
  return blockerItems.delete(id)
}

export function getSummary(startDate?: string, endDate?: string): SummaryData {
  const filtered = getEntries(startDate, endDate)
  const totalHours = filtered.reduce((sum, e) => sum + e.hours, 0)

  const hoursByType: Record<TaskType, number> = {
    '开发': 0,
    '测试': 0,
    '会议': 0,
    '文档': 0,
  }
  filtered.forEach(e => {
    hoursByType[e.taskType] += e.hours
  })

  const hoursByDate: Record<string, number> = {}
  filtered.forEach(e => {
    hoursByDate[e.date] = (hoursByDate[e.date] || 0) + e.hours
  })

  return {
    totalHours,
    hoursByType,
    hoursByDate,
    completedItems: getCompletedItems(),
    blockerItems: getBlockerItems(),
  }
}
