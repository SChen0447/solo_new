export interface PosterConfig {
  screenshotDataUrl: string
  materialLabel: string
  colorLabel: string
  gradientStart: string
  gradientEnd: string
  productName?: string
  slogan?: string
}

export async function generatePoster(config: PosterConfig): Promise<Blob> {
  const WIDTH = 1920
  const HEIGHT = 1080

  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const ctx = canvas.getContext('2d')!

  drawGradientBackground(ctx, WIDTH, HEIGHT, config.gradientStart, config.gradientEnd)
  drawDecorativeLines(ctx, WIDTH, HEIGHT)

  const img = await loadImage(config.screenshotDataUrl)
  drawProductImage(ctx, img, WIDTH, HEIGHT)

  drawBrandLogo(ctx, WIDTH, HEIGHT)
  drawProductName(ctx, WIDTH, HEIGHT, config.productName || 'Nova Pro X1')
  drawMaterialInfo(ctx, WIDTH, HEIGHT, config.materialLabel, config.colorLabel)
  drawSlogan(ctx, WIDTH, HEIGHT, config.slogan || '定义未来，突破想象 · Define the Future')
  drawCornerDecorations(ctx, WIDTH, HEIGHT)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Failed to generate poster blob'))
      },
      'image/png',
      1.0,
    )
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function drawGradientBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  startColor: string,
  endColor: string,
): void {
  const grad = ctx.createLinearGradient(0, 0, w, h)
  grad.addColorStop(0, startColor)
  grad.addColorStop(1, endColor)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)

  const vignette = ctx.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w * 0.7)
  vignette.addColorStop(0, 'rgba(0,0,0,0)')
  vignette.addColorStop(1, 'rgba(0,0,0,0.5)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, w, h)
}

function drawDecorativeLines(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.save()
  ctx.strokeStyle = 'rgba(0, 204, 255, 0.15)'
  ctx.lineWidth = 2

  for (let i = 0; i < 5; i++) {
    ctx.beginPath()
    ctx.arc(w * 0.85, h * 0.2, 50 + i * 60, 0, Math.PI * 2)
    ctx.stroke()
  }

  for (let i = 0; i < 3; i++) {
    ctx.beginPath()
    ctx.arc(w * 0.1, h * 0.8, 30 + i * 40, 0, Math.PI * 2)
    ctx.stroke()
  }

  ctx.restore()
}

function drawProductImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number,
): void {
  const imgAspect = img.width / img.height
  const targetW = w * 0.58
  const targetH = targetW / imgAspect
  const x = w * 0.08
  const y = (h - targetH) / 2

  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.5)'
  ctx.shadowBlur = 60
  ctx.shadowOffsetX = 10
  ctx.shadowOffsetY = 20

  ctx.drawImage(img, x, y, targetW, targetH)
  ctx.restore()

  ctx.save()
  const glowGrad = ctx.createRadialGradient(
    x + targetW / 2,
    y + targetH / 2,
    targetH * 0.1,
    x + targetW / 2,
    y + targetH / 2,
    targetH * 0.8,
  )
  glowGrad.addColorStop(0, 'rgba(0, 204, 255, 0.1)')
  glowGrad.addColorStop(1, 'rgba(0, 204, 255, 0)')
  ctx.fillStyle = glowGrad
  ctx.fillRect(x - targetW * 0.2, y - targetH * 0.2, targetW * 1.4, targetH * 1.4)
  ctx.restore()
}

function drawBrandLogo(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const logoX = w - 160
  const logoY = 80

  ctx.save()
  ctx.globalAlpha = 0.85

  ctx.save()
  ctx.strokeStyle = '#00ccff'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.arc(logoX, logoY, 36, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 36px Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('N', logoX, logoY + 2)

  ctx.font = 'bold 14px Arial, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  ctx.fillText('NOVA', logoX, logoY + 54)

  ctx.restore()
}

function drawProductName(ctx: CanvasRenderingContext2D, w: number, h: number, name: string): void {
  const x = w * 0.74
  const y = h * 0.22

  ctx.save()
  ctx.font = 'bold 56px Arial, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillStyle = '#ffffff'
  ctx.shadowColor = 'rgba(0,0,0,0.6)'
  ctx.shadowBlur = 15
  ctx.shadowOffsetX = 3
  ctx.shadowOffsetY = 3
  ctx.fillText(name, x, y)
  ctx.restore()

  ctx.save()
  ctx.strokeStyle = '#00ccff'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(x, y + 20)
  ctx.lineTo(x + 160, y + 20)
  ctx.stroke()
  ctx.restore()
}

function drawMaterialInfo(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  materialLabel: string,
  colorLabel: string,
): void {
  const x = w * 0.74
  let y = h * 0.35

  ctx.save()
  ctx.fillStyle = 'rgba(255,255,255,0.08)'
  roundRect(ctx, x, y, 360, 200, 16)
  ctx.fill()
  ctx.strokeStyle = 'rgba(0,204,255,0.3)'
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.restore()

  ctx.save()
  ctx.font = 'bold 20px Arial, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.95)'
  ctx.fillText('✦ 产品配置', x + 24, y + 48)
  ctx.restore()

  y += 80

  ctx.save()
  ctx.font = '16px Arial, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.fillText('表面材质', x + 24, y)
  ctx.font = 'bold 28px Arial, sans-serif'
  ctx.fillStyle = '#ffffff'
  ctx.fillText(materialLabel, x + 24, y + 36)
  ctx.restore()

  y += 80

  ctx.save()
  ctx.font = '16px Arial, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.fillText('配色方案', x + 24, y)
  ctx.font = 'bold 28px Arial, sans-serif'
  ctx.fillStyle = '#ffffff'
  ctx.fillText(colorLabel, x + 24, y + 36)
  ctx.restore()
}

function drawSlogan(ctx: CanvasRenderingContext2D, w: number, h: number, slogan: string): void {
  const x = w / 2
  const y = h - 80

  ctx.save()
  ctx.font = '36px Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillStyle = '#ffffff'
  ctx.shadowColor = 'rgba(0,0,0,1)'
  ctx.shadowBlur = 4
  ctx.shadowOffsetX = 2
  ctx.shadowOffsetY = 2
  ctx.fillText(slogan, x, y)
  ctx.restore()
}

function drawCornerDecorations(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const margin = 60
  const size = 40
  ctx.save()
  ctx.strokeStyle = 'rgba(0, 204, 255, 0.5)'
  ctx.lineWidth = 3

  ctx.beginPath()
  ctx.moveTo(margin, margin + size)
  ctx.lineTo(margin, margin)
  ctx.lineTo(margin + size, margin)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(w - margin, margin + size)
  ctx.lineTo(w - margin, margin)
  ctx.lineTo(w - margin - size, margin)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(margin, h - margin - size)
  ctx.lineTo(margin, h - margin)
  ctx.lineTo(margin + size, h - margin)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(w - margin, h - margin - size)
  ctx.lineTo(w - margin, h - margin)
  ctx.lineTo(w - margin - size, h - margin)
  ctx.stroke()

  ctx.restore()
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

export function downloadPoster(blob: Blob, filename?: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || `product-poster-${Date.now()}.png`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
