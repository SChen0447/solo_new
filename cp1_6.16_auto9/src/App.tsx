import { useEffect, useCallback } from 'react'
import PartsPalette from '@/components/PartsPalette'
import BuildCanvas from '@/components/BuildCanvas'
import { useStore } from '@/store'
import { exportToJSON, downloadJSON } from '@/utils'
import './App.css'

function App() {
  const undo = useStore((s) => s.undo)
  const parts = useStore((s) => s.parts)
  const historyIndex = useStore((s) => s.historyIndex)
  const removePart = useStore((s) => s.removePart)
  const selectedPartId = useStore((s) => s.selectedPartId)
  const setSelectedPartId = useStore((s) => s.setSelectedPartId)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        undo()
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedPartId) {
        e.preventDefault()
        removePart(selectedPartId)
      }
      if (e.key === 'Escape') {
        setSelectedPartId(null)
      }
    },
    [undo, selectedPartId, removePart, setSelectedPartId]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const handleExport = () => {
    const json = exportToJSON(parts)
    downloadJSON(json, `lego-build-${Date.now()}.json`)
  }

  const handleClear = () => {
    if (parts.length === 0) return
    if (confirm('确定要清空所有零件吗？此操作无法撤销。')) {
      parts.forEach((p) => removePart(p.id))
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo">
          <span className="logo-icon">🧱</span>
          <h1>乐高拼搭模拟器</h1>
        </div>

        <div className="toolbar">
          <div className="parts-count">
            <span className="count-label">零件数</span>
            <span className="count-value">{parts.length}</span>
          </div>

          <div className="history-info">
            <span className="history-label">撤销步骤</span>
            <span className="history-value">{historyIndex}/20</span>
          </div>

          <button
            className="toolbar-btn undo-btn"
            onClick={undo}
            disabled={historyIndex === 0}
            title="撤销 (Ctrl+Z)"
          >
            <span className="btn-icon">↩</span>
            <span className="btn-text">撤销</span>
          </button>

          <button
            className="toolbar-btn export-btn"
            onClick={handleExport}
            disabled={parts.length === 0}
            title="导出为JSON"
          >
            <span className="btn-icon">📤</span>
            <span className="btn-text">导出</span>
          </button>

          <button
            className="toolbar-btn clear-btn"
            onClick={handleClear}
            disabled={parts.length === 0}
            title="清空所有零件"
          >
            <span className="btn-icon">🗑</span>
            <span className="btn-text">清空</span>
          </button>
        </div>
      </header>

      <main className="app-main">
        <PartsPalette />
        <div className="canvas-container">
          <BuildCanvas />
        </div>
      </main>

      <footer className="app-footer">
        <div className="shortcuts">
          <span className="shortcut-item">
            <kbd>Ctrl</kbd> + <kbd>Z</kbd> 撤销
          </span>
          <span className="shortcut-item">
            <kbd>Shift</kbd> + <kbd>滚轮</kbd> 调整高度
          </span>
          <span className="shortcut-item">
            <kbd>Delete</kbd> 删除选中
          </span>
          <span className="shortcut-item">
            <kbd>Esc</kbd> 取消选择
          </span>
        </div>
        <div className="copyright">Lego Builder Simulator v1.0</div>
      </footer>
    </div>
  )
}

export default App
