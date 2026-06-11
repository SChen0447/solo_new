export interface Inspiration {
  id: string
  title: string
  url: string
  description: string
  colorTag: string
  notes: string
  createdAt: number
  order: number
}

export type SortField = 'createdAt' | 'title'
export type SortOrder = 'asc' | 'desc'

const STORAGE_KEY = 'inspiration_board_data'

const colorTags = [
  '#ff6b9d',
  '#c56cf0',
  '#7158e2',
  '#3ae374',
  '#ff9f43',
  '#00d2d3',
  '#ff6b6b',
  '#feca57'
]

export function getAllTags(): string[] {
  return colorTags
}

export function getAll(): Inspiration[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const data = JSON.parse(raw)
    if (!Array.isArray(data)) return []
    return data
  } catch {
    return []
  }
}

export function add(item: Omit<Inspiration, 'id' | 'createdAt' | 'order'>): Inspiration {
  const items = getAll()
  const newItem: Inspiration = {
    ...item,
    id: generateId(),
    createdAt: Date.now(),
    order: items.length
  }
  items.push(newItem)
  save(items)
  return newItem
}

export function update(id: string, changes: Partial<Inspiration>): Inspiration | null {
  const items = getAll()
  const idx = items.findIndex(i => i.id === id)
  if (idx === -1) return null
  items[idx] = { ...items[idx], ...changes }
  save(items)
  return items[idx]
}

export function remove(id: string): boolean {
  const items = getAll()
  const idx = items.findIndex(i => i.id === id)
  if (idx === -1) return false
  items.splice(idx, 1)
  items.forEach((item, i) => { item.order = i })
  save(items)
  return true
}

export function reorder(fromIndex: number, toIndex: number): void {
  const items = getAll()
  if (fromIndex < 0 || fromIndex >= items.length) return
  if (toIndex < 0 || toIndex >= items.length) return
  const [moved] = items.splice(fromIndex, 1)
  items.splice(toIndex, 0, moved)
  items.forEach((item, i) => { item.order = i })
  save(items)
}

export function filterAndSort(
  items: Inspiration[],
  options: { tag?: string; sortField?: SortField; sortOrder?: SortOrder }
): Inspiration[] {
  let result = [...items]
  if (options.tag) {
    result = result.filter(item => item.colorTag === options.tag)
  }
  const field = options.sortField || 'createdAt'
  const order = options.sortOrder || 'desc'
  result.sort((a, b) => {
    let cmp = 0
    if (field === 'createdAt') {
      cmp = a.createdAt - b.createdAt
    } else {
      cmp = a.title.localeCompare(b.title, 'zh-CN')
    }
    return order === 'asc' ? cmp : -cmp
  })
  return result
}

function save(items: Inspiration[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
