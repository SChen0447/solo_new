import { useState, useCallback, useRef } from 'react'

export interface RGB {
  r: number
  g: number
  b: number
}

export interface ColorExtractorState {
  colors: RGB[]
  isLoading: boolean
  error: string | null
  imageUrl: string | null
}

interface ColorBox {
  pixels: number[][]
  rMin: number
  rMax: number
  gMin: number
  gMax: number
  bMin: number
  bMax: number
}

const MAX_IMAGE_SIZE = 100 * 1024 * 1024
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
const MAX_FILE_SIZE = 5 * 1024 * 1024

function createColorBox(pixels: number[][]): ColorBox {
  let rMin = 255, rMax = 0
  let gMin = 255, gMax = 0
  let bMin = 255, bMax = 0

  for (const pixel of pixels) {
    const [r, g, b] = pixel
    if (r < rMin) rMin = r
    if (r > rMax) rMax = r
    if (g < gMin) gMin = g
    if (g > gMax) gMax = g
    if (b < bMin) bMin = b
    if (b > bMax) bMax = b
  }

  return { pixels, rMin, rMax, gMin, gMax, bMin, bMax }
}

function getRange(box: ColorBox): { channel: 'r' | 'g' | 'b'; range: number } {
  const rRange = box.rMax - box.rMin
  const gRange = box.gMax - box.gMin
  const bRange = box.bMax - box.bMin

  if (rRange >= gRange && rRange >= bRange) {
    return { channel: 'r', range: rRange }
  } else if (gRange >= bRange) {
    return { channel: 'g', range: gRange }
  } else {
    return { channel: 'b', range: bRange }
  }
}

function splitBox(box: ColorBox): ColorBox[] {
  const { channel } = getRange(box)
  const channelIndex = channel === 'r' ? 0 : channel === 'g' ? 1 : 2

  const sorted = [...box.pixels].sort((a, b) => a[channelIndex] - b[channelIndex])
  const mid = Math.floor(sorted.length / 2)

  const left = sorted.slice(0, mid)
  const right = sorted.slice(mid)

  if (left.length === 0 || right.length === 0) {
    return [box]
  }

  return [createColorBox(left), createColorBox(right)]
}

function getAverageColor(box: ColorBox): RGB {
  let rSum = 0, gSum = 0, bSum = 0
  const count = box.pixels.length

  for (const pixel of box.pixels) {
    rSum += pixel[0]
    gSum += pixel[1]
    bSum += pixel[2]
  }

  return {
    r: Math.round(rSum / count),
    g: Math.round(gSum / count),
    b: Math.round(bSum / count),
  }
}

function medianCut(pixels: number[][], numColors: number): RGB[] {
  if (pixels.length === 0) return []

  let boxes: ColorBox[] = [createColorBox(pixels)]

  while (boxes.length < numColors) {
    boxes.sort((a, b) => getRange(b).range - getRange(a).range)

    const largestBox = boxes.shift()!
    if (largestBox.pixels.length < 2 || getRange(largestBox).range === 0) {
      boxes.unshift(largestBox)
      break
    }

    const split = splitBox(largestBox)
    boxes.push(...split)
  }

  boxes.sort((a, b) => b.pixels.length - a.pixels.length)

  return boxes.slice(0, numColors).map(getAverageColor)
}

