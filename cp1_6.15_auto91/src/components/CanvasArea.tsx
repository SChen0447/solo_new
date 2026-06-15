import { useEffect, useRef, useState, useCallback } from 'react'
import { useAppStore } from '../store/appStore'
import { convertToPixels, loadImageToCanvas, type ConvertedPixelData } from '../utils/pixelConverter'
import { renderPixelCanvas } from '../utils/pixelRenderer'

const CANVAS_WIDTH = 600
const CANVAS_HEIGHT = 600

interface FrameCache {
  [key: string]: ConvertedPixelData
}

export const CanvasArea = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [canvasScale, setCanvasScale] = useState(1)
  const frameCacheRef = useRef<FrameCache>({})
  const renderScheduledRef = useRef(false)

  const {
    rawImageList,
    getPaletteForFrame,
    getPixelSizeForFrame,
    currentFrameIndex,
    isPlaying,
    fps,
    setCurrentFrame
  } = useAppStore()

  const currentImage = rawImageList[currentFrameIndex]
  const currentPixelSize = getPixelSizeForFrame(currentFrameIndex)
  const currentPalette = getPaletteForFrame(currentFrameIndex)

  const computeFrame = useCallback(async () => {
    if (!currentImage) return null
    const paletteStr = currentPalette.join('|')
    const cacheKey = `${currentImage.id}_${currentPixelSize}_${paletteStr}`

    if (frameCacheRef.current[cacheKey]) {
      return frameCacheRef.current[cacheKey]
    }

    try {
      const imageSource = await loadImageToCanvas(currentImage.url, CANVAS_WIDTH, CANVAS_HEIGHT)
      const cols = Math.max(1, Math.floor(CANVAS_WIDTH / currentPixelSize))
      const rows = Math.max(1, Math.floor(CANVAS_HEIGHT / currentPixelSize))

      const data = convertToPixels(imageSource, currentPixelSize, cols, rows, currentPalette)
      frameCacheRef.current[cacheKey] = data
      return data
    } catch (e) {
      console.error('computeFrame error:', e)
      return null
    }
  }, [currentImage, currentPixelSize, currentPalette])

  const renderToCanvas = useCallback(
    async (frameOverride?: number) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const frameIdx = frameOverride !== undefined ? frameOverride : currentFrameIndex
      const image = rawImageList[frameIdx]

      ctx.imageSmoothingEnabled = false
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      if (!image) {
        ctx.fillStyle = '#e0e0e0'
        ctx.font = '18px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('请上传图片', canvas.width / 2, canvas.height / 2)
        return
      }

      const palette = getPaletteForFrame(frameIdx)
      const pixelSize = getPixelSizeForFrame(frameIdx)
      const paletteStr = palette.join('|')
      const cacheKey = `${image.id}_${pixelSize}_${paletteStr}`

      let data = frameCacheRef.current[cacheKey]

      if (!data) {
        try {
          const imageSource = await loadImageToCanvas(image.url, CANVAS_WIDTH, CANVAS_HEIGHT)
          const cols = Math.max(1, Math.floor(CANVAS_WIDTH / pixelSize))
          const rows = Math.max(1, Math.floor(CANVAS_HEIGHT / pixelSize))
          data = convertToPixels(imageSource, pixelSize, cols, rows, palette)
          frameCacheRef.current[cacheKey] = data
        } catch (e) {
          console.error('renderToCanvas error:', e)
          return
        }
      }

      renderPixelCanvas(ctx, data, {
        canvasWidth: CANVAS_WIDTH,
        canvasHeight: CANVAS_HEIGHT,
        showGrid: pixelSize >= 8,
        gridColor: '#e0e0e0',
        gridLineWidth: 0.5
      })
    },
    [rawImageList, currentFrameIndex, getPaletteForFrame, getPixelSizeForFrame]
  )

  const debouncedRender = useCallback(() => {
    if (renderScheduledRef.current) return
    renderScheduledRef.current = true
    setTimeout(() => {
      renderScheduledRef.current = false
      renderToCanvas()
    }, 50)
  }, [renderToCanvas])

  useEffect(() => {
    debouncedRender()
  }, [debouncedRender, currentFrameIndex, currentPixelSize, currentPalette, rawImageList.length])

  useEffect(() => {
    if (!isPlaying || rawImageList.length < 2) return

    const frameInterval = 1000 / fps
    let lastFrameTime = performance.now()
    let nextFrameIdx = (currentFrameIndex + 1) % rawImageList.length
    let rafId: number

    const loop = (now: number) => {
      const elapsed = now - lastFrameTime
      if (elapsed >= frameInterval - 5) {
        setCurrentFrame(nextFrameIdx)
        renderToCanvas(nextFrameIdx)
        nextFrameIdx = (nextFrameIdx + 1) % rawImageList.length
        lastFrameTime = now - (elapsed - frameInterval)
      }
      rafId = requestAnimationFrame(loop)
    }

    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  }, [isPlaying, rawImageList.length, fps, setCurrentFrame, renderToCanvas, currentFrameIndex])

  useEffect(() => {
    const handleResize = () => {
      const canvasContainer = canvasRef.current?.parentElement
      if (!canvasContainer) return
      const containerWidth = canvasContainer.clientWidth
      if (window.innerWidth < 600) {
        const targetWidth = Math.min(containerWidth, window.innerWidth * 0.95) - 32
        setCanvasScale(Math.min(1, targetWidth / CANVAS_WIDTH))
      } else {
        setCanvasScale(1)
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) {
      canvas.width = CANVAS_WIDTH
      canvas.height = CANVAS_HEIGHT
    }
  }, [])

  const displayedWidth = CANVAS_WIDTH * canvasScale
  const displayedHeight = CANVAS_HEIGHT * canvasScale

  return (
    <div className="canvas-area">
      <div className="canvas-wrapper">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{
            width: displayedWidth + 'px',
            height: displayedHeight + 'px',
            imageRendering: 'pixelated'
          }}
        />
        {currentImage && (
          <div className="canvas-info">
            <span>
              帧 {currentFrameIndex + 1}/{rawImageList.length}
            </span>
            <span>像素块: {currentPixelSize}px</span>
            <span>调色板: {currentPalette.length}色</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default CanvasArea
