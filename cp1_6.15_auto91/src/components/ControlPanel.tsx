import { useRef, useState, useCallback, useEffect } from 'react'
import {
  useAppStore,
  PRESET_PALETTES,
  FPS_OPTIONS,
  type PaletteMode,
  type RawImage
} from '../store/appStore'
import { convertToPixels, loadImageToCanvas } from '../utils/pixelConverter'
import { renderPixelCanvas } from '../utils/pixelRenderer'
import { exportGif, exportPng, downloadBlob, type FrameData } from '../utils/gifExporter'

const CANVAS_WIDTH = 600
const CANVAS_HEIGHT = 600
const MAX_FILE_SIZE = 5 * 1024 * 1024
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const PALETTE_OPTIONS: { key: PaletteMode; label: string }[] = [
  { key: 'nes', label: '经典NES' },
  { key: 'gameboy', label: 'GameBoy' },
  { key: 'sunny', label: '暖阳' },
  { key: 'cyberpunk', label: '赛博朋克' },
  { key: 'retro', label: '复古' },
  { key: 'watercolor', label: '水彩' },
  { key: 'grayscale', label: '灰度' },
  { key: 'custom', label: '自定义' }
]

interface PanelSectionProps {
  title: string
  panelKey: string
  children: React.ReactNode
}

const PanelSection = ({ title, panelKey, children }: PanelSectionProps) => {
  const { collapsedPanels, togglePanel } = useAppStore()
  const isCollapsed = collapsedPanels[panelKey]

  return (
    <div className="panel-section">
      <div
        className="panel-title"
        onClick={() => togglePanel(panelKey)}
        style={{ cursor: 'pointer' }}
      >
        <span>{title}</span>
        <span className={`collapse-arrow ${isCollapsed ? 'collapsed' : ''}`}>▾</span>
      </div>
      <div className={`panel-content ${isCollapsed ? 'collapsed' : ''}`}>{children}</div>
    </div>
  )
}

