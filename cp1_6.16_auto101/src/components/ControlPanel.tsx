import React, { useState, useEffect, useRef } from 'react'
import { eventBus, Events } from '../core/EventBus'
import '../styles/ControlPanel.css'

interface ControlPanelProps {
  onStartCompare: (options: {
    inputA: { type: 'url' | 'html'; content: string }
    inputB: { type: 'url' | 'html'; content: string }
    viewports: number[]
    waitTime: number
  }) => void
  onExportReport: () => void
  isComparing: boolean
  canExport: boolean
  isMobileOpen?: boolean
  onCloseMobile?: () => void
}

const VIEWPORT_OPTIONS = [320, 768, 1024, 1440, 1920]

const ControlPanel: React.FC<ControlPanelProps> = ({
  onStartCompare,
  onExportReport,
  isComparing,
  canExport,
  isMobileOpen,
  onCloseMobile
}) => {
  const [inputTypeA, setInputTypeA] = useState<'url' | 'html'>('url')
  const [inputTypeB, setInputTypeB] = useState<'url' | 'html'>('url')
  const [contentA, setContentA] = useState('')
  const [contentB, setContentB] = useState('')
  const [selectedViewports, setSelectedViewports] = useState<number[]>([1024])
  const [waitTime, setWaitTime] = useState(3000)
  const [statusMessages, setStatusMessages] = useState<{ id: number; text: string; visible: boolean }[]>([])
  const messageIdRef = useRef(0)

  useEffect(() => {
    const unsubscribe = eventBus.on(Events.STATUS_MESSAGE, (message: string) => {
      const id = ++messageIdRef.current
      setStatusMessages((prev) => [...prev, { id, text: message, visible: false }])
      setTimeout(() => {
        setStatusMessages((prev) => prev.map((m) => (m.id === id ? { ...m, visible: true } : m)))
      }, 10)
      setTimeout(() => {
        setStatusMessages((prev) => prev.map((m) => (m.id === id ? { ...m, visible: false } : m)))
      }, 2500)
      setTimeout(() => {
        setStatusMessages((prev) => prev.filter((m) => m.id !== id))
      }, 3000)
    })

    return unsubscribe
  }, [])

  const toggleViewport = (viewport: number) => {
    setSelectedViewports((prev) =>
      prev.includes(viewport) ? prev.filter((v) => v !== viewport) : [...prev, viewport].sort((a, b) => a - b)
    )
  }

  const handleStart = () => {
    if (!contentA.trim() || !contentB.trim()) {
      alert('请输入两个页面的URL或HTML内容')
      return
    }
    if (selectedViewports.length === 0) {
      alert('请至少选择一个视口宽度')
      return
    }

    onStartCompare({
      inputA: { type: inputTypeA, content: contentA },
      inputB: { type: inputTypeB, content: contentB },
      viewports: selectedViewports,
      waitTime
    })
  }

  const PanelContent = () => (
    <div className="control-panel-inner">
      <div className="panel-header">
        <div className="logo">
          <svg viewBox="0 0 32 32" width="28" height="28">
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
        </div>
        <h1 className="app-title">PixelCompare</h1>
      </div>

      <div className="input-section">
        <div className="input-group">
          <div className="input-label-row">
            <label className="input-label">页面 A</label>
            <div className="type-toggle">
              <button
                className={`type-btn ${inputTypeA === 'url' ? 'active' : ''}`}
                onClick={() => setInputTypeA('url')}
              >
                URL
              </button>
              <button
                className={`type-btn ${inputTypeA === 'html' ? 'active' : ''}`}
                onClick={() => setInputTypeA('html')}
              >
                HTML
              </button>
            </div>
          </div>
          {inputTypeA === 'url' ? (
            <input
              type="text"
              className="glass-input"
              placeholder="https://example.com/page-a"
              value={contentA}
              onChange={(e) => setContentA(e.target.value)}
              disabled={isComparing}
            />
          ) : (
            <textarea
              className="glass-input textarea"
              placeholder="粘贴HTML代码片段..."
              value={contentA}
              onChange={(e) => setContentA(e.target.value)}
              disabled={isComparing}
            />
          )}
        </div>

        <div className="vs-divider">
          <span>VS</span>
        </div>

        <div className="input-group">
          <div className="input-label-row">
            <label className="input-label">页面 B</label>
            <div className="type-toggle">
              <button
                className={`type-btn ${inputTypeB === 'url' ? 'active' : ''}`}
                onClick={() => setInputTypeB('url')}
              >
                URL
              </button>
              <button
                className={`type-btn ${inputTypeB === 'html' ? 'active' : ''}`}
                onClick={() => setInputTypeB('html')}
              >
                HTML
              </button>
            </div>
          </div>
          {inputTypeB === 'url' ? (
            <input
              type="text"
              className="glass-input"
              placeholder="https://example.com/page-b"
              value={contentB}
              onChange={(e) => setContentB(e.target.value)}
              disabled={isComparing}
            />
          ) : (
            <textarea
              className="glass-input textarea"
              placeholder="粘贴HTML代码片段..."
              value={contentB}
              onChange={(e) => setContentB(e.target.value)}
              disabled={isComparing}
            />
          )}
        </div>
      </div>

      <div className="viewport-section">
        <label className="section-label">视口宽度 (px)</label>
        <div className="viewport-grid">
          {VIEWPORT_OPTIONS.map((vp) => (
            <button
              key={vp}
              className={`viewport-btn ${selectedViewports.includes(vp) ? 'selected' : ''}`}
              onClick={() => toggleViewport(vp)}
              disabled={isComparing}
            >
              {vp}
            </button>
          ))}
        </div>
      </div>

      <div className="options-section">
        <label className="section-label">渲染等待时间</label>
        <div className="wait-time-slider">
          <input
            type="range"
            min="1000"
            max="10000"
            step="500"
            value={waitTime}
            onChange={(e) => setWaitTime(Number(e.target.value))}
            disabled={isComparing}
            className="range-slider"
          />
          <span className="wait-time-value">{waitTime / 1000}s</span>
        </div>
      </div>

      <div className="action-buttons">
        <button
          className="primary-btn start-btn"
          onClick={handleStart}
          disabled={isComparing}
        >
          {isComparing ? (
            <>
              <span className="spinner"></span>
              比对中...
            </>
          ) : (
            '开始比对'
          )}
        </button>

        <button
          className="secondary-btn export-btn"
          onClick={onExportReport}
          disabled={!canExport || isComparing}
        >
          导出报告
        </button>
      </div>

      <div className="status-messages">
        {statusMessages.map((msg) => (
          <div
            key={msg.id}
            className={`status-message ${msg.visible ? 'visible' : ''}`}
          >
            {msg.text}
          </div>
        ))}
      </div>
    </div>
  )

  if (isMobileOpen !== undefined) {
    return (
      <div className={`control-panel mobile ${isMobileOpen ? 'open' : ''}`}>
        {isMobileOpen && (
          <button className="mobile-close-btn" onClick={onCloseMobile}>
            ×
          </button>
        )}
        <PanelContent />
      </div>
    )
  }

  return (
    <aside className="control-panel">
      <PanelContent />
    </aside>
  )
}

export default ControlPanel
