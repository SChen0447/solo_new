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

export type SortField = 'createdAt' | 'title' | 'order'
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

let cache: {
  items: Inspiration[] | null
  sortedResults: Map<string, Inspiration[]>
} = {
  items: null,
  sortedResults: new Map()
}

function invalidateCache() {
  cache.items = null
  cache.sortedResults.clear()
}

export function getAllTags(): string[] {
  return colorTags
}

export function getAll(): Inspiration[] {
  if (cache.items) {
    return cache.items
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      cache.items = []
      return []
    }
    const data = JSON.parse(raw)
    if (!Array.isArray(data)) {
      cache.items = []
      return []
    }
    cache.items = data
    return data
  } catch {
    cache.items = []
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
  invalidateCache()
  return newItem
}

export function update(id: string, changes: Partial<Inspiration>): Inspiration | null {
  const items = getAll()
  const idx = items.findIndex(i => i.id === id)
  if (idx === -1) return null
  items[idx] = { ...items[idx], ...changes }
  save(items)
  invalidateCache()
  return items[idx]
}

export function remove(id: string): boolean {
  const items = getAll()
  const idx = items.findIndex(i => i.id === id)
  if (idx === -1) return false
  items.splice(idx, 1)
  items.forEach((item, i) => { item.order = i })
  save(items)
  invalidateCache()
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
  invalidateCache()
}

export function reorderById(fromId: string, toId: string, insertBefore: boolean = true): void {
  const items = getAll()
  const fromIdx = items.findIndex(i => i.id === fromId)
  const toIdx = items.findIndex(i => i.id === toId)
  if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return
  
  const [moved] = items.splice(fromIdx, 1)
  const newToIdx = fromIdx < toIdx ? toIdx - 1 : toIdx
  const insertIdx = insertBefore ? newToIdx : newToIdx + 1
  items.splice(insertIdx, 0, moved)
  
  items.forEach((item, i) => { item.order = i })
  save(items)
  invalidateCache()
}

export function filterAndSort(
  items: Inspiration[],
  options: { tag?: string; sortField?: SortField; sortOrder?: SortOrder }
): Inspiration[] {
  const cacheKey = `${options.tag || 'all'}-${options.sortField || 'createdAt'}-${options.sortOrder || 'desc'}`
  
  const itemsKey = items.map(i => i.id + i.order + i.createdAt + i.title).join('|')
  const fullKey = `${itemsKey}-${cacheKey}`
  
  const cached = cache.sortedResults.get(fullKey)
  if (cached) {
    return cached
  }
  
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
    } else if (field === 'order') {
      cmp = a.order - b.order
    } else {
      cmp = a.title.localeCompare(b.title, 'zh-CN')
    }
    return order === 'asc' ? cmp : -cmp
  })
  
  cache.sortedResults.set(fullKey, result)
  return result
}

function save(items: Inspiration[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
