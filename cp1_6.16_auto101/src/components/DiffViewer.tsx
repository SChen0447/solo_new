import React, { useState, useRef, useEffect, useCallback } from 'react'
import { DiffResult } from '../core/DiffCalculator'
import { ScreenshotResult } from '../core/ScreenshotEngine'
import '../styles/DiffViewer.css'

type ViewMode = 'sidebyside' | 'overlay' | 'slider'

interface DiffViewerProps {
  screenshotA: ScreenshotResult | null
  screenshotB: ScreenshotResult | null
  diffResult: DiffResult | null
  viewport: number
}

const DiffViewer: React.FC<DiffViewerProps> = ({ screenshotA, screenshotB, diffResult, viewport }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('sidebyside')
  const [sliderPosition, setSliderPosition] = useState(50)
  const [zoomState, setZoomState] = useState<{ x: number; y: number; scale: number; visible: boolean }>({
    x: 0,
    y: 0,
    scale: 1,
    visible: false
  })
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasARef = useRef<HTMLCanvasElement>(null)
  const canvasBRef = useRef<HTMLCanvasElement>(null)
  const diffCanvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (screenshotA && canvasARef.current) {
      const ctx = canvasARef.current.getContext('2d')
      if (ctx) {
        canvasARef.current.width = screenshotA.width
        canvasARef.current.height = screenshotA.height
        ctx.putImageData(screenshotA.imageData, 0, 0)
      }
    }
  }, [screenshotA])

  useEffect(() => {
    if (screenshotB && canvasBRef.current) {
      const ctx = canvasBRef.current.getContext('2d')
      if (ctx) {
        canvasBRef.current.width = screenshotB.width
        canvasBRef.current.height = screenshotB.height
        ctx.putImageData(screenshotB.imageData, 0, 0)
      }
    }
  }, [screenshotB])

  useEffect(() => {
    if (diffResult && diffCanvasRef.current) {
      const ctx = diffCanvasRef.current.getContext('2d')
      if (ctx) {
        diffCanvasRef.current.width = diffResult.width
        diffCanvasRef.current.height = diffResult.height
        ctx.putImageData(diffResult.diffImageData, 0, 0)
      }
    }
  }, [diffResult])

  useEffect(() => {
    if (diffResult && overlayCanvasRef.current) {
      const ctx = overlayCanvasRef.current.getContext('2d')
      if (ctx) {
        overlayCanvasRef.current.width = diffResult.width
        overlayCanvasRef.current.height = diffResult.height
        ctx.globalAlpha = 0
        ctx.putImageData(diffResult.overlayImageData, 0, 0)
        requestAnimationFrame(() => {
          if (overlayCanvasRef.current) {
            overlayCanvasRef.current.style.transition = 'opacity 0.2s ease'
            overlayCanvasRef.current.style.opacity = '1'
          }
        })
      }
    }
  }, [diffResult])

  const handleSliderMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const percentage = (x / rect.width) * 100
      setSliderPosition(Math.max(0, Math.min(100, percentage)))
    },
    [isDragging]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  const handleDiffClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!diffResult || !containerRef.current) return

    const canvas = e.currentTarget
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    setZoomState({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      scale: 1.5,
      visible: true
    })

    setTimeout(() => {
      setZoomState((prev) => ({ ...prev, visible: false }))
    }, 2000)
  }, [diffResult])

  const getDiffLocations = (): { x: number; y: number }[] => {
    if (!diffResult || diffResult.diffPixels.length === 0) return []

    const step = Math.ceil(diffResult.diffPixels.length / 10)
    const locations: { x: number; y: number }[] = []

    for (let i = 0; i < diffResult.diffPixels.length; i += step) {
      if (locations.length >= 10) break
      locations.push(diffResult.diffPixels[i])
    }

    return locations
  }

  if (!screenshotA || !screenshotB) {
    return (
      <div className="diff-viewer empty">
        <div className="empty-state">
          <div className="empty-icon">
            <svg viewBox="0 0 64 64" width="64" height="64">
              <rect x="8" y="8" width="48" height="48" rx="4" fill="none" stroke="#6C63FF" strokeWidth="2" strokeDasharray="4 4" />
              <rect x="22" y="28" width="20" height="16" rx="2" fill="#6C63FF" opacity="0.3" />
              <circle cx="32" cy="32" r="3" fill="#FF6B6B" />
            </svg>
          </div>
          <p className="empty-text">输入URL或HTML，点击"开始比对"查看差异</p>
          <p className="empty-hint">支持多种视口宽度批量对比</p>
        </div>
      </div>
    )
  }

  const diffLocations = getDiffLocations()

  return (
    <div className="diff-viewer">
      <div className="viewer-header">
        <div className="viewport-badge">
          <span className="viewport-label">视口</span>
          <span className="viewport-value">{viewport}px</span>
        </div>

        <div className="view-mode-tabs">
          <button
            className={`mode-tab ${viewMode === 'sidebyside' ? 'active' : ''}`}
            onClick={() => setViewMode('sidebyside')}
          >
            并排对比
          </button>
          <button
            className={`mode-tab ${viewMode === 'overlay' ? 'active' : ''}`}
            onClick={() => setViewMode('overlay')}
          >
            差异叠加
          </button>
          <button
            className={`mode-tab ${viewMode === 'slider' ? 'active' : ''}`}
            onClick={() => setViewMode('slider')}
          >
            滑动分屏
          </button>
        </div>
      </div>

      <div className="viewer-content" ref={containerRef}>
        {viewMode === 'sidebyside' && (
          <div className="side-by-side-view fade-in">
            <div className="screenshot-container">
              <div className="screenshot-label">A - 原始</div>
              <div className="screenshot-wrapper">
                <canvas ref={canvasARef} className="screenshot-canvas" />
              </div>
            </div>
            <div className="screenshot-container">
              <div className="screenshot-label">B - 对比</div>
              <div className="screenshot-wrapper">
                <canvas ref={canvasBRef} className="screenshot-canvas" />
              </div>
            </div>
          </div>
        )}

        {viewMode === 'overlay' && (
          <div className="overlay-view fade-in">
            <div className="overlay-container">
              <canvas ref={canvasARef} className="screenshot-canvas base-canvas" />
              <canvas
                ref={overlayCanvasRef}
                className="screenshot-canvas overlay-canvas"
                onClick={handleDiffClick}
              />
              {zoomState.visible && (
                <div
                  className="zoom-lens"
                  style={{
                    left: zoomState.x,
                    top: zoomState.y,
                    transform: `translate(-50%, -50%) scale(${zoomState.scale})`
                  }}
                />
              )}
            </div>
          </div>
        )}

        {viewMode === 'slider' && (
          <div className="slider-view fade-in">
            <div className="slider-container">
              <canvas ref={canvasBRef} className="screenshot-canvas slider-canvas-right" />
              <div
                className="slider-crop"
                style={{ width: `${sliderPosition}%` }}
              >
                <canvas ref={canvasARef} className="screenshot-canvas slider-canvas-left" />
              </div>
              <div
                className="slider-divider"
                style={{ left: `${sliderPosition}%` }}
                onMouseDown={handleSliderMouseDown}
              >
                <div className="slider-handle">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M9 18l6-6-6-6v12zm6-12v12l6-6-6-6z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="info-panel">
        <div className="info-header">差异统计</div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value diff">{diffResult?.diffCount.toLocaleString() || 0}</div>
            <div className="stat-label">差异像素</div>
          </div>
          <div className="stat-card">
            <div className="stat-value percentage">
              {diffResult ? diffResult.diffPercentage.toFixed(2) : '0.00'}%
            </div>
            <div className="stat-label">差异比例</div>
          </div>
          <div className="stat-card">
            <div className="stat-value hash">{diffResult?.hashSimilarity.toFixed(1) || 0}</div>
            <div className="stat-label">哈希相似度</div>
          </div>
        </div>

        <div className="diff-locations-section">
          <div className="section-title">主要差异位置</div>
          <div className="diff-locations-list">
            {diffLocations.length === 0 ? (
              <div className="no-diff">两张图完全一致</div>
            ) : (
              diffLocations.map((loc, idx) => (
                <div key={idx} className="diff-location-item">
                  <span className="diff-index">#{idx + 1}</span>
                  <span className="diff-coord">({loc.x}, {loc.y})</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DiffViewer