export const ControlPanel = () => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const multiFileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [showFpsDropdown, setShowFpsDropdown] = useState(false)
  const [exportModalVisible, setExportModalVisible] = useState(false)
  const [exportStatus, setExportStatus] = useState<string>('')
  const colorInputRefs = useRef<(HTMLInputElement | null)[]>([])

  const {
    rawImageList,
    pixelSizePerFrame,
    paletteMode,
    paletteModePerFrame,
    paletteColors,
    paletteColorsPerFrame,
    fps,
    isPlaying,
    currentFrameIndex,
    collapsedPanels,
    exportProgress,
    isExporting,
    gifLoopForever,
    addImage,
    removeImage,
    setPixelSize,
    setGlobalPixelSize,
    setPaletteMode,
    setPaletteModeForFrame,
    setPaletteColor,
    setPaletteColorForFrame,
    setFps,
    togglePlaying,
    setCurrentFrame,
    setExportProgress,
    setIsExporting,
    setGifLoopForever,
    getPaletteForFrame,
    getPixelSizeForFrame
  } = useAppStore()

  const handleFileUpload = useCallback(
    async (files: FileList | null, replace: boolean = false) => {
      if (!files || files.length === 0) return

      const maxFrames = 12
      const currentCount = rawImageList.length
      let remainingSlots = maxFrames - (replace ? 0 : currentCount)

      for (let i = 0; i < files.length && remainingSlots > 0; i++) {
        const file = files[i]

        if (!ACCEPTED_TYPES.includes(file.type)) {
          alert(`不支持的文件格式: ${file.name}。请上传 JPG/PNG/WebP 格式的图片。`)
          continue
        }

        if (file.size > MAX_FILE_SIZE) {
          alert(`文件过大: ${file.name}。最大支持 5MB。`)
          continue
        }

        try {
          const url = URL.createObjectURL(file)
          const img = await new Promise<{ width: number; height: number }>((resolve, reject) => {
            const im = new Image()
            im.onload = () => resolve({ width: im.naturalWidth, height: im.naturalHeight })
            im.onerror = reject
            im.src = url
          })

          const image: RawImage = {
            id: Math.random().toString(36).substr(2, 9),
            name: file.name,
            url,
            width: img.width,
            height: img.height
          }
          addImage(image)
          remainingSlots--
        } catch (e) {
          console.error('File load error:', e)
        }
      }
    },
    [addImage, rawImageList.length]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      handleFileUpload(e.dataTransfer.files)
    },
    [handleFileUpload]
  )

  const currentPalette = getPaletteForFrame(currentFrameIndex)
  const currentPixelSize = getPixelSizeForFrame(currentFrameIndex)
  const currentPaletteMode =
    rawImageList.length > 0 ? paletteModePerFrame[currentFrameIndex] || paletteMode : paletteMode
  const currentPaletteColors =
    rawImageList.length > 0 ? paletteColorsPerFrame[currentFrameIndex] || paletteColors : paletteColors

  const handleExportPNG = async () => {
    if (!rawImageList[currentFrameIndex]) return

    setExportModalVisible(true)
    setIsExporting(true)
    setExportStatus('正在生成 PNG...')
    setExportProgress(10)

    try {
      const offCanvas = document.createElement('canvas')
      const pixelSize = currentPixelSize
      offCanvas.width = CANVAS_WIDTH
      offCanvas.height = CANVAS_HEIGHT
      const ctx = offCanvas.getContext('2d')!

      setExportProgress(30)

      const imageSource = await loadImageToCanvas(
        rawImageList[currentFrameIndex].url,
        CANVAS_WIDTH,
        CANVAS_HEIGHT
      )

      setExportProgress(50)

      const cols = Math.max(1, Math.floor(CANVAS_WIDTH / pixelSize))
      const rows = Math.max(1, Math.floor(CANVAS_HEIGHT / pixelSize))
      const data = convertToPixels(imageSource, pixelSize, cols, rows, currentPalette)

      setExportProgress(70)

      renderPixelCanvas(ctx, data, {
        canvasWidth: CANVAS_WIDTH,
        canvasHeight: CANVAS_HEIGHT,
        showGrid: false,
        exportScale: pixelSize
      })

      setExportProgress(85)

      const exportCanvas = document.createElement('canvas')
      const exportW = CANVAS_WIDTH
      const exportH = CANVAS_HEIGHT
      exportCanvas.width = exportW * pixelSize
      exportCanvas.height = exportH * pixelSize
      const eCtx = exportCanvas.getContext('2d')!
      eCtx.imageSmoothingEnabled = false
      eCtx.drawImage(offCanvas, 0, 0, exportCanvas.width, exportCanvas.height)

      setExportProgress(95)

      await exportPng(exportCanvas, pixelSize, `pixelart-frame${currentFrameIndex + 1}.png`)
      setExportProgress(100)
      setExportStatus('导出完成！')

      setTimeout(() => {
        setExportModalVisible(false)
        setIsExporting(false)
      }, 800)
    } catch (e) {
      console.error(e)
      setExportStatus('导出失败')
      setTimeout(() => {
        setExportModalVisible(false)
        setIsExporting(false)
      }, 1500)
    }
  }

  const handleExportGIF = async () => {
    if (rawImageList.length < 2) {
      alert('请至少上传2张图片以生成GIF动画')
      return
    }

    setExportModalVisible(true)
    setIsExporting(true)
    setExportStatus('正在准备帧数据...')
    setExportProgress(5)

    try {
      const frames: FrameData[] = []
      const total = rawImageList.length
      const delay = Math.round(1000 / fps) - 10

      for (let i = 0; i < total; i++) {
        const image = rawImageList[i]
        const ps = getPixelSizeForFrame(i)
        const pal = getPaletteForFrame(i)

        setExportStatus(`处理第 ${i + 1}/${total} 帧...`)

        const offCanvas = document.createElement('canvas')
        offCanvas.width = CANVAS_WIDTH
        offCanvas.height = CANVAS_HEIGHT
        const ctx = offCanvas.getContext('2d')!

        const imageSource = await loadImageToCanvas(image.url, CANVAS_WIDTH, CANVAS_HEIGHT)
        const cols = Math.max(1, Math.floor(CANVAS_WIDTH / ps))
        const rows = Math.max(1, Math.floor(CANVAS_HEIGHT / ps))
        const data = convertToPixels(imageSource, ps, cols, rows, pal)
        renderPixelCanvas(ctx, data, {
          canvasWidth: CANVAS_WIDTH,
          canvasHeight: CANVAS_HEIGHT,
          showGrid: false
        })

        const imageData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
        frames.push({ imageData, delay })

        setExportProgress(Math.round(10 + (i / total) * 40))
      }

      setExportStatus('编码 GIF 中...')
      setExportProgress(55)

      const blob = await exportGif({
        frames,
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        quality: 10,
        loop: gifLoopForever,
        onProgress: (p) => {
          setExportProgress(55 + Math.round(p * 40))
        }
      })

      setExportProgress(100)
      setExportStatus('导出完成！')
      downloadBlob(blob, `pixelart-animation-${fps}fps.gif`)

      setTimeout(() => {
        setExportModalVisible(false)
        setIsExporting(false)
      }, 800)
    } catch (e) {
      console.error(e)
      setExportStatus('导出失败: ' + (e as Error).message)
      setTimeout(() => {
        setExportModalVisible(false)
        setIsExporting(false)
      }, 2000)
    }
  }

  const triggerColorPicker = (index: number) => {
    const input = colorInputRefs.current[index]
    if (input) input.click()
  }

  const handleGlobalColorChange = (index: number, color: string) => {
    if (rawImageList.length > 0) {
      setPaletteColorForFrame(currentFrameIndex, index, color)
    } else {
      setPaletteColor(index, color)
    }
  }

  const handlePaletteModeChange = (mode: PaletteMode) => {
    if (rawImageList.length > 0) {
      setPaletteModeForFrame(currentFrameIndex, mode)
    } else {
      setPaletteMode(mode)
    }
  }

  return (
    <div className="control-panel">
      <div className="panel-header">
        <h1 className="app-title">
          <span className="title-pixel" style={{ color: '#e94560' }}>P</span>ixelArt{' '}
          <span className="title-pixel" style={{ color: '#e94560' }}>S</span>tudio
        </h1>
      </div>

      <PanelSection title="📤 图片上传" panelKey="upload">
        <div
          className={`upload-area ${dragOver ? 'drag-over' : ''}`}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="upload-icon">🖼️</div>
          <div className="upload-text">
            <div>点击或拖拽图片到此处</div>
            <div className="upload-subtext">
              支持 JPG / PNG / WebP · 最大 5MB · 最多 12 张
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => {
              handleFileUpload(e.target.files)
              e.target.value = ''
            }}
          />
        </div>

        <div className="upload-buttons">
          <button
            className="btn-secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={rawImageList.length >= 12}
          >
            + 添加单张
          </button>
          <button
            className="btn-secondary"
            onClick={() => multiFileInputRef.current?.click()}
            disabled={rawImageList.length >= 12}
          >
            + 批量添加
          </button>
          <input
            ref={multiFileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => {
              handleFileUpload(e.target.files)
              e.target.value = ''
            }}
          />
        </div>

        {rawImageList.length > 0 && (
          <div className="frame-list">
            <div className="frame-list-header">
              <span>帧列表 ({rawImageList.length}/12)</span>
            </div>
            <div className="frame-list-grid">
              {rawImageList.map((img, idx) => (
                <div
                  key={img.id}
                  className={`frame-thumb ${idx === currentFrameIndex ? 'active' : ''}`}
                  onClick={() => setCurrentFrame(idx)}
                >
                  <img src={img.url} alt={img.name} className="frame-thumb-img" />
                  <div className="frame-thumb-index">{idx + 1}</div>
                  <button
                    className="frame-thumb-remove"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeImage(img.id)
                    }}
                    title="删除帧"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {rawImageList[currentFrameIndex] && (
          <div className="preview-section">
            <div className="preview-title">原图预览</div>
            <div className="preview-box">
              <img src={rawImageList[currentFrameIndex].url} alt="preview" className="preview-img" />
            </div>
            <div className="preview-info">{rawImageList[currentFrameIndex].name}</div>
          </div>
        )}
      </PanelSection>

      <PanelSection title="🔲 像素大小" panelKey="pixel">
        <div className="slider-section">
          <div className="slider-header">
            <span>像素块大小</span>
            <span className="slider-value">{currentPixelSize}px × {currentPixelSize}px</span>
          </div>
          <input
            type="range"
            min="4"
            max="32"
            step="2"
            value={currentPixelSize}
            onChange={(e) => {
              const val = parseInt(e.target.value)
              if (rawImageList.length > 0) {
                setPixelSize(currentFrameIndex, val)
              }
            }}
            className="pixel-slider"
            disabled={rawImageList.length === 0}
          />
          <div className="slider-markers">
            <span>4</span>
            <span>16</span>
            <span>32</span>
          </div>
        </div>

        {rawImageList.length > 1 && (
          <div className="apply-all-section">
            <button
              className="btn-small"
              onClick={() => setGlobalPixelSize(currentPixelSize)}
            >
              应用到全部帧
            </button>
          </div>
        )}
      </PanelSection>

      <PanelSection title="🎨 调色板风格" panelKey="palette">
        <div className="palette-mode-grid">
          {PALETTE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              className={`palette-mode-btn ${currentPaletteMode === opt.key ? 'active' : ''}`}
              onClick={() => handlePaletteModeChange(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="custom-palette-section">
          <div className="custom-palette-header">
            <span>调色板颜色</span>
            <span className="palette-count">{currentPaletteColors.length} 色</span>
          </div>
          <div className="palette-colors-grid">
            {currentPaletteColors.map((color, idx) => (
              <div key={idx} className="palette-color-wrapper">
                <div
                  className="palette-color-swatch"
                  style={{ backgroundColor: color }}
                  onClick={() => triggerColorPicker(idx)}
                  title="点击修改颜色"
                />
                <input
                  ref={(el) => (colorInputRefs.current[idx] = el)}
                  type="color"
                  value={color}
                  onChange={(e) => handleGlobalColorChange(idx, e.target.value)}
                  style={{ display: 'none' }}
                />
              </div>
            ))}
          </div>
        </div>
      </PanelSection>

      <PanelSection title="🎬 动画与导出" panelKey="animation">
        <div className="animation-control">
          <div className="fps-selector-wrapper">
            <div
              className={`fps-circle ${showFpsDropdown ? 'open' : ''}`}
              onClick={() => setShowFpsDropdown(!showFpsDropdown)}
            >
              <div className="fps-circle-inner">
                <div className="fps-value">{fps}</div>
                <div className="fps-label">FPS</div>
              </div>
              {showFpsDropdown && (
                <div className="fps-dropdown" onClick={(e) => e.stopPropagation()}>
                  {FPS_OPTIONS.map((f) => (
                    <div
                      key={f}
                      className={`fps-option ${f === fps ? 'active' : ''}`}
                      onClick={() => {
                        setFps(f)
                        setShowFpsDropdown(false)
                      }}
                    >
                      {f} FPS
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="playback-controls">
            <button
              className="btn-playback"
              onClick={togglePlaying}
              disabled={rawImageList.length < 2}
            >
              {isPlaying ? '⏸ 暂停' : '▶ 播放'}
            </button>
            <div className="frame-nav">
              <button
                className="btn-frame-nav"
                onClick={() =>
                  setCurrentFrame(
                    currentFrameIndex === 0 ? rawImageList.length - 1 : currentFrameIndex - 1
                  )
                }
                disabled={rawImageList.length < 1}
              >
                ‹
              </button>
              <span className="frame-nav-text">
                {rawImageList.length > 0 ? currentFrameIndex + 1 : 0}/
                {rawImageList.length}
              </span>
              <button
                className="btn-frame-nav"
                onClick={() =>
                  setCurrentFrame(
                    currentFrameIndex === rawImageList.length - 1 ? 0 : currentFrameIndex + 1
                  )
                }
                disabled={rawImageList.length < 1}
              >
                ›
              </button>
            </div>
          </div>
        </div>

        <div className="gif-loop-option">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={gifLoopForever}
              onChange={(e) => setGifLoopForever(e.target.checked)}
            />
            <span>GIF 无限循环播放</span>
          </label>
        </div>

        <div className="export-section">
          <div className="export-title">导出</div>
          <div className="export-buttons">
            <button
              className="btn-primary"
              onClick={handleExportPNG}
              disabled={rawImageList.length === 0 || isExporting}
            >
              📥 导出 PNG
            </button>
            <button
              className="btn-primary"
              onClick={handleExportGIF}
              disabled={rawImageList.length < 2 || isExporting}
            >
              🎞️ 导出 GIF
            </button>
          </div>
        </div>
      </PanelSection>

      {exportModalVisible && (
        <div className="export-modal-overlay">
          <div className="export-modal">
            <div className="export-modal-title">
              {isExporting ? '正在导出...' : '导出完成'}
            </div>
            <div className="export-modal-status">{exportStatus}</div>
            <div className="export-progress-bar-bg">
              <div
                className="export-progress-bar-fill"
                style={{ width: exportProgress + '%' }}
              />
            </div>
            <div className="export-progress-text">{exportProgress}%</div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ControlPanel
