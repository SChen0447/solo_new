import type { ConvertedPixelData } from './pixelConverter'

export interface RenderOptions {
  canvasWidth: number
  canvasHeight: number
  showGrid?: boolean
  gridColor?: string
  gridLineWidth?: number
  exportScale?: number
}

export const renderPixelCanvas = (
  ctx: CanvasRenderingContext2D,
  pixelData: ConvertedPixelData,
  options: RenderOptions
): void => {
  const {
    canvasWidth,
    canvasHeight,
    showGrid = true,
    gridColor = '#e0e0e0',
    gridLineWidth = 0.5,
    exportScale = 1
  } = options

  const { blocks, cols, rows } = pixelData

  const pixelBlockW = (canvasWidth / cols) * exportScale
  const pixelBlockH = (canvasHeight / rows) * exportScale
  const totalW = canvasWidth * exportScale
  const totalH = canvasHeight * exportScale

  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, totalW, totalH)

  const offsetX = 0
  const offsetY = 0

  for (const block of blocks) {
    const x = offsetX + block.col * pixelBlockW
    const y = offsetY + block.row * pixelBlockH
    ctx.fillStyle = `rgb(${block.color[0]},${block.color[1]},${block.color[2]})`
    ctx.fillRect(Math.floor(x), Math.floor(y), Math.ceil(pixelBlockW), Math.ceil(pixelBlockH))
  }

  if (showGrid && exportScale === 1) {
    ctx.strokeStyle = gridColor
    ctx.lineWidth = gridLineWidth
    ctx.beginPath()
    for (let col = 0; col <= cols; col++) {
      const x = offsetX + col * pixelBlockW
      ctx.moveTo(x, offsetY)
      ctx.lineTo(x, offsetY + rows * pixelBlockH)
    }
    for (let row = 0; row <= rows; row++) {
      const y = offsetY + row * pixelBlockH
      ctx.moveTo(offsetX, y)
      ctx.lineTo(offsetX + cols * pixelBlockW, y)
    }
    ctx.stroke()
  }
}

export const getCanvasPixelData = (
  canvas: HTMLCanvasElement
): { width: number; height: number; data: Uint8ClampedArray } => {
  const ctx = canvas.getContext('2d')!
  return ctx.getImageData(0, 0, canvas.width, canvas.height)
}
