import { applyFilter } from './styleFilters'
import type { FilterType, FrameType, WatermarkPosition } from '@/types'
import { EXPORT_SIZE } from '@/types'

export interface RenderOptions {
  filter: FilterType
  filterIntensity: number
  frame: FrameType
  frameOpacity: number
  watermarkText: string
  watermarkOpacity: number
  watermarkPosition: WatermarkPosition
  targetSize?: number
}

export interface LoadedImage {
  element: HTMLImageElement
  dataUrl: string
  width: number
  height: number
}

export function loadImageFromFile(file: File): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.onload = () => {
      const dataUrl = reader.result as string
      const img = new Image()
      img.onload = () => {
        resolve({
          element: img,
          dataUrl,
          width: img.naturalWidth,
          height: img.naturalHeight,
        })
      }
      img.onerror = () => reject(new Error('图片加载失败'))
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  })
}

export function createOffscreenCanvas(w: number, h: number): {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
} {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas 2D 上下文不可用')
  return { canvas, ctx }
}

export function getContainSize(
  imgW: number,
  imgH: number,
  maxW: number,
  maxH: number
): { width: number; height: number; offsetX: number; offsetY: number } {
  const ratio = Math.min(maxW / imgW, maxH / imgH, 1)
  const w = Math.floor(imgW * ratio)
  const h = Math.floor(imgH * ratio)
  return {
    width: w,
    height: h,
    offsetX: Math.floor((maxW - w) / 2),
    offsetY: Math.floor((maxH - h) / 2),
  }
}

export function getCoverSize(
  imgW: number,
  imgH: number,
  targetW: number,
  targetH: number
): { width: number; height: number; offsetX: number; offsetY: number } {
  const ratio = Math.max(targetW / imgW, targetH / imgH)
  const w = Math.floor(imgW * ratio)
  const h = Math.floor(imgH * ratio)
  return {
    width: w,
    height: h,
    offsetX: Math.floor((targetW - w) / 2),
    offsetY: Math.floor((targetH - h) / 2),
  }
}

const frameCache: Map<FrameType, HTMLImageElement | null> = new Map()

export async function loadFrameImage(frame: FrameType): Promise<HTMLImageElement | null> {
  if (frame === 'none') return null
  if (frameCache.has(frame)) return frameCache.get(frame) ?? null

  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    const name = frame.startsWith('classical') ? 'classical'
      : frame.startsWith('modern') ? 'modern' : 'minimal'
    img.onload = () => {
      frameCache.set(frame, img)
      resolve(img)
    }
    img.onerror = () => {
      frameCache.set(frame, null)
      resolve(null)
    }
    img.src = `/src/assets/frames/${name}.svg?id=${frame}`
  })
}

function drawWatermark(
  ctx: CanvasRenderingContext2D,
  text: string,
  position: WatermarkPosition,
  opacity: number,
  canvasW: number,
  canvasH: number,
  imgX: number,
  imgY: number,
  imgW: number,
  imgH: number
) {
  if (!text || opacity <= 0) return
  const maxFontSize = 60
  const fontSize = Math.min(maxFontSize, Math.max(14, Math.floor(imgW * 0.05)))
  const padding = Math.max(12, Math.floor(imgW * 0.02))

  ctx.save()
  ctx.globalAlpha = opacity
  ctx.font = `${fontSize}px 'Georgia', 'Times New Roman', serif`
  ctx.textBaseline = 'alphabetic'

  const metrics = ctx.measureText(text)
  const textW = metrics.width
  const textH = fontSize

  let x = imgX
  let y = imgY

  switch (position) {
    case 'tl':
      ctx.textAlign = 'left'
      x = imgX + padding
      y = imgY + padding + textH
      break
    case 'tr':
      ctx.textAlign = 'right'
      x = imgX + imgW - padding
      y = imgY + padding + textH
      break
    case 'bl':
      ctx.textAlign = 'left'
      x = imgX + padding
      y = imgY + imgH - padding
      break
    case 'br':
      ctx.textAlign = 'right'
      x = imgX + imgW - padding
      y = imgY + imgH - padding
      break
    case 'center':
      ctx.textAlign = 'center'
      x = imgX + imgW / 2
      y = imgY + imgH / 2 + textH / 2
      break
  }

  ctx.shadowColor = 'rgba(0,0,0,0.6)'
  ctx.shadowBlur = Math.max(2, fontSize * 0.15)
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = Math.max(1, fontSize * 0.05)
  ctx.fillStyle = '#ffffff'
  ctx.fillText(text, x, y)
  ctx.restore()
}

