import React, { useState, useCallback, useEffect, useRef } from 'react'
import { saveAs } from 'file-saver'
import ControlPanel from './components/ControlPanel'
import DiffViewer from './components/DiffViewer'
import ResultCard from './components/ResultCard'
import { screenshotEngine, ScreenshotResult } from './core/ScreenshotEngine'
import { diffCalculator, DiffResult } from './core/DiffCalculator'
import './styles/App.css'

interface BatchResult {
  viewport: number
  screenshotA: ScreenshotResult
  screenshotB: ScreenshotResult
  diffResult: DiffResult
}

const App: React.FC = () => {
  const [isComparing, setIsComparing] = useState(false)
  const [activeViewport, setActiveViewport] = useState<number | null>(null)
  const [batchResults, setBatchResults] = useState<BatchResult[]>([])
  const [expandedCard, setExpandedCard] = useState<number | null>(null)
  const [selectedCards, setSelectedCards] = useState<Set<number>>(new Set())
  const [isMobile, setIsMobile] = useState(false)
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false)
  const activeResultRef = useRef<BatchResult | null>(null)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const getActiveResult = useCallback((): BatchResult | null => {
    if (activeViewport === null) return null
    return batchResults.find((r) => r.viewport === activeViewport) || null
  }, [activeViewport, batchResults])

  const handleStartCompare = useCallback(
    async (options: {
      inputA: { type: 'url' | 'html'; content: string }
      inputB: { type: 'url' | 'html'; content: string }
      viewports: number[]
      waitTime: number
    }) => {
      setIsComparing(true)
      setBatchResults([])
      setSelectedCards(new Set())
      setActiveViewport(null)

      try {
        const results: BatchResult[] = []

        for (const viewport of options.viewports) {
          const { screenshotA, screenshotB } = await screenshotEngine.capture(
            options.inputA,
            options.inputB,
            { viewportWidth: viewport, waitTime: options.waitTime }
          )

          const diffResult = await diffCalculator.calculate(
            screenshotA.imageData,
            screenshotB.imageData,
            viewport
          )

          const result: BatchResult = { viewport, screenshotA, screenshotB, diffResult }
          results.push(result)
          setBatchResults((prev) => [...prev, result])
        }

        if (results.length > 0) {
          setActiveViewport(results[0].viewport)
          activeResultRef.current = results[0]
          const initialSelected = new Set(results.map((r) => r.viewport))
          setSelectedCards(initialSelected)
        }
      } catch (error) {
        console.error('Comparison failed:', error)
        alert('比对过程中出现错误，请检查输入内容')
      } finally {
        setIsComparing(false)
      }
    },
    []
  )

  const handleExportReport = useCallback(async () => {
    const selectedResults = batchResults.filter((r) => selectedCards.has(r.viewport))

    if (selectedResults.length === 0) {
      alert('请先选择要导出的比对结果')
      return
    }

    try {
      const reportData = selectedResults.map((r) => ({
        viewport: r.viewport,
        diffPixels: r.diffResult.diffCount,
        diffPercentage: r.diffResult.diffPercentage,
        hashSimilarity: r.diffResult.hashSimilarity,
        diffLocations: r.diffResult.diffPixels.slice(0, 50)
      }))

      const reportJson = JSON.stringify(reportData, null, 2)
      const jsonBlob = new Blob([reportJson], { type: 'application/json' })
      saveAs(jsonBlob, `pixelcompare-report-${Date.now()}.json`)

      selectedResults.forEach((r) => {
        const canvas = document.createElement('canvas')
        canvas.width = r.diffResult.width
        canvas.height = r.diffResult.height
        const ctx = canvas.getContext('2d')!
        ctx.putImageData(r.diffResult.overlayImageData, 0, 0)
        canvas.toBlob((blob) => {
          if (blob) {
            saveAs(blob, `diff-${r.viewport}px.png`)
          }
        }, 'image/png')
      })
    } catch (error) {
      console.error('Export failed:', error)
      alert('导出失败')
    }
  }, [batchResults, selectedCards])

  const handleCardClick = useCallback((viewport: number) => {
    setExpandedCard((prev) => (prev === viewport ? null : viewport))
    setActiveViewport(viewport)
  }, [])

  const handleCardSelect = useCallback((viewport: number, selected: boolean) => {
    setSelectedCards((prev) => {
      const next = new Set(prev)
      if (selected) {
        next.add(viewport)
      } else {
        next.delete(viewport)
      }
      return next
    })
  }, [])

  const activeResult = getActiveResult()

  return (
    <div className="app">
      {isMobile && (
        <header className="mobile-header">
          <div className="mobile-logo">
            <svg viewBox="0 0 32 32" width="24" height="24">
              <rect x="2" y="2" width="6" height="6" fill="#FF6B6B" />
              <rect x="10" y="2" width="6" height="6" fill="#6C63FF" />
              <rect x="18" y="2" width="6" height="6" fill="#FF6B6B" />
              <rect x="26" y="2" width="4" height="6" fill="#6C63FF" />
              <rect x="2" y="10" width="6" height="6" fill="#6C63FF" />
              <rect x="10" y="10" width="6" height="6" fill="#FF6B6B" />
              <rect x="18" y="10" width="6" height="6" fill="#6C63FF" />
              <rect x="26" y="10" width="4" height="6" fill="#FF6B6B" />
              <rect x="2" y="18" width="6" height="6" fill="#FF6B6B" />
              <rect x="10" y="18" width="6" height="6" fill="#6C63FF" />
              <rect x="18" y="18" width="6" height="6" fill="#FF6B6B" />
              <rect x="26" y="18" width="4" height="6" fill="#6C63FF" />
              <rect x="2" y="26" width="6" height="4" fill="#6C63FF" />
              <rect x="10" y="26" width="6" height="4" fill="#FF6B6B" />
              <rect x="18" y="26" width="6" height="4" fill="#6C63FF" />
              <rect x="26" y="26" width="4" height="4" fill="#FF6B6B" />
            </svg>
            <span>PixelCompare</span>
          </div>
          <button
            className="mobile-menu-btn"
            onClick={() => setMobilePanelOpen(true)}
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
            </svg>
          </button>
        </header>
      )}

      <div className="app-layout">
        {isMobile ? (
          <ControlPanel
            onStartCompare={(options) => {
              handleStartCompare(options)
              setMobilePanelOpen(false)
            }}
            onExportReport={handleExportReport}
            isComparing={isComparing}
            canExport={batchResults.length > 0 && selectedCards.size > 0}
            isMobileOpen={mobilePanelOpen}
            onCloseMobile={() => setMobilePanelOpen(false)}
          />
        ) : (
          <ControlPanel
            onStartCompare={handleStartCompare}
            onExportReport={handleExportReport}
            isComparing={isComparing}
            canExport={batchResults.length > 0 && selectedCards.size > 0}
          />
        )}

        <main className="main-content">
          {activeResult && (
            <DiffViewer
              screenshotA={activeResult.screenshotA}
              screenshotB={activeResult.screenshotB}
              diffResult={activeResult.diffResult}
              viewport={activeResult.viewport}
            />
          )}

          {batchResults.length > 1 && (
            <div className="results-section">
              <div className="results-header">
                <h2 className="results-title">批量比对结果</h2>
                <span className="results-count">
                  已选 {selectedCards.size} / {batchResults.length}
                </span>
              </div>
              <div className="results-grid">
                {batchResults.map((result) => (
                  <ResultCard
                    key={result.viewport}
                    viewport={result.viewport}
                    diffResult={result.diffResult}
                    isExpanded={expandedCard === result.viewport}
                    onClick={() => handleCardClick(result.viewport)}
                    isSelected={selectedCards.has(result.viewport)}
                    onSelect={(selected) => handleCardSelect(result.viewport, selected)}
                  />
                ))}
              </div>
            </div>
          )}

          {batchResults.length === 0 && !isComparing && !activeResult && (
            <div className="empty-main">
              <div className="empty-illustration">
                <svg viewBox="0 0 200 200" width="200" height="200">
                  <defs>
                    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style={{ stopColor: '#6C63FF', stopOpacity: 0.3 }} />
                      <stop offset="100%" style={{ stopColor: '#FF6B6B', stopOpacity: 0.3 }} />
                    </linearGradient>
                  </defs>
                  <rect x="20" y="40" width="70" height="120" rx="6" fill="none" stroke="#6C63FF" strokeWidth="2" strokeDasharray="6 4" />
                  <rect x="110" y="40" width="70" height="120" rx="6" fill="none" stroke="#FF6B6B" strokeWidth="2" strokeDasharray="6 4" />
                  <circle cx="90" cy="100" r="8" fill="#FF6B6B" opacity="0.8">
                    <animate attributeName="r" values="6;10;6" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
                  </circle>
                  <text x="100" y="180" textAnchor="middle" fill="#8888AA" fontSize="14">
                    开始比对
                  </text>
                </svg>
              </div>
              <p className="empty-main-text">在左侧输入页面地址，开始像素级对比</p>
            </div>
          )}

          {isComparing && (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p className="loading-text">正在抓取页面并计算差异...</p>
            </div>
          )}
        </main>
      </div>

      {isMobile && mobilePanelOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setMobilePanelOpen(false)}
        />
      )}
    </div>
  )
}

export default App
