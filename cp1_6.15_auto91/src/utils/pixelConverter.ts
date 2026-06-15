export interface PixelBlock {
  color: [number, number, number]
  row: number
  col: number
}

export interface ConvertedPixelData {
  blocks: PixelBlock[]
  cols: number
  rows: number
}

export interface ImageSourceData {
  data: Uint8ClampedArray
  width: number
  height: number
}

const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '')
  const bigint = parseInt(
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h,
    16
  )
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255]
}

const colorDistance = (
  [r1, g1, b1]: [number, number, number],
  [r2, g2, b2]: [number, number, number]
): number => {
  const dr = r1 - r2
  const dg = g1 - g2
  const db = b1 - b2
  return dr * dr + dg * dg + db * db
}

const findClosestColor = (
  target: [number, number, number],
  palette: [number, number, number][]
): [number, number, number] => {
  let minDist = Infinity
  let closest = palette[0]
  for (const color of palette) {
    const dist = colorDistance(target, color)
    if (dist < minDist) {
      minDist = dist
      closest = color
    }
  }
  return closest
}

export const convertToPixels = (
  imageData: ImageSourceData,
  pixelSize: number,
  targetCols: number,
  targetRows: number,
  paletteHex: string[]
): ConvertedPixelData => {
  const { data, width, height } = imageData

  const rgbPalette = paletteHex.map(hexToRgb)
  const blocks: PixelBlock[] = []

  for (let row = 0; row < targetRows; row++) {
    for (let col = 0; col < targetCols; col++) {
      const srcX0 = Math.floor((col * width) / targetCols)
      const srcY0 = Math.floor((row * height) / targetRows)
      const srcX1 = Math.floor(((col + 1) * width) / targetCols)
      const srcY1 = Math.floor(((row + 1) * height) / targetRows)

      let r = 0,
        g = 0,
        b = 0,
        count = 0

      for (let sy = srcY0; sy < srcY1 && sy < height; sy++) {
        for (let sx = srcX0; sx < srcX1 && sx < width; sx++) {
          const idx = (sy * width + sx) * 4
          const a = data[idx + 3]
          if (a > 128) {
            r += data[idx]
            g += data[idx + 1]
            b += data[idx + 2]
            count++
          }
        }
      }

      let avgColor: [number, number, number]
      if (count > 0) {
        avgColor = [Math.round(r / count), Math.round(g / count), Math.round(b / count)]
      } else {
        avgColor = [255, 255, 255]
      }

      const mappedColor = findClosestColor(avgColor, rgbPalette)
      blocks.push({ color: mappedColor, row, col })
    }
  }

  return { blocks, cols: targetCols, rows: targetRows }
}

export const loadImageToCanvas = (
  url: string,
  canvasWidth: number,
  canvasHeight: number
): Promise<ImageSourceData & { naturalWidth: number; naturalHeight: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const { naturalWidth, naturalHeight } = img
      const scale = Math.min(canvasWidth / naturalWidth, canvasHeight / naturalHeight, 1)
      const drawW = Math.max(1, Math.round(naturalWidth * scale))
      const drawH = Math.max(1, Math.round(naturalHeight * scale))

      const offCanvas = document.createElement('canvas')
      offCanvas.width = drawW
      offCanvas.height = drawH
      const ctx = offCanvas.getContext('2d')!
      ctx.imageSmoothingEnabled = true
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, drawW, drawH)

      const dx = Math.floor((drawW - drawW) / 2)
      const dy = Math.floor((drawH - drawH) / 2)
      ctx.drawImage(img, dx, dy, drawW, drawH)

      const imgData = ctx.getImageData(0, 0, drawW, drawH)
      resolve({
        data: imgData.data,
        width: drawW,
        height: drawH,
        naturalWidth,
        naturalHeight
      })
    }
    img.onerror = reject
    img.src = url
  })
}
