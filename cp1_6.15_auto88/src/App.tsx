import { useCallback, useRef, useState } from 'react'
import { useStore } from './store'
import Whiteboard from './Whiteboard'
import GanttChart from './GanttChart'
import { Search, Download, FolderPlus, X } from 'lucide-react'
import { saveAs } from 'file-saver'
import { jsPDF } from 'jspdf'

export default function App() {
  const leftWidth = useStore((s) => s.leftWidth)
  const setLeftWidth = useStore((s) => s.setLeftWidth)
  const searchQuery = useStore((s) => s.searchQuery)
  const setSearchQuery = useStore((s) => s.setSearchQuery)
  const progressFilter = useStore((s) => s.progressFilter)
  const setProgressFilter = useStore((s) => s.setProgressFilter)
  const groups = useStore((s) => s.groups)
  const addGroup = useStore((s) => s.addGroup)
  const exporting = useStore((s) => s.exporting)
  const setExporting = useStore((s) => s.setExporting)

  const [isDragging, setIsDragging] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [showNewGroup, setShowNewGroup] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)

  const handleSplitterDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsDragging(true)

      const container = containerRef.current
      if (!container) return

      const handleMove = (me: MouseEvent) => {
        const rect = container.getBoundingClientRect()
        const x = me.clientX - rect.left
        const totalWidth = rect.width
        const pct = (x / totalWidth) * 100
        const clamped = Math.min(70, Math.max(30, pct))
        setLeftWidth(clamped)
      }

      const handleUp = () => {
        setIsDragging(false)
        window.removeEventListener('mousemove', handleMove)
        window.removeEventListener('mouseup', handleUp)
      }

      window.addEventListener('mousemove', handleMove)
      window.addEventListener('mouseup', handleUp)
    },
    [setLeftWidth]
  )

  const handleAddGroup = useCallback(() => {
    if (newGroupName.trim()) {
      addGroup({
        id: `group-${Date.now()}`,
        name: newGroupName.trim(),
        collapsed: false,
      })
      setNewGroupName('')
      setShowNewGroup(false)
    }
  }, [newGroupName, addGroup])

  const handleExportPNG = useCallback(async () => {
    setExporting(true)
    setShowExportMenu(false)

    try {
      await new Promise((r) => setTimeout(r, 100))

      const mainEl = document.getElementById('main-content')
      if (!mainEl) return

      const canvas = document.createElement('canvas')
      const dpr = 2
      const rect = mainEl.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.scale(dpr, dpr)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, rect.width, rect.height)

      ctx.fillStyle = '#f7f3e3'
      ctx.fillRect(0, 0, rect.width, rect.height)

      ctx.fillStyle = '#2d2d2d'
      ctx.font = '14px sans-serif'
      ctx.fillText('手写甘特图工具 - 导出', 20, 30)

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png')
      )
      if (blob) {
        saveAs(blob, 'handwriting-gantt.png')
      }
    } catch (err) {
      console.error('Export PNG failed:', err)
    } finally {
      setExporting(false)
    }
  }, [setExporting])

  const handleExportPDF = useCallback(async () => {
    setExporting(true)
    setShowExportMenu(false)

    try {
      await new Promise((r) => setTimeout(r, 100))

      const doc = new jsPDF('l', 'mm', 'a4')
      doc.setFontSize(16)
      doc.text('Handwriting Gantt Chart', 20, 20)
      doc.setFontSize(10)
      doc.text('Exported from Handwriting Gantt Tool', 20, 28)

      doc.setFontSize(12)
      let y = 40
      for (const g of groups) {
        doc.setTextColor(200, 168, 130)
        doc.text(`■ ${g.name}`, 20, y)
        y += 8
      }

      doc.save('handwriting-gantt.pdf')
    } catch (err) {
      console.error('Export PDF failed:', err)
    } finally {
      setExporting(false)
    }
  }, [groups, setExporting])

  return (
    <div className="h-screen w-screen flex flex-col bg-warm overflow-hidden font-body">
      <header className="shrink-0 flex items-center justify-between px-4 py-2 bg-white/80 backdrop-blur-sm border-b border-splitter/50 z-30">
        <div className="flex items-center gap-3">
          <h1 className="font-journal text-xl text-ink tracking-wide">📝 手写甘特图工具</h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink/30" />
            <input
              type="text"
              placeholder="搜索任务..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-splitter rounded-md w-44 focus:outline-none focus:border-wood bg-warm/50 placeholder:text-[#aaa]"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-ink/60">
            <span>进度:</span>
            <input
              type="range"
              min={0}
              max={100}
              value={progressFilter[0]}
              onChange={(e) =>
                setProgressFilter([Number(e.target.value), progressFilter[1]])
              }
              className="w-[75px] h-1 accent-wood"
            />
            <span>{progressFilter[0]}%</span>
            <span>-</span>
            <input
              type="range"
              min={0}
              max={100}
              value={progressFilter[1]}
              onChange={(e) =>
                setProgressFilter([progressFilter[0], Number(e.target.value)])
              }
              className="w-[75px] h-1 accent-wood"
            />
            <span>{progressFilter[1]}%</span>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#e8e8e8] transition-colors"
              style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}
            >
              <Download className="w-4 h-4 text-ink" />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded-md shadow-lg border border-splitter/50 py-1 z-50 min-w-[120px]">
                <button
                  onClick={handleExportPNG}
                  className="w-full px-4 py-2 text-xs text-left text-ink hover:bg-warm/30 transition-colors"
                >
                  导出 PNG
                </button>
                <button
                  onClick={handleExportPDF}
                  className="w-full px-4 py-2 text-xs text-left text-ink hover:bg-warm/30 transition-colors"
                >
                  导出 PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {exporting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white rounded-lg px-6 py-4 shadow-lg flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-wood border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-body text-ink">导出中…</span>
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        id="main-content"
        className="flex-1 flex flex-col lg:flex-row overflow-hidden"
        style={{ gap: 0 }}
      >
        <div
          className="shrink-0 w-full lg:h-full bg-panel border-r border-splitter/30 overflow-y-auto"
          style={{
            width: undefined,
            minWidth: 220,
            maxWidth: 220,
          }}
        >
          <div className="p-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-ink/70 font-body">项目分组</span>
              <button
                onClick={() => setShowNewGroup(!showNewGroup)}
                className="w-5 h-5 rounded flex items-center justify-center hover:bg-warm/40 transition-colors"
              >
                <FolderPlus className="w-3.5 h-3.5 text-wood-dark" />
              </button>
            </div>

            {showNewGroup && (
              <div className="mb-3 flex items-center gap-1">
                <input
                  type="text"
                  placeholder="分组名称"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddGroup()}
                  className="flex-1 text-xs border border-splitter rounded-md px-2 py-1 focus:outline-none focus:border-wood placeholder:text-[#aaa]"
                  autoFocus
                />
                <button
                  onClick={handleAddGroup}
                  className="text-xs px-2 py-1 rounded-md bg-wood text-white hover:bg-wood-dark transition-colors"
                >
                  添加
                </button>
                <button
                  onClick={() => {
                    setShowNewGroup(false)
                    setNewGroupName('')
                  }}
                  className="p-1"
                >
                  <X className="w-3 h-3 text-ink/40" />
                </button>
              </div>
            )}

            <div className="space-y-1">
              {groups.map((g) => (
                <div
                  key={g.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-warm/30 transition-colors cursor-pointer"
                  onClick={() => useStore.getState().toggleGroup(g.id)}
                >
                  <svg
                    className="w-3 h-3 text-wood-dark shrink-0 transition-transform duration-200"
                    style={{ transform: g.collapsed ? 'rotate(0deg)' : 'rotate(90deg)' }}
                    viewBox="0 0 10 10"
                    fill="currentColor"
                  >
                    <polygon points="0,0 10,5 0,10" />
                  </svg>
                  <span className="text-xs text-ink/80 truncate">{g.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          <div
            className="overflow-hidden"
            style={{ width: `${leftWidth}%`, minWidth: '30%' }}
          >
            <Whiteboard />
          </div>

          <div
            className="shrink-0 cursor-col-resize transition-colors duration-150"
            style={{
              width: 6,
              backgroundColor: isDragging ? '#a0784c' : '#ddd',
            }}
            onMouseDown={handleSplitterDown}
          />

          <div
            className="overflow-hidden"
            style={{ width: `${100 - leftWidth}%`, minWidth: '30%' }}
          >
            <GanttChart />
          </div>
        </div>
      </div>

      {showExportMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowExportMenu(false)}
        />
      )}
    </div>
  )
}
