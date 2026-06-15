import { PatternParams } from './store'

export interface RenderContext {
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  frameCount: number
  params: PatternParams
}

function hslShift(h: number, shift: number): number {
  return (h + shift + 360) % 360
}

export function renderRotatingSnake({ ctx, width, height, frameCount, params }: RenderContext): void {
  const cx = width / 2
  const cy = height / 2
  const innerRadius = 30
  const outerRadius = 120
  const numSegments = 8
  const { speed, colorShift } = params

  const rotationSpeed = 0.2 + (speed / 10) * 1.8
  const angle = (frameCount * rotationSpeed * Math.PI) / 180

  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  for (let ring = 0; ring < 4; ring++) {
    const rInner = innerRadius + ring * ((outerRadius - innerRadius) / 4)
    const rOuter = innerRadius + (ring + 1) * ((outerRadius - innerRadius) / 4)
    const ringOffset = ring * (Math.PI / numSegments)

    for (let i = 0; i < numSegments; i++) {
      const startAngle = angle + ringOffset + (i * 2 * Math.PI) / numSegments
      const endAngle = startAngle + (2 * Math.PI) / numSegments - 0.02

      const isEven = (i + ring) % 2 === 0
      const hue = isEven ? 0 : 0
      const shiftedHue = hslShift(hue, colorShift)

      ctx.beginPath()
      ctx.arc(cx, cy, rOuter, startAngle, endAngle)
      ctx.arc(cx, cy, rInner, endAngle, startAngle, true)
      ctx.closePath()

      if (isEven) {
        ctx.fillStyle = `hsl(${shiftedHue}, 0%, 10%)`
      } else {
        ctx.fillStyle = `hsl(${shiftedHue}, 0%, 95%)`
      }
      ctx.fill()

      const highlightColor = isEven ? 'rgba(255, 200, 100, 0.7)' : 'rgba(100, 150, 255, 0.7)'
      ctx.save()
      ctx.globalAlpha = 0.85
      ctx.strokeStyle = highlightColor
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.restore()
    }
  }

  ctx.beginPath()
  ctx.arc(cx, cy, innerRadius - 2, 0, Math.PI * 2)
  ctx.fillStyle = '#333333'
  ctx.fill()
}