export async function renderToCanvas(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  options: RenderOptions,
  onProgress?: (p: number) => void
): Promise<void> {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas context unavailable')

  const cw = canvas.width
  const ch = canvas.height
  ctx.clearRect(0, 0, cw, ch)
  onProgress?.(5)

  const imgW = image.naturalWidth
  const imgH = image.naturalHeight
  const fit = getContainSize(imgW, imgH, cw, ch)

  const workCanvas = document.createElement('canvas')
  workCanvas.width = fit.width
  workCanvas.height = fit.height
  const wctx = workCanvas.getContext('2d', { willReadFrequently: true })
  if (!wctx) throw new Error('Work canvas context unavailable')
  wctx.drawImage(image, 0, 0, fit.width, fit.height)
  onProgress?.(20)

  try {
    if (options.filter !== 'none') {
      const imgData = wctx.getImageData(0, 0, fit.width, fit.height)
      const processed = applyFilter(options.filter, imgData, options.filterIntensity)
      wctx.putImageData(processed, 0, 0)
    }
    onProgress?.(55)
  } catch (e) {
    console.warn('滤镜处理失败，使用原图:', e)
  }

  ctx.drawImage(workCanvas, fit.offsetX, fit.offsetY, fit.width, fit.height)
  onProgress?.(65)

  if (options.frame !== 'none' && options.frameOpacity > 0) {
    const frameImg = await loadFrameImage(options.frame)
    if (frameImg) {
      ctx.save()
      ctx.globalAlpha = options.frameOpacity
      const cover = getCoverSize(frameImg.naturalWidth, frameImg.naturalHeight, cw, ch)
      ctx.drawImage(
        frameImg,
        cover.offsetX,
        cover.offsetY,
        cover.width,
        cover.height
      )
      ctx.restore()
    }
  }
  onProgress?.(85)

  drawWatermark(
    ctx,
    options.watermarkText,
    options.watermarkPosition,
    options.watermarkOpacity,
    cw,
    ch,
    fit.offsetX,
    fit.offsetY,
    fit.width,
    fit.height
  )
  onProgress?.(100)
}

export async function exportHDImage(
  image: HTMLImageElement,
  options: RenderOptions,
  onProgress?: (p: number) => void
): Promise<Blob> {
  const { canvas } = createOffscreenCanvas(EXPORT_SIZE, EXPORT_SIZE)
  await renderToCanvas(canvas, image, options, onProgress)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error('生成图片失败'))
        else resolve(blob)
      },
      'image/png',
      1.0
    )
  })
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function createFramePlaceholder(
  frameId: FrameType,
  size: number
): string {
  const name = frameId.startsWith('classical') ? 'classical'
    : frameId.startsWith('modern') ? 'modern' : 'minimal'
  const colors: Record<string, [string, string]> = {
    classical: ['#d4a574', '#8b6914'],
    modern: ['#555555', '#222222'],
    minimal: ['#888888', '#cccccc'],
  }
  const [c1, c2] = colors[name] || ['#888', '#444']
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100" preserveAspectRatio="none">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="100%" stop-color="${c2}"/>
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="100" height="100" fill="none" stroke="url(#g)" stroke-width="${name === 'minimal' ? 3 : 8}"/>
    ${name === 'classical' ? `<circle cx="8" cy="8" r="4" fill="${c1}"/><circle cx="92" cy="8" r="4" fill="${c1}"/><circle cx="8" cy="92" r="4" fill="${c1}"/><circle cx="92" cy="92" r="4" fill="${c1}"/>` : ''}
    ${name === 'modern' ? `<rect x="2" y="2" width="96" height="96" fill="none" stroke="${c2}" stroke-width="1" opacity="0.5"/>` : ''}
    ${name === 'minimal' ? `<rect x="6" y="6" width="88" height="88" fill="none" stroke="${c1}" stroke-width="1" opacity="0.4"/>` : ''}
  </svg>`
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}

export async function generateFilterThumbnail(
  sampleImage: HTMLImageElement | null,
  filter: FilterType,
  size = 80
): Promise<string> {
  const { canvas, ctx } = createOffscreenCanvas(size, size)
  ctx.fillStyle = '#2d2d3f'
  ctx.fillRect(0, 0, size, size)

  if (sampleImage) {
    const cover = getCoverSize(
      sampleImage.naturalWidth,
      sampleImage.naturalHeight,
      size,
      size
    )
    const tmp = document.createElement('canvas')
    tmp.width = size
    tmp.height = size
    const tctx = tmp.getContext('2d', { willReadFrequently: true })!
    tctx.drawImage(sampleImage, cover.offsetX, cover.offsetY, cover.width, cover.height)

    try {
      if (filter !== 'none') {
        const data = tctx.getImageData(0, 0, size, size)
        const processed = applyFilter(filter, data, 1)
        tctx.putImageData(processed, 0, 0)
      }
    } catch (e) {}
    ctx.drawImage(tmp, 0, 0)
  } else {
    const gradient = ctx.createLinearGradient(0, 0, size, size)
    gradient.addColorStop(0, '#6c63ff')
    gradient.addColorStop(0.5, '#d4a574')
    gradient.addColorStop(1, '#4ade80')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size, size)
    ctx.fillStyle = 'rgba(255,255,255,0.2)'
    ctx.font = `bold ${Math.floor(size * 0.3)}px serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const labelMap: Record<FilterType, string> = {
      none: '原', watercolor: '水', sketch: '素',
      oil: '油', pop: '波', ink: '墨', pixel: '像',
    }
    ctx.fillText(labelMap[filter] || '?', size / 2, size / 2)
  }

  return canvas.toDataURL('image/png')
}
