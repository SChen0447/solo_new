import { useState, useEffect, useMemo, useRef, useCallback } from 'preact/hooks'
import { Card } from './Card'
import { Modal } from './Modal'
import {
  getAll,
  add,
  update,
  remove,
  filterAndSort,
  getAllTags,
  getCacheVersion,
  type Inspiration,
  type SortField,
  type SortOrder
} from './storage'

const PREFS_KEY = 'inspiration_board_prefs'

interface Prefs {
  selectedTag: string
  sortField: SortField
  sortOrder: SortOrder
}

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { selectedTag: '', sortField: 'order', sortOrder: 'asc' }
}

function savePrefs(prefs: Prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {}
}

function generateSampleData(): Inspiration[] {
  const samples = [
    {
      title: '极简主义设计灵感集合',
      url: 'https://dribbble.com',
      description: '收集了一些极简主义的UI设计案例，留白和排版都非常考究，适合做产品设计参考，尤其是Dashboard类应用。',
      colorTag: '#7158e2',
      notes: '可以参考用于下一个项目的首页设计'
    },
    {
      title: 'Midjourney 提示词技巧大全',
      url: 'https://midjourney.com',
      description: '整理了一些好用的AI绘画提示词，适合生成概念图。',
      colorTag: '#ff6b9d',
      notes: ''
    },
    {
      title: 'CSS Grid 完全指南与实战',
      url: 'https://css-tricks.com',
      description: '非常详细的 Grid 布局教程，从入门到精通，包含大量实战案例和浏览器兼容性说明。',
      colorTag: '#3ae374',
      notes: '瀑布流布局可以参考这里的技巧'
    },
    {
      title: '配色方案收集工具',
      url: 'https://coolors.co',
      description: '一个在线配色工具。',
      colorTag: '#ff9f43',
      notes: ''
    },
    {
      title: 'Preact 性能优化最佳实践',
      url: 'https://preactjs.com',
      description: 'Preact 官方文档中的性能优化最佳实践，还有 signals 的使用教程和代码示例。',
      colorTag: '#00d2d3',
      notes: '记得看看 signals 部分'
    },
    {
      title: '毛玻璃效果实现与降级方案',
      url: 'https://developer.mozilla.org',
      description: 'backdrop-filter 的各种用法和兼容性说明，以及降级方案，包含详细的浏览器支持情况表格。',
      colorTag: '#c56cf0',
      notes: '需要考虑不支持时的降级方案'
    }
  ]
  return samples.map((s, i) => ({
    id: Date.now().toString(36) + i,
    ...s,
    createdAt: Date.now() - (6 - i) * 86400000,
    order: i
  }))
}

