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

let cachedItems: Inspiration[] | null = null
let cacheVersion = 0

function bumpCacheVersion() {
  cacheVersion++
  cachedItems = null
}

export function getAllTags(): string[] {
  return colorTags
}

export function getCacheVersion(): number {
  return cacheVersion
}

export function getAll(): Inspiration[] {
  if (cachedItems !== null) {
    return cachedItems
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      cachedItems = []
      return []
    }
    const data = JSON.parse(raw)
    if (!Array.isArray(data)) {
      cachedItems = []
      return []
    }
    cachedItems = data
    return data
  } catch {
    cachedItems = []
    return []
  }
}

export function add(item: Omit<Inspiration, 'id' | 'createdAt' | 'order'>): Inspiration {
  const items = getAll().slice()
  const newItem: Inspiration = {
    ...item,
    id: generateId(),
    createdAt: Date.now(),
    order: items.length
  }
  items.push(newItem)
  save(items)
  bumpCacheVersion()
  return newItem
}

export function update(id: string, changes: Partial<Inspiration>): Inspiration | null {
  const items = getAll().slice()
  const idx = items.findIndex(i => i.id === id)
  if (idx === -1) return null
  items[idx] = { ...items[idx], ...changes }
  save(items)
  bumpCacheVersion()
  return items[idx]
}

export function remove(id: string): boolean {
  const items = getAll().slice()
  const idx = items.findIndex(i => i.id === id)
  if (idx === -1) return false
  items.splice(idx, 1)
  items.forEach((item, i) => { item.order = i })
  save(items)
  bumpCacheVersion()
  return true
}

export function reorder(fromIndex: number, toIndex: number): void {
  const items = getAll().slice()
  if (fromIndex < 0 || fromIndex >= items.length) return
  if (toIndex < 0 || toIndex >= items.length) return
  const [moved] = items.splice(fromIndex, 1)
  items.splice(toIndex, 0, moved)
  items.forEach((item, i) => { item.order = i })
  save(items)
  bumpCacheVersion()
}

interface FilterOptions {
  tag?: string
  sortField?: SortField
  sortOrder?: SortOrder
}

const filterCache = new Map<string, { version: number; result: Inspiration[] }>()

export function filterAndSort(
  items: Inspiration[],
  options: FilterOptions
): Inspiration[] {
  const tag = options.tag || '__all__'
  const sortField = options.sortField || 'createdAt'
  const sortOrder = options.sortOrder || 'desc'
  const cacheKey = `${tag}|${sortField}|${sortOrder}`
  const itemsSignature = items.map(i => `${i.id}:${i.order}:${i.createdAt}:${i.title}:${i.colorTag}`).join(',')

  const fullKey = `${cacheKey}|${itemsSignature}`
  const cached = filterCache.get(fullKey)
  if (cached && cached.version === cacheVersion) {
    return cached.result
  }

  let result = items.slice()
  if (options.tag) {
    result = result.filter(item => item.colorTag === options.tag)
  }
  const field = sortField
  const order = sortOrder
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

  if (filterCache.size > 50) {
    filterCache.clear()
  }
  filterCache.set(fullKey, { version: cacheVersion, result })

  return result
}

function save(items: Inspiration[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