export function renderHermannGrid({ ctx, width, height, frameCount, params }: RenderContext): void {
  const { density, speed, colorShift } = params
  const gridSize = Math.max(3, Math.min(8, Math.floor(density / 4) + 3))
  const cellSize = Math.floor(width / (gridSize + 2))
  const lineWidth = 2
  const startX = (width - gridSize * cellSize - (gridSize - 1) * lineWidth) / 2
  const startY = (height - gridSize * cellSize - (gridSize - 1) * lineWidth) / 2

  const flickerSpeed = 0.02 + (speed / 10) * 0.08

  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  const baseBg = hslShift(0, colorShift)
  ctx.fillStyle = `hsl(${baseBg}, 10%, 20%)`

  for (let row = 0; row <= gridSize; row++) {
    for (let col = 0; col <= gridSize; col++) {
      const x = startX + col * (cellSize + lineWidth) - lineWidth / 2
      const y = startY + row * (cellSize + lineWidth) - lineWidth / 2
      ctx.fillRect(x, y, cellSize + lineWidth, lineWidth)
      ctx.fillRect(x, y, lineWidth, cellSize + lineWidth)
    }
  }

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const x = startX + col * (cellSize + lineWidth) + lineWidth / 2
      const y = startY + row * (cellSize + lineWidth) + lineWidth / 2
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(x, y, cellSize, cellSize)
    }
  }

  for (let row = 0; row <= gridSize; row++) {
    for (let col = 0; col <= gridSize; col++) {
      const x = startX + col * (cellSize + lineWidth) - lineWidth / 2
      const y = startY + row * (cellSize + lineWidth) - lineWidth / 2

      const noise = Math.sin(frameCount * flickerSpeed + row * 1.3 + col * 2.7)
      const distanceFromCenter = Math.sqrt(
        Math.pow(col - gridSize / 2, 2) + Math.pow(row - gridSize / 2, 2)
      )
      const flickerIntensity = Math.max(0, 1 - distanceFromCenter / (gridSize * 0.8))
      const alpha = 0.5 + noise * 0.15 * flickerIntensity

      const dotHue = hslShift(0, colorShift)
      ctx.beginPath()
      ctx.arc(x, y, 3.5, 0, Math.PI * 2)
      ctx.fillStyle = `hsla(${dotHue}, 10%, 50%, ${Math.max(0.2, alpha)})`
      ctx.fill()

      if (noise > 0.7 && flickerIntensity > 0.3) {
        ctx.beginPath()
        ctx.arc(x, y, 5, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${dotHue}, 10%, 75%, ${(noise - 0.7) * 2})`
        ctx.fill()
      }
    }
  }
}

interface LightDot {
  x: number
  y: number
  radius: number
  phase: number
  hue: number
}

let cachedDots: LightDot[] | null = null
let cachedDensity: number = -1
let cachedWidth: number = -1
let cachedHeight: number = -1

function generateDots(width: number, height: number, density: number): LightDot[] {
  const count = Math.floor(50 + (density - 5) / 25 * 150)
  const dots: LightDot[] = []

  for (let i = 0; i < count; i++) {
    dots.push({
      x: Math.random() * (width - 20) + 10,
      y: Math.random() * (height - 20) + 10,
      radius: 2 + Math.random() * 4,
      phase: Math.random() * Math.PI * 2,
      hue: Math.random() * 360
    })
  }

  return dots
}

export function renderScintillatingGrid({ ctx, width, height, frameCount, params }: RenderContext): void {
  const { density, speed, colorShift } = params

  if (cachedDots === null || cachedDensity !== density || cachedWidth !== width || cachedHeight !== height) {
    cachedDots = generateDots(width, height, density)
    cachedDensity = density
    cachedWidth = width
    cachedHeight = height
  }

  const dots = cachedDots
  const frequency = 0.02 + (speed / 10) * 0.12

  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  const gridSize = 35
  ctx.strokeStyle = '#dddddd'
  ctx.lineWidth = 1

  for (let x = 0; x <= width; x += gridSize) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }
  for (let y = 0; y <= height; y += gridSize) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }

  for (let gx = gridSize; gx < width; gx += gridSize) {
    for (let gy = gridSize; gy < height; gy += gridSize) {
      const flicker = Math.sin(frameCount * frequency * 0.7 + gx * 0.01 + gy * 0.015)
      const bgAlpha = 0.15 + flicker * 0.1
      const hue = hslShift(0, colorShift)
      ctx.beginPath()
      ctx.arc(gx, gy, 4, 0, Math.PI * 2)
      ctx.fillStyle = `hsla(${hue}, 5%, 50%, ${bgAlpha})`
      ctx.fill()
    }
  }

  for (const dot of dots) {
    const alpha = 0.1 + ((Math.sin(frameCount * frequency + dot.phase) + 1) / 2) * 0.9
    const hue = hslShift(dot.hue, colorShift)

    ctx.beginPath()
    ctx.arc(dot.x, dot.y, dot.radius + 2, 0, Math.PI * 2)
    ctx.fillStyle = `hsla(${hue}, 80%, 70%, ${alpha * 0.3})`
    ctx.fill()

    ctx.beginPath()
    ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2)
    ctx.fillStyle = `hsla(${hue}, 90%, 60%, ${alpha})`
    ctx.fill()

    if (alpha > 0.7) {
      ctx.beginPath()
      ctx.arc(dot.x, dot.y, dot.radius * 0.5, 0, Math.PI * 2)
      ctx.fillStyle = `hsla(${hue}, 100%, 95%, ${(alpha - 0.7) / 0.3})`
      ctx.fill()
    }
  }
}

export type Renderer = (ctx: RenderContext) => void

export const renderers: Record<string, Renderer> = {
  rotatingSnake: renderRotatingSnake,
  hermannGrid: renderHermannGrid,
  scintillatingGrid: renderScintillatingGrid
}
