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
  type Inspiration,
  type SortField,
  type SortOrder
} from './storage'

const STORAGE_KEY = 'inspiration_board_prefs'

interface Prefs {
  selectedTag: string
  sortField: SortField
  sortOrder: SortOrder
}

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { selectedTag: '', sortField: 'order', sortOrder: 'asc' }
}

function savePrefs(prefs: Prefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {}
}

function generateSampleData(): Inspiration[] {
  const samples = [
    {
      title: '极简主义设计灵感',
      url: 'https://dribbble.com',
      description: '收集了一些极简主义的UI设计案例，留白和排版都非常考究，适合做产品设计参考。',
      colorTag: '#7158e2',
      notes: '可以参考用于下一个项目的首页设计'
    },
    {
      title: 'Midjourney 提示词技巧',
      url: 'https://midjourney.com',
      description: '整理了一些好用的AI绘画提示词，适合生成概念图。',
      colorTag: '#ff6b9d',
      notes: ''
    },
    {
      title: 'CSS Grid 完全指南',
      url: 'https://css-tricks.com',
      description: '非常详细的 Grid 布局教程，从入门到精通，包含大量实战案例。',
      colorTag: '#3ae374',
      notes: '瀑布流布局可以参考这里的技巧'
    },
    {
      title: '配色方案收集',
      url: 'https://coolors.co',
      description: '一个在线配色工具，可以生成和谐的配色方案，支持导出多种格式。',
      colorTag: '#ff9f43',
      notes: ''
    },
    {
      title: 'Preact 性能优化',
      url: 'https://preactjs.com',
      description: 'Preact 官方文档中的性能优化最佳实践，还有 signals 的使用教程。',
      colorTag: '#00d2d3',
      notes: '记得看看 signals 部分'
    },
    {
      title: '毛玻璃效果实现',
      url: 'https://developer.mozilla.org',
      description: 'backdrop-filter 的各种用法和兼容性说明，以及降级方案。',
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
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [columnCount, setColumnCount] = useState(3)
  const containerRef = useRef<HTMLDivElement>(null)

  const [formData, setFormData] = useState({
    title: '',
    url: '',
    description: '',
    colorTag: '#7158e2'
  })

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
  }, [items, prefs.selectedTag, prefs.sortField, prefs.sortOrder])

  const columns = useMemo(() => {
    const cols: Inspiration[][] = Array.from({ length: columnCount }, () => [])
    const colHeights = new Array(columnCount).fill(0)

    displayedItems.forEach(item => {
      let minIdx = 0
      for (let i = 1; i < columnCount; i++) {
        if (colHeights[i] < colHeights[minIdx]) {
          minIdx = i
        }
      }
      cols[minIdx].push(item)
      const estHeight = estimateCardHeight(item)
      colHeights[minIdx] += estHeight + 16
    })

    return cols
  }, [displayedItems, columnCount])

  const selectedItem = useMemo(() => {
    return items.find(i => i.id === selectedId) || null
  }, [items, selectedId])

  const refreshItems = useCallback(() => {
    setItems([...getAll()])
  }, [])

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

  const handleDragStart = useCallback((id: string) => {
    setDraggedId(id)
    if (prefs.sortField !== 'order') {
      setPrefs({ ...prefs, sortField: 'order', sortOrder: 'asc' })
    }
  }, [prefs])

  const handleDragOver = useCallback((id: string) => {
    if (dragOverId !== id && id !== draggedId) {
      setDragOverId(id)
    }
  }, [dragOverId, draggedId])

  const handleDrop = useCallback((targetId: string) => {
    if (!draggedId || draggedId === targetId) return
    
    const currentItems = filterAndSort(items, {
      tag: prefs.selectedTag,
      sortField: prefs.sortField,
      sortOrder: prefs.sortOrder
    })
    
    const fromIdx = currentItems.findIndex(i => i.id === draggedId)
    const toIdx = currentItems.findIndex(i => i.id === targetId)
    
    if (fromIdx === -1 || toIdx === -1) return
    
    const newItems = [...currentItems]
    const [moved] = newItems.splice(fromIdx, 1)
    newItems.splice(toIdx, 0, moved)
    
    const allItems = getAll()
    const orderMap = new Map<string, number>()
    newItems.forEach((item, idx) => {
      orderMap.set(item.id, idx)
    })
    
    let maxOrder = newItems.length
    allItems.forEach(item => {
      if (!orderMap.has(item.id)) {
        orderMap.set(item.id, maxOrder++)
      }
    })
    
    allItems.forEach(item => {
      const newOrder = orderMap.get(item.id)
      if (newOrder !== undefined && item.order !== newOrder) {
        item.order = newOrder
      }
    })
    
    localStorage.setItem('inspiration_board_data', JSON.stringify(allItems))
    refreshItems()
    
    setDraggedId(null)
    setDragOverId(null)
  }, [draggedId, items, prefs, refreshItems])

  const handleDragEnd = useCallback(() => {
    setDraggedId(null)
    setDragOverId(null)
  }, [])

  const tags = getAllTags()

  return (
    <div class="app">
      <div class="bg-gradient bg-gradient-1" />
      <div class="bg-gradient bg-gradient-2" />
      <div class="bg-gradient bg-gradient-3" />
      <div class="bg-noise" />

      <header class="header">
        <div class="header-glass" />
        <div class="header-content">
          <div class="logo">
            <span class="logo-icon">✨</span>
            <h1 class="logo-text">灵感快闪板</h1>
          </div>
          <button
            class={`add-btn ${showAddForm ? 'active' : ''}`}
            onClick={() => setShowAddForm(!showAddForm)}
          >
            <span class="add-icon">{showAddForm ? '−' : '+'}</span>
            <span>{showAddForm ? '取消' : '添加灵感'}</span>
          </button>
        </div>
      </header>

      {showAddForm && (
        <div class="add-form-wrapper">
          <div class="add-form">
            <h3>添加新灵感</h3>
            <div class="form-row">
              <label>标题</label>
              <input
                type="text"
                value={formData.title}
                onInput={(e) => setFormData({ ...formData, title: (e.target as HTMLInputElement).value })}
                placeholder="给这个灵感起个名字"
                autoFocus
              />
            </div>
            <div class="form-row">
              <label>链接</label>
              <input
                type="url"
                value={formData.url}
                onInput={(e) => setFormData({ ...formData, url: (e.target as HTMLInputElement).value })}
                placeholder="https://..."
              />
            </div>
            <div class="form-row">
              <label>描述</label>
              <textarea
                value={formData.description}
                onInput={(e) => setFormData({ ...formData, description: (e.target as HTMLTextAreaElement).value })}
                placeholder="简短描述一下..."
                rows={3}
              />
            </div>
            <div class="form-row">
              <label>颜色标签</label>
              <div class="color-options">
                {tags.map(tag => (
                  <button
                    key={tag}
                    class={`color-option ${formData.colorTag === tag ? 'selected' : ''}`}
                    style={{ background: tag }}
                    onClick={() => setFormData({ ...formData, colorTag: tag })}
                    aria-label={`选择颜色 ${tag}`}
                  />
                ))}
              </div>
            </div>
            <div class="form-actions">
              <button class="btn-secondary" onClick={() => setShowAddForm(false)}>
                取消
              </button>
              <button
                class="btn-primary"
                onClick={handleAdd}
                disabled={!formData.title.trim()}
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}

      <div class="toolbar">
        <div class="filter-tags">
          <button
            class={`tag-btn ${prefs.selectedTag === '' ? 'active' : ''}`}
            onClick={() => setPrefs({ ...prefs, selectedTag: '' })}
          >
            全部
          </button>
          {tags.map(tag => (
            <button
              key={tag}
              class={`tag-btn ${prefs.selectedTag === tag ? 'active' : ''}`}
              onClick={() => setPrefs({ ...prefs, selectedTag: tag })}
              title={`筛选 ${tag} 标签`}
            >
              <span class="tag-dot" style={{ background: tag }} />
            </button>
          ))}
        </div>

        <div class="sort-controls">
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
            class="sort-order-btn"
            onClick={() => setPrefs({
              ...prefs,
              sortOrder: prefs.sortOrder === 'asc' ? 'desc' : 'asc'
            })}
            title={prefs.sortOrder === 'asc' ? '升序' : '降序'}
          >
            {prefs.sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      <main class="main-content" ref={containerRef}>
        <div class="masonry-container">
          {columns.map((col, colIdx) => (
            <div key={colIdx} class="masonry-column">
              {col.map((item) => (
                <div key={item.id} class="card-wrapper">
                  <Card
                    item={item}
                    index={0}
                    onClick={() => setSelectedId(item.id)}
                    onDragStart={() => handleDragStart(item.id)}
                    onDragOver={() => handleDragOver(item.id)}
                    onDrop={() => handleDrop(item.id)}
                    onDragEnd={handleDragEnd}
                    isDragging={draggedId === item.id}
                    isDragOver={dragOverId === item.id && draggedId !== item.id}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>

        {displayedItems.length === 0 && (
          <div class="empty-state">
            <div class="empty-icon">📭</div>
            <p>还没有灵感</p>
            <p class="empty-hint">点击上方"添加灵感"开始收集吧</p>
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
        * {
          box-sizing: border-box;
        }

        .app {
          min-height: 100vh;
          position: relative;
          overflow-x: hidden;
          background: #0a081e;
        }

        .bg-gradient {
          position: fixed;
          border-radius: 50%;
          filter: blur(120px);
          pointer-events: none;
          z-index: 0;
        }

        .bg-gradient-1 {
          width: 700px;
          height: 700px;
          background: radial-gradient(circle, #2d1b69 0%, transparent 70%);
          top: -250px;
          left: -150px;
          opacity: 0.6;
          animation: float1 20s ease-in-out infinite;
        }

        .bg-gradient-2 {
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, #1a1a4e 0%, transparent 70%);
          top: 20%;
          right: -200px;
          opacity: 0.5;
          animation: float2 25s ease-in-out infinite;
        }

        .bg-gradient-3 {
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, #0f4c5c 0%, transparent 70%);
          bottom: -150px;
          left: 20%;
          opacity: 0.4;
          animation: float3 30s ease-in-out infinite;
        }

        .bg-noise {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 1;
          opacity: 0.5;
        }

        @keyframes float1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, 20px) scale(1.05); }
        }

        @keyframes float2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-20px, 30px) scale(1.02); }
        }

        @keyframes float3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(20px, -20px) scale(0.98); }
        }

        .header {
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .header-glass {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 12, 40, 0.7);
          backdrop-filter: blur(30px) saturate(180%);
          -webkit-backdrop-filter: blur(30px) saturate(180%);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .header-content {
          position: relative;
          max-width: 1200px;
          margin: 0 auto;
          padding: 16px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .logo-icon {
          font-size: 28px;
          filter: drop-shadow(0 0 10px rgba(58, 227, 116, 0.5));
        }

        .logo-text {
          margin: 0;
          font-size: 22px;
          font-weight: 700;
          background: linear-gradient(135deg, #fff 0%, #3ae374 50%, #00d2d3 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .add-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 12px;
          border: 1px solid rgba(58, 227, 116, 0.3);
          background: linear-gradient(135deg, rgba(58, 227, 116, 0.15) 0%, rgba(0, 210, 211, 0.15) 100%);
          backdrop-filter: blur(10px);
          color: #3ae374;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 4px 20px rgba(58, 227, 116, 0.15),
                      inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        .add-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(58, 227, 116, 0.3),
                      inset 0 1px 0 rgba(255, 255, 255, 0.15);
          border-color: rgba(58, 227, 116, 0.5);
        }

        .add-btn.active {
          background: linear-gradient(135deg, rgba(255, 107, 107, 0.2) 0%, rgba(255, 159, 67, 0.2) 100%);
          border-color: rgba(255, 107, 107, 0.4);
          color: #ff6b6b;
          box-shadow: 0 4px 20px rgba(255, 107, 107, 0.2),
                      inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        .add-icon {
          font-size: 18px;
          font-weight: 700;
          line-height: 1;
        }

        .add-form-wrapper {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px 24px 0;
          position: relative;
          z-index: 10;
        }

        .add-form {
          background: rgba(25, 20, 60, 0.6);
          backdrop-filter: blur(30px) saturate(180%);
          -webkit-backdrop-filter: blur(30px) saturate(180%);
          border-radius: 20px;
          padding: 28px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3),
                      inset 0 1px 0 rgba(255, 255, 255, 0.05);
          animation: slideDown 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .add-form h3 {
          margin: 0 0 20px 0;
          font-size: 18px;
          color: #f0f0ff;
        }

        .form-row {
          margin-bottom: 16px;
        }

        .form-row label {
          display: block;
          margin-bottom: 8px;
          font-size: 13px;
          color: rgba(200, 200, 230, 0.7);
          font-weight: 500;
        }

        .form-row input,
        .form-row textarea {
          width: 100%;
          padding: 12px 16px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(10, 8, 30, 0.5);
          color: #e0e0f0;
          font-size: 14px;
          font-family: inherit;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
        }

        .form-row input:focus,
        .form-row textarea:focus {
          outline: none;
          border-color: rgba(58, 227, 116, 0.5);
          box-shadow: 0 0 0 4px rgba(58, 227, 116, 0.1);
          background: rgba(10, 8, 30, 0.7);
        }

        .form-row textarea {
          resize: vertical;
          min-height: 80px;
        }

        .color-options {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .color-option {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 3px solid transparent;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
          padding: 0;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .color-option:hover {
          transform: scale(1.2);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .color-option.selected {
          border-color: rgba(255, 255, 255, 0.9);
          box-shadow: 0 0 0 3px rgba(58, 227, 116, 0.3),
                      0 4px 12px rgba(0, 0, 0, 0.3);
          transform: scale(1.15);
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
        }

        .btn-secondary,
        .btn-primary {
          padding: 10px 24px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
          border: 1px solid transparent;
        }

        .btn-secondary {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.08);
          color: #e0e0f0;
        }

        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.12);
          transform: translateY(-1px);
        }

        .btn-primary {
          background: linear-gradient(135deg, #3ae374 0%, #00d2d3 100%);
          color: #0a0a1e;
          box-shadow: 0 4px 15px rgba(58, 227, 116, 0.3);
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(58, 227, 116, 0.4);
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .toolbar {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px 24px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
          position: relative;
          z-index: 10;
        }

        .filter-tags {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .tag-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(25, 20, 60, 0.5);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          color: rgba(200, 200, 230, 0.7);
          font-size: 13px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .tag-btn:hover {
          border-color: rgba(255, 255, 255, 0.15);
          background: rgba(25, 20, 60, 0.8);
          transform: translateY(-1px);
        }

        .tag-btn.active {
          background: rgba(58, 227, 116, 0.12);
          border-color: rgba(58, 227, 116, 0.35);
          color: #3ae374;
          box-shadow: 0 0 20px rgba(58, 227, 116, 0.1);
        }

        .tag-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          box-shadow: 0 0 6px currentColor;
        }

        .sort-controls {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .sort-select {
          padding: 9px 14px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(25, 20, 60, 0.5);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          color: #e0e0f0;
          font-size: 13px;
          cursor: pointer;
          transition: border-color 0.2s;
        }

        .sort-select:hover {
          border-color: rgba(255, 255, 255, 0.15);
        }

        .sort-select:focus {
          outline: none;
          border-color: rgba(58, 227, 116, 0.5);
        }

        .sort-order-btn {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(25, 20, 60, 0.5);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          color: #e0e0f0;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .sort-order-btn:hover {
          border-color: rgba(58, 227, 116, 0.35);
          color: #3ae374;
          transform: translateY(-1px);
        }

        .main-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 8px 24px 40px;
          position: relative;
          z-index: 1;
        }

        .masonry-container {
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }

        .masonry-column {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .card-wrapper {
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
                      opacity 0.3s ease;
        }

        .empty-state {
          text-align: center;
          padding: 80px 20px;
          color: rgba(200, 200, 230, 0.5);
        }

        .empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
          filter: grayscale(0.3);
        }

        .empty-state p {
          margin: 8px 0;
          font-size: 16px;
        }

        .empty-hint {
          font-size: 14px !important;
          opacity: 0.7;
        }

        @media (max-width: 640px) {
          .header-content {
            padding: 12px 16px;
          }

          .logo-text {
            font-size: 18px;
          }

          .add-btn {
            padding: 8px 14px;
            font-size: 13px;
          }

          .add-form-wrapper {
            padding: 16px 16px 0;
          }

          .add-form {
            padding: 20px;
            border-radius: 16px;
          }

          .toolbar {
            padding: 16px;
          }

          .main-content {
            padding: 8px 16px 30px;
          }

          .masonry-container {
            gap: 12px;
          }

          .masonry-column {
            gap: 12px;
          }
        }

        @media (max-width: 480px) {
          .toolbar {
            flex-direction: column;
            align-items: stretch;
          }

          .filter-tags {
            justify-content: center;
          }

          .sort-controls {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  )
}

function estimateCardHeight(item: Inspiration): number {
  const baseHeight = 90
  const titleLength = item.title.length
  const titleLines = Math.max(1, Math.ceil(titleLength / 16))
  const descLength = item.description ? item.description.length : 0
  const descLines = descLength > 0 ? Math.max(1, Math.ceil(descLength / 20)) : 0
  const urlHeight = item.url ? 24 : 0
  const footerHeight = 40
  return baseHeight + titleLines * 22 + descLines * 18 + urlHeight + footerHeight
}