export function rgbToHex(rgb: RGB): string {
  const toHex = (n: number) => n.toString(16).padStart(2, '0')
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`.toUpperCase()
}

export function hexToRgb(hex: string): RGB {
  const clean = hex.replace('#', '')
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
  }
}

export function getLuminance(rgb: RGB): number {
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function getContrastColor(rgb: RGB): string {
  return getLuminance(rgb) > 0.179 ? '#000000' : '#ffffff'
}

export function lightenColor(rgb: RGB, amount: number = 0.3): RGB {
  return {
    r: Math.min(255, Math.round(rgb.r + (255 - rgb.r) * amount)),
    g: Math.min(255, Math.round(rgb.g + (255 - rgb.g) * amount)),
    b: Math.min(255, Math.round(rgb.b + (255 - rgb.b) * amount)),
  }
}

export function darkenColor(rgb: RGB, amount: number = 0.3): RGB {
  return {
    r: Math.max(0, Math.round(rgb.r * (1 - amount))),
    g: Math.max(0, Math.round(rgb.g * (1 - amount))),
    b: Math.max(0, Math.round(rgb.b * (1 - amount))),
  }
}

export function rgbToHsl(rgb: RGB): { h: number; s: number; l: number } {
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 }
}

export function hslToRgb(h: number, s: number, l: number): RGB {
  h = h / 360
  s = s / 100
  l = l / 100

  let r, g, b

  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  }
}

export function useColorExtractor() {
  const [state, setState] = useState<ColorExtractorState>({
    colors: [],
    isLoading: false,
    error: null,
    imageUrl: null,
  })
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const extractColors = useCallback(async (file: File): Promise<RGB[]> => {
    return new Promise((resolve, reject) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        reject(new Error('仅支持 PNG、JPG 和 WebP 格式的图片'))
        return
      }

      if (file.size > MAX_FILE_SIZE) {
        reject(new Error('图片大小不能超过 5MB'))
        return
      }

      if (file.size > MAX_IMAGE_SIZE) {
        reject(new Error('图片文件过大'))
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        const img = new Image()

        img.onload = () => {
          try {
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            if (!ctx) {
              reject(new Error('无法创建画布上下文'))
              return
            }

            const maxDim = 200
            let { width, height } = img
            if (width > maxDim || height > maxDim) {
              const ratio = Math.min(maxDim / width, maxDim / height)
              width = Math.round(width * ratio)
              height = Math.round(height * ratio)
            }

            canvas.width = width
            canvas.height = height
            ctx.drawImage(img, 0, 0, width, height)

            const imageData = ctx.getImageData(0, 0, width, height)
            const data = imageData.data

            const pixels: number[][] = []
            const pixelMap = new Map<string, number>()

            for (let i = 0; i < data.length; i += 4) {
              const r = data[i]
              const g = data[i + 1]
              const b = data[i + 2]
              const a = data[i + 3]

              if (a < 125) continue

              const rQuant = Math.round(r / 5) * 5
              const gQuant = Math.round(g / 5) * 5
              const bQuant = Math.round(b / 5) * 5
              const key = `${rQuant},${gQuant},${bQuant}`

              pixelMap.set(key, (pixelMap.get(key) || 0) + 1)
            }

            for (const [key, count] of pixelMap) {
              const [r, g, b] = key.split(',').map(Number)
              const weight = Math.min(count, 20)
              for (let i = 0; i < weight; i++) {
                pixels.push([r, g, b])
              }
            }

            if (pixels.length < 8) {
              for (const [key] of pixelMap) {
                const [r, g, b] = key.split(',').map(Number)
                pixels.push([r, g, b])
              }
            }

            const colors = medianCut(pixels, 8)
            canvasRef.current = canvas
            resolve(colors)
          } catch (err) {
            reject(new Error('颜色提取失败: ' + (err as Error).message))
          }
        }

        img.onerror = () => {
          reject(new Error('图片加载失败，请尝试其他图片'))
        }

        img.src = dataUrl
      }

      reader.onerror = () => {
        reject(new Error('文件读取失败'))
      }

      reader.readAsDataURL(file)
    })
  }, [])

  const handleFile = useCallback(async (file: File) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const colors = await extractColors(file)
      const imageUrl = URL.createObjectURL(file)

      setState({
        colors,
        isLoading: false,
        error: null,
        imageUrl,
      })
    } catch (err) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: (err as Error).message,
      }))
    }
  }, [extractColors])

  const reset = useCallback(() => {
    setState({
      colors: [],
      isLoading: false,
      error: null,
      imageUrl: null,
    })
  }, [])

  return {
    ...state,
    handleFile,
    reset,
  }
}
