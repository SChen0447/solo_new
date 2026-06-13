import React, { useState, useEffect, useRef, useCallback } from 'react'
import { eventBus } from './eventBus'
import type { ProjectData, Scene } from './types'
import './ExportImport.css'

interface ExportImportProps {
  scenes: Scene[]
  onProjectImport: (data: ProjectData) => void
}

const PROCESS_DURATION = 1000

export const ExportImport: React.FC<ExportImportProps> = ({ scenes, onProjectImport }) => {
  const [showProgress, setShowProgress] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressMode, setProgressMode] = useState<'export' | 'import'>('export')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const animationRef = useRef<number | null>(null)

  const animateProgress = useCallback((mode: 'export' | 'import') => {
    setProgressMode(mode)
    setShowProgress(true)
    setProgress(0)

    const startTime = performance.now()

    const animate = (timestamp: number) => {
      const elapsed = timestamp - startTime
      const pct = Math.min(elapsed / PROCESS_DURATION, 1)
      const eased = 1 - Math.pow(1 - pct, 3)
      setProgress(eased * 100)

      eventBus.emit(mode === 'export' ? 'export:progress' : 'import:progress', eased * 100)

      if (pct < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        animationRef.current = null
      }
    }

    animationRef.current = requestAnimationFrame(animate)
  }, [])

  const handleExport = useCallback(() => {
    if (showProgress) return

    animateProgress('export')

    setTimeout(() => {
      const projectData: ProjectData = {
        version: '1.0.0',
        scenes: JSON.parse(JSON.stringify(scenes)),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      eventBus.emit('export:complete', projectData)

      const jsonStr = JSON.stringify(projectData, null, 2)
      const blob = new Blob([jsonStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `story-puzzle-${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setTimeout(() => {
        setShowProgress(false)
      }, 300)
    }, PROCESS_DURATION + 100)
  }, [scenes, showProgress, animateProgress])

  const handleImportClick = useCallback(() => {
    if (showProgress) return
    fileInputRef.current?.click()
  }, [showProgress])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    eventBus.emit('import:request', file)
    animateProgress('import')

    setTimeout(() => {
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const data: ProjectData = JSON.parse(event.target?.result as string)
          eventBus.emit('import:complete', data)
          onProjectImport(data)
        } catch (err) {
          console.error('导入失败:', err)
          alert('文件格式错误，请选择有效的故事拼图JSON文件')
        } finally {
          setTimeout(() => {
            setShowProgress(false)
          }, 300)
        }
      }
      reader.readAsText(file)
    }, PROCESS_DURATION + 100)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [animateProgress, onProjectImport])

  useEffect(() => {
    const unsub1 = eventBus.on('export:request', handleExport)

    return () => {
      unsub1()
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [handleExport])

  const radius = 40
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div className="export-import">
      <button
        className="ei-btn export-btn"
        onClick={handleExport}
        disabled={showProgress}
      >
        📤 导出
      </button>
      <button
        className="ei-btn import-btn"
        onClick={handleImportClick}
        disabled={showProgress}
      >
        📥 导入
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {showProgress && (
        <div className="progress-overlay">
          <div className="progress-modal">
            <svg className="progress-ring" width="120" height="120">
              <circle
                className="progress-ring-bg"
                strokeWidth="8"
                fill="transparent"
                r={radius}
                cx="60"
                cy="60"
              />
              <circle
                className="progress-ring-fg"
                strokeWidth="8"
                strokeLinecap="round"
                fill="transparent"
                r={radius}
                cx="60"
                cy="60"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
              />
            </svg>
            <div className="progress-text">
              <span className="progress-percent">{Math.round(progress)}%</span>
              <span className="progress-label">
                {progressMode === 'export' ? '正在导出...' : '正在导入...'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ExportImport
