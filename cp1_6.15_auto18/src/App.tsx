import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useColorExtractor, RGB } from './hooks/useColorExtractor'
import ColorPalette from './components/ColorPalette'
import SwatchPreview from './components/SwatchPreview'

const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
)

const ImageIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
)

const App: React.FC = () => {
  const { colors, isLoading, error, imageUrl, handleFile, reset } = useColorExtractor()
  const [paletteColors, setPaletteColors] = useState<RGB[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounterRef = useRef(0)

  useEffect(() => {
    if (colors.length > 0) {
      setPaletteColors(colors)
    }
  }, [colors])

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [handleFile])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current = 0
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFile(file)
    }
  }, [handleFile])

  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current += 1
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true)
    }
  }, [])

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current -= 1
    if (dragCounterRef.current <= 0) {
      setIsDragging(false)
    }
  }, [])

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleReset = useCallback(() => {
    reset()
    setPaletteColors([])
  }, [reset])

  const handlePaletteChange = useCallback((newColors: RGB[]) => {
    setPaletteColors(newColors)
  }, [])

  return (
    <div className="app">
      <header className="header">
        <h1>🎨 指尖调色盘</h1>
      </header>

      <section className="upload-section">
        {!imageUrl ? (
          <div
            className={`upload-area ${isDragging ? 'dragging' : ''}`}
            onDragEnter={onDragEnter}
            onDragLeave={onDragLeave}
            onDragOver={onDragOver}
            onDrop={onDrop}
          >
            <UploadIcon className="upload-icon" />
            <p className="upload-text">点击或拖拽图片到此处上传</p>
            <p className="upload-text" style={{ fontSize: '12px', marginTop: '6px', opacity: 0.7 }}>
              支持 PNG / JPG / WebP · 最大 5MB
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden-input"
              onChange={onFileChange}
            />
          </div>
        ) : (
          <div
            className="preview-image-container"
            onDragEnter={onDragEnter}
            onDragLeave={onDragLeave}
            onDragOver={onDragOver}
            onDrop={onDrop}
          >
            <img src={imageUrl} alt="上传预览" />
            <button className="reupload-btn" onClick={handleReset}>
              重新上传
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden-input"
              onChange={onFileChange}
            />
          </div>
        )}

        {isLoading && (
          <div className="loading-indicator">
            <div className="spinner" />
            <span>正在提取主色调...</span>
          </div>
        )}

        {error && (
          <div className="error-message">{error}</div>
        )}
      </section>

      <ColorPalette
        colors={paletteColors}
        onColorsChange={handlePaletteChange}
      />

      <SwatchPreview colors={paletteColors} />

      {paletteColors.length === 0 && !isLoading && !imageUrl && (
        <div className="empty-state">
          <ImageIcon className="empty-state-icon" />
          <div className="empty-state-text">
            上传一张喜欢的图片，开始调色之旅吧！<br />
            系统会自动从图片中提取8种主要颜色
          </div>
        </div>
      )}
    </div>
  )
}

export default App