export function App() {
  const [items, setItems] = useState<Inspiration[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs())
  const [showAddForm, setShowAddForm] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [columnCount, setColumnCount] = useState(3)
  const [cacheVer, setCacheVer] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  const [formData, setFormData] = useState({
    title: '',
    url: '',
    description: '',
    colorTag: '#7158e2'
  })

  const refreshItems = useCallback(() => {
    setItems([...getAll()])
    setCacheVer(getCacheVersion())
  }, [])

  useEffect(() => {
    let data = getAll()
    if (data.length === 0) {
      data = generateSampleData()
      data.forEach(item => {
        add({
          title: item.title,
          url: item.url,
          description: item.description,
          colorTag: item.colorTag,
          notes: item.notes
        })
      })
      data = getAll()
    }
    setItems(data)
    setCacheVer(getCacheVersion())
  }, [])

  useEffect(() => {
    const updateColumns = () => {
      const w = window.innerWidth
      if (w < 640) setColumnCount(1)
      else if (w < 1024) setColumnCount(2)
      else setColumnCount(3)
    }
    updateColumns()
    window.addEventListener('resize', updateColumns)
    return () => window.removeEventListener('resize', updateColumns)
  }, [])

  useEffect(() => {
    savePrefs(prefs)
  }, [prefs])

  const displayedItems = useMemo(() => {
    const start = performance.now()
    const result = filterAndSort(items, {
      tag: prefs.selectedTag,
      sortField: prefs.sortField,
      sortOrder: prefs.sortOrder
    })
    const elapsed = performance.now() - start
    if (elapsed > 50) {
      console.warn(`筛选排序耗时 ${elapsed.toFixed(1)}ms，超过50ms目标`)
    }
    return result
  }, [items, prefs.selectedTag, prefs.sortField, prefs.sortOrder, cacheVer])

  const masonryColumns = useMemo(() => {
    const cols: Inspiration[][] = Array.from({ length: columnCount }, () => [])
    const colHeights = new Array(columnCount).fill(0)

    displayedItems.forEach(item => {
      let minCol = 0
      for (let i = 1; i < columnCount; i++) {
        if (colHeights[i] < colHeights[minCol]) {
          minCol = i
        }
      }
      cols[minCol].push(item)
      colHeights[minCol] += estimateCardHeight(item) + 16
    })

    return cols
  }, [displayedItems, columnCount])

  const selectedItem = useMemo(() => {
    return items.find(i => i.id === selectedId) || null
  }, [items, selectedId])

  const handleAdd = useCallback(() => {
    if (!formData.title.trim()) return
    add({
      title: formData.title.trim(),
      url: formData.url.trim(),
      description: formData.description.trim(),
      colorTag: formData.colorTag,
      notes: ''
    })
    refreshItems()
    setFormData({ title: '', url: '', description: '', colorTag: '#7158e2' })
    setShowAddForm(false)
  }, [formData, refreshItems])

  const handleUpdateNotes = useCallback((id: string, notes: string) => {
    update(id, { notes })
    refreshItems()
  }, [refreshItems])

  const handleDelete = useCallback((id: string) => {
    remove(id)
    refreshItems()
    setSelectedId(null)
  }, [refreshItems])

  const handleDragStart = useCallback((id: string, e: DragEvent) => {
    setDraggingId(id)
    setDragOverId(null)
    if (prefs.sortField !== 'order') {
      setPrefs({ ...prefs, sortField: 'order', sortOrder: 'asc' })
    }
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move'
      try {
        e.dataTransfer.setData('text/plain', id)
      } catch {}
    }
  }, [prefs])

  const handleDragEnterCard = useCallback((id: string) => {
    if (draggingId && id !== draggingId) {
      setDragOverId(id)
    }
  }, [draggingId])

  const handleDragLeaveCard = useCallback((id: string) => {
    if (dragOverId === id) {
      setDragOverId(null)
    }
  }, [dragOverId])

  const handleDropOnCard = useCallback((targetId: string) => {
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null)
      setDragOverId(null)
      return
    }

    const fromIdx = displayedItems.findIndex(i => i.id === draggingId)
    const toIdx = displayedItems.findIndex(i => i.id === targetId)
    if (fromIdx === -1 || toIdx === -1) {
      setDraggingId(null)
      setDragOverId(null)
      return
    }

    const newDisplayed = displayedItems.slice()
    const [removed] = newDisplayed.splice(fromIdx, 1)
    newDisplayed.splice(toIdx, 0, removed)

    const allItems = getAll().slice()
    const orderMap = new Map<string, number>()
    newDisplayed.forEach((item, idx) => {
      orderMap.set(item.id, idx)
    })
    let nextOrder = newDisplayed.length
    allItems.forEach(item => {
      if (!orderMap.has(item.id)) {
        orderMap.set(item.id, nextOrder++)
      }
    })
    allItems.forEach(item => {
      const newOrder = orderMap.get(item.id)
      if (newOrder !== undefined) {
        item.order = newOrder
      }
    })
    localStorage.setItem('inspiration_board_data', JSON.stringify(allItems))
    refreshItems()

    setDraggingId(null)
    setDragOverId(null)
  }, [draggingId, displayedItems, refreshItems])

  const handleDragEnd = useCallback(() => {
    setDraggingId(null)
    setDragOverId(null)
  }, [])

  const handleContainerDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move'
    }
  }, [])

  const handleContainerDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
  }, [])

  const tags = getAllTags()

  return (
    <div class="app-root">
      <div class="bg-bg" />
      <div class="bg-orb bg-orb-1" />
      <div class="bg-orb bg-orb-2" />
      <div class="bg-orb bg-orb-3" />
      <div class="bg-grain" />

      <header class="app-header">
        <div class="app-header-inner">
          <div class="brand">
            <span class="brand-emoji">✨</span>
            <h1 class="brand-title">灵感快闪板</h1>
          </div>
          <button
            class={showAddForm ? 'add-btn add-btn-active' : 'add-btn'}
            onClick={() => setShowAddForm(s => !s)}
          >
            <span class="add-btn-icon">{showAddForm ? '−' : '+'}</span>
            <span>{showAddForm ? '取消' : '添加灵感'}</span>
          </button>
        </div>
      </header>

      {showAddForm && (
        <section class="add-panel">
          <div class="add-card">
            <h3 class="add-title">添加新灵感</h3>
            <div class="field">
              <label class="field-label">标题</label>
              <input
                type="text"
                class="field-input"
                value={formData.title}
                onInput={(e) => setFormData({ ...formData, title: (e.target as HTMLInputElement).value })}
                placeholder="给这个灵感起个名字"
                autoFocus
              />
            </div>
            <div class="field">
              <label class="field-label">链接</label>
              <input
                type="url"
                class="field-input"
                value={formData.url}
                onInput={(e) => setFormData({ ...formData, url: (e.target as HTMLInputElement).value })}
                placeholder="https://..."
              />
            </div>
            <div class="field">
              <label class="field-label">描述</label>
              <textarea
                class="field-textarea"
                value={formData.description}
                onInput={(e) => setFormData({ ...formData, description: (e.target as HTMLTextAreaElement).value })}
                placeholder="简短描述一下..."
                rows={3}
              />
            </div>
            <div class="field">
              <label class="field-label">颜色标签</label>
              <div class="color-row">
                {tags.map(tag => (
                  <button
                    key={tag}
                    class={formData.colorTag === tag ? 'color-chip color-chip-active' : 'color-chip'}
                    style={{ background: tag }}
                    onClick={() => setFormData({ ...formData, colorTag: tag })}
                    aria-label={`选择颜色 ${tag}`}
                  />
                ))}
              </div>
            </div>
            <div class="add-actions">
              <button class="ghost-btn" onClick={() => setShowAddForm(false)}>
                取消
              </button>
              <button
                class="primary-btn"
                onClick={handleAdd}
                disabled={!formData.title.trim()}
              >
                添加
              </button>
            </div>
          </div>
        </section>
      )}

      <section class="toolbar">
        <div class="tag-row">
          <button
            class={prefs.selectedTag === '' ? 'tag-pill tag-pill-active' : 'tag-pill'}
            onClick={() => setPrefs({ ...prefs, selectedTag: '' })}
          >
            全部
          </button>
          {tags.map(tag => (
            <button
              key={tag}
              class={prefs.selectedTag === tag ? 'tag-pill tag-pill-active' : 'tag-pill'}
              onClick={() => setPrefs({ ...prefs, selectedTag: tag })}
              title={`筛选 ${tag}`}
            >
              <span class="tag-dot" style={{ background: tag }} />
            </button>
          ))}
        </div>

        <div class="sort-row">
          <select
            class="sort-select"
            value={prefs.sortField}
            onChange={(e) => setPrefs({ ...prefs, sortField: (e.target as HTMLSelectElement).value as SortField })}
          >
            <option value="order">手动排序</option>
            <option value="createdAt">按创建时间</option>
            <option value="title">按标题</option>
          </select>
          <button
            class="sort-order"
            onClick={() => setPrefs({
              ...prefs,
              sortOrder: prefs.sortOrder === 'asc' ? 'desc' : 'asc'
            })}
            title={prefs.sortOrder === 'asc' ? '升序' : '降序'}
          >
            {prefs.sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </section>

      <main
        class="board"
        ref={listRef}
        onDragOver={handleContainerDragOver}
        onDrop={handleContainerDrop}
      >
        <div class={`masonry cols-${columnCount}`}>
          {masonryColumns.map((column, colIdx) => (
            <div key={colIdx} class="masonry-col">
              {column.map(item => (
                <div key={item.id} class="masonry-item">
                  <Card
                    item={item}
                    index={0}
                    onClick={() => setSelectedId(item.id)}
                    onDragStart={(e) => handleDragStart(item.id, e)}
                    onDragEnter={() => handleDragEnterCard(item.id)}
                    onDragLeave={() => handleDragLeaveCard(item.id)}
                    onDrop={() => handleDropOnCard(item.id)}
                    onDragEnd={handleDragEnd}
                    isDragging={draggingId === item.id}
                    isDragOver={dragOverId === item.id && draggingId !== item.id}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>

        {displayedItems.length === 0 && (
          <div class="empty">
            <div class="empty-icon">📭</div>
            <p class="empty-text">还没有灵感</p>
            <p class="empty-sub">点击上方"添加灵感"开始收集吧</p>
          </div>
        )}
      </main>

      <Modal
        item={selectedItem}
        onClose={() => setSelectedId(null)}
        onUpdateNotes={handleUpdateNotes}
        onDelete={handleDelete}
      />

      <style>{`
        .app-root {
          position: relative;
          min-height: 100vh;
          overflow-x: hidden;
        }

        .bg-bg {
          position: fixed;
          inset: 0;
          background: linear-gradient(135deg, #0a081e 0%, #121035 50%, #0d0b2a 100%);
          z-index: -10;
        }

        .bg-orb {
          position: fixed;
          border-radius: 9999px;
          filter: blur(140px);
          pointer-events: none;
          z-index: -9;
        }

        .bg-orb-1 {
          width: 720px;
          height: 720px;
          background: radial-gradient(circle, rgba(113, 88, 226, 0.45) 0%, transparent 65%);
          top: -280px;
          left: -180px;
          animation: drift1 22s ease-in-out infinite;
        }

        .bg-orb-2 {
          width: 640px;
          height: 640px;
          background: radial-gradient(circle, rgba(197, 108, 240, 0.35) 0%, transparent 65%);
          top: 25%;
          right: -220px;
          animation: drift2 28s ease-in-out infinite;
        }

        .bg-orb-3 {
          width: 560px;
          height: 560px;
          background: radial-gradient(circle, rgba(58, 227, 116, 0.22) 0%, transparent 65%);
          bottom: -200px;
          left: 25%;
          animation: drift3 32s ease-in-out infinite;
        }

        .bg-grain {
          position: fixed;
          inset: 0;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.045 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
          pointer-events: none;
          z-index: -8;
          opacity: 0.85;
          mix-blend-mode: overlay;
        }

        @keyframes drift1 {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(40px, 24px, 0) scale(1.06); }
        }

        @keyframes drift2 {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(-30px, 36px, 0) scale(1.04); }
        }

        @keyframes drift3 {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(28px, -28px, 0) scale(0.97); }
        }

        .app-header {
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .app-header-inner {
          position: relative;
          max-width: 1240px;
          margin: 0 auto;
          padding: 16px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .app-header::before {
          content: '';
          position: absolute;
          inset: 0;
          background: rgba(14, 11, 40, 0.68);
          backdrop-filter: blur(32px) saturate(200%);
          -webkit-backdrop-filter: blur(32px) saturate(200%);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .brand {
          position: relative;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .brand-emoji {
          font-size: 28px;
          filter: drop-shadow(0 0 12px rgba(58, 227, 116, 0.55));
        }

        .brand-title {
          margin: 0;
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.02em;
          background: linear-gradient(135deg, #ffffff 0%, #3ae374 55%, #00d2d3 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .add-btn {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 12px;
          border: 1px solid rgba(58, 227, 116, 0.35);
          background: linear-gradient(135deg, rgba(58, 227, 116, 0.18) 0%, rgba(0, 210, 211, 0.16) 100%);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          color: #7cffb0;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
                      box-shadow 0.3s ease,
                      border-color 0.3s ease;
          box-shadow: 0 4px 20px rgba(58, 227, 116, 0.18),
                      inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        .add-btn:hover {
          transform: translateY(-2px);
          border-color: rgba(58, 227, 116, 0.55);
          box-shadow: 0 8px 32px rgba(58, 227, 116, 0.3),
                      inset 0 1px 0 rgba(255, 255, 255, 0.16);
        }

        .add-btn-active {
          background: linear-gradient(135deg, rgba(255, 107, 107, 0.22) 0%, rgba(255, 159, 67, 0.2) 100%);
          border-color: rgba(255, 107, 107, 0.45);
          color: #ffa1a1;
          box-shadow: 0 4px 20px rgba(255, 107, 107, 0.22),
                      inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        .add-btn-active:hover {
          box-shadow: 0 8px 32px rgba(255, 107, 107, 0.32),
                      inset 0 1px 0 rgba(255, 255, 255, 0.16);
        }

        .add-btn-icon {
          font-size: 18px;
          font-weight: 800;
          line-height: 1;
        }

        .add-panel {
          position: relative;
          z-index: 10;
          max-width: 1240px;
          margin: 0 auto;
          padding: 20px 24px 0;
        }

        .add-card {
          background: rgba(24, 20, 60, 0.55);
          backdrop-filter: blur(34px) saturate(180%);
          -webkit-backdrop-filter: blur(34px) saturate(180%);
          border-radius: 20px;
          padding: 28px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.32),
                      inset 0 1px 0 rgba(255, 255, 255, 0.05);
          animation: cardIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes cardIn {
          0% { opacity: 0; transform: translateY(-28px) scale(0.94); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }

        .add-title {
          margin: 0 0 20px 0;
          font-size: 18px;
          font-weight: 700;
          color: #f2f2ff;
        }

        .field { margin-bottom: 16px; }
        .field-label {
          display: block;
          margin-bottom: 8px;
          font-size: 13px;
          color: rgba(200, 200, 230, 0.72);
          font-weight: 600;
        }

        .field-input,
        .field-textarea {
          width: 100%;
          padding: 12px 16px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(10, 8, 30, 0.55);
          color: #e8e8ff;
          font-size: 14px;
          font-family: inherit;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
        }

        .field-textarea {
          resize: vertical;
          min-height: 84px;
          line-height: 1.6;
        }

        .field-input:focus,
        .field-textarea:focus {
          outline: none;
          border-color: rgba(58, 227, 116, 0.55);
          box-shadow: 0 0 0 4px rgba(58, 227, 116, 0.12);
          background: rgba(10, 8, 30, 0.72);
        }

        .color-row {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .color-chip {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 3px solid transparent;
          cursor: pointer;
          transition: transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1),
                      box-shadow 0.28s ease,
                      border-color 0.28s ease;
          padding: 0;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
        }

        .color-chip:hover { transform: scale(1.22); }

        .color-chip-active {
          border-color: rgba(255, 255, 255, 0.92);
          box-shadow: 0 0 0 3px rgba(58, 227, 116, 0.3),
                      0 4px 14px rgba(0, 0, 0, 0.3);
          transform: scale(1.15);
        }

        .add-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
        }

        .ghost-btn,
        .primary-btn {
          padding: 10px 24px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1),
                      box-shadow 0.28s ease,
                      background 0.28s ease;
          border: 1px solid transparent;
        }

        .ghost-btn {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.08);
          color: #e6e6ff;
        }

        .ghost-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          transform: translateY(-1px);
        }

        .primary-btn {
          background: linear-gradient(135deg, #3ae374 0%, #00d2d3 100%);
          color: #07100d;
          box-shadow: 0 4px 18px rgba(58, 227, 116, 0.32);
        }

        .primary-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 24px rgba(58, 227, 116, 0.42);
        }

        .primary-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .toolbar {
          position: relative;
          z-index: 10;
          max-width: 1240px;
          margin: 0 auto;
          padding: 24px 24px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }

        .tag-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .tag-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 9999px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(24, 20, 60, 0.48);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          color: rgba(200, 200, 230, 0.72);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .tag-pill:hover {
          border-color: rgba(255, 255, 255, 0.14);
          background: rgba(24, 20, 60, 0.72);
          transform: translateY(-1px);
        }

        .tag-pill-active {
          background: rgba(58, 227, 116, 0.14);
          border-color: rgba(58, 227, 116, 0.38);
          color: #7cffb0;
          box-shadow: 0 0 22px rgba(58, 227, 116, 0.12);
        }

        .tag-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          box-shadow: 0 0 6px currentColor;
        }

        .sort-row {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .sort-select {
          padding: 9px 14px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(24, 20, 60, 0.48);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          color: #e8e8ff;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: border-color 0.2s;
        }

        .sort-select:hover { border-color: rgba(255, 255, 255, 0.14); }
        .sort-select:focus { outline: none; border-color: rgba(58, 227, 116, 0.55); }

        .sort-order {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(24, 20, 60, 0.48);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          color: #e8e8ff;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .sort-order:hover {
          border-color: rgba(58, 227, 116, 0.38);
          color: #7cffb0;
          transform: translateY(-1px);
        }

        .board {
          position: relative;
          z-index: 5;
          max-width: 1240px;
          margin: 0 auto;
          padding: 8px 24px 48px;
        }

        .masonry {
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }

        .masonry-col {
          flex: 1 1 0;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .masonry-item {
          transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
                      opacity 0.3s ease;
        }

        .empty {
          text-align: center;
          padding: 96px 20px;
          color: rgba(200, 200, 230, 0.55);
        }

        .empty-icon {
          font-size: 52px;
          margin-bottom: 18px;
          filter: grayscale(0.25);
        }

        .empty-text {
          margin: 8px 0;
          font-size: 17px;
          font-weight: 600;
        }

        .empty-sub {
          margin: 4px 0 0 0;
          font-size: 14px;
          opacity: 0.75;
        }

        @media (max-width: 1023px) {
          .cols-3 .masonry-col:nth-child(3),
          .cols-1 .masonry-col:nth-child(n+2) { display: none; }
        }

        @media (max-width: 639px) {
          .app-header-inner { padding: 12px 16px; }
          .brand-title { font-size: 18px; }
          .brand-emoji { font-size: 24px; }
          .add-btn { padding: 8px 14px; font-size: 13px; }

          .add-panel { padding: 16px 16px 0; }
          .add-card { padding: 20px; border-radius: 16px; }

          .toolbar { padding: 16px; }

          .board { padding: 8px 16px 32px; }

          .masonry { gap: 12px; }
          .masonry-col { gap: 12px; }
        }

        @media (max-width: 479px) {
          .toolbar {
            flex-direction: column;
            align-items: stretch;
          }
          .tag-row { justify-content: center; }
          .sort-row { justify-content: center; }
        }
      `}</style>
    </div>
  )
}

function estimateCardHeight(item: Inspiration): number {
  const base = 80
  const titleLines = Math.max(1, Math.ceil(item.title.length / 15))
  const descLines = item.description ? Math.max(1, Math.ceil(item.description.length / 20)) : 0
  const urlH = item.url ? 22 : 0
  const footer = 42
  return base + titleLines * 22 + descLines * 19 + urlH + footer
}
