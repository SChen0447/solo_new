import type { FilterType } from '@/types'

type FilterFn = (imageData: ImageData, options?: { intensity?: number }) => ImageData

function clamp(v: number, min = 0, max = 255): number {
  return Math.max(min, Math.min(max, v))
}

function grayscale(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b
}

function createImageDataCopy(src: ImageData): ImageData {
  const dst = new ImageData(src.width, src.height)
  dst.data.set(src.data)
  return dst
}

export const applyWatercolor: FilterFn = (imageData, options) => {
  const intensity = options?.intensity ?? 1
  const { data, width, height } = createImageDataCopy(imageData)
  const src = new Uint8ClampedArray(imageData.data)
  const ks = 3 + Math.floor(intensity * 3)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sr = 0, sg = 0, sb = 0, cnt = 0
      for (let dy = -ks; dy <= ks; dy++) {
        for (let dx = -ks; dx <= ks; dx++) {
          const nx = x + dx, ny = y + dy
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
          const i = (ny * width + nx) * 4
          const cr = src[i], cg = src[i + 1], cb = src[i + 2]
          const ti = (y * width + x) * 4
          const diff =
            Math.abs(cr - src[ti]) + Math.abs(cg - src[ti + 1]) + Math.abs(cb - src[ti + 2])
          if (diff < 80 * intensity) {
            sr += cr; sg += cg; sb += cb; cnt++
          }
        }
      }
      if (cnt > 0) {
        const i = (y * width + x) * 4
        data[i] = clamp(sr / cnt)
        data[i + 1] = clamp(sg / cnt)
        data[i + 2] = clamp(sb / cnt)
      }
    }
  }

  for (let i = 0; i < data.length; i += 4) {
    const satBoost = 1 + 0.3 * intensity
    const gray = grayscale(data[i], data[i + 1], data[i + 2])
    data[i] = clamp(gray + (data[i] - gray) * satBoost)
    data[i + 1] = clamp(gray + (data[i + 1] - gray) * satBoost)
    data[i + 2] = clamp(gray + (data[i + 2] - gray) * satBoost)
    const levels = 16 + Math.floor((1 - intensity) * 16)
    data[i] = Math.round(data[i] / levels) * levels
    data[i + 1] = Math.round(data[i + 1] / levels) * levels
    data[i + 2] = Math.round(data[i + 2] / levels) * levels
  }

  return { data, width, height } as ImageData
}

export const applySketch: FilterFn = (imageData, options) => {
  const intensity = options?.intensity ?? 1
  const { data, width, height } = createImageDataCopy(imageData)
  const gray = new Uint8ClampedArray(width * height)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      gray[y * width + x] = grayscale(imageData.data[i], imageData.data[i + 1], imageData.data[i + 2])
    }
  }

  const sobel = (gx: number[][], gy: number[][], arr: Uint8ClampedArray, w: number, h: number) => {
    const out = new Float32Array(w * h)
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        let sx = 0, sy = 0
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const v = arr[(y + ky) * w + (x + kx)]
            sx += v * gx[ky + 1][kx + 1]
            sy += v * gy[ky + 1][kx + 1]
          }
        }
        out[y * w + x] = Math.sqrt(sx * sx + sy * sy)
      }
    }
    return out
  }

  const edges = sobel(
    [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]],
    [[-1, -2, -1], [0, 0, 0], [1, 2, 1]],
    gray, width, height
  )

  let maxE = 0
  for (let i = 0; i < edges.length; i++) if (edges[i] > maxE) maxE = edges[i]

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      const e = maxE > 0 ? edges[i] / maxE : 0
      const g = gray[i]
      const sketch = clamp(255 - (e * 255 * (1 + intensity)) * (g / 255 + 0.3))
      const di = i * 4
      const paperTint = 235
      const final = clamp(sketch * (paperTint / 255))
      data[di] = final
      data[di + 1] = clamp(final - 5)
      data[di + 2] = clamp(final - 15)
    }
  }

  return { data, width, height } as ImageData
}

export const applyOil: FilterFn = (imageData, options) => {
  const intensity = options?.intensity ?? 1
  const { data, width, height } = createImageDataCopy(imageData)
  const radius = 3 + Math.floor(intensity * 3)
  const intensityLevels = Math.floor(20 + (1 - intensity) * 30)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const rCount = new Uint32Array(intensityLevels + 1)
      const gSum = new Uint32Array(intensityLevels + 1)
      const bSum = new Uint32Array(intensityLevels + 1)
      const rSum = new Uint32Array(intensityLevels + 1)

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx, ny = y + dy
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
          const idx = (ny * width + nx) * 4
          const cr = imageData.data[idx]
          const cg = imageData.data[idx + 1]
          const cb = imageData.data[idx + 2]
          const curIntensity = Math.floor(((cr + cg + cb) / 3) * intensityLevels / 255)
          rCount[curIntensity]++
          rSum[curIntensity] += cr
          gSum[curIntensity] += cg
          bSum[curIntensity] += cb
        }
      }

      let maxIdx = 0, maxCount = 0
      for (let i = 0; i <= intensityLevels; i++) {
        if (rCount[i] > maxCount) {
          maxCount = rCount[i]
          maxIdx = i
        }
      }

      const di = (y * width + x) * 4
      if (maxCount > 0) {
        data[di] = rSum[maxIdx] / maxCount
        data[di + 1] = gSum[maxIdx] / maxCount
        data[di + 2] = bSum[maxIdx] / maxCount
      }
    }
  }

  return { data, width, height } as ImageData
}

export const applyPop: FilterFn = (imageData, options) => {
  const intensity = options?.intensity ?? 1
  const { data, width, height } = createImageDataCopy(imageData)
  const palette = [
    [255, 0, 128],
    [0, 200, 255],
    [255, 220, 0],
    [255, 80, 0],
    [120, 0, 200],
    [0, 200, 100],
    [255, 255, 255],
    [30, 30, 30],
  ]

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i], g = data[i + 1], b = data[i + 2]
    const cont = 1 + 0.4 * intensity
    const mid = 128
    r = clamp((r - mid) * cont + mid)
    g = clamp((g - mid) * cont + mid)
    b = clamp((b - mid) * cont + mid)
    const sat = 1 + 0.5 * intensity
    const gray = grayscale(r, g, b)
    r = clamp(gray + (r - gray) * sat)
    g = clamp(gray + (g - gray) * sat)
    b = clamp(gray + (b - gray) * sat)

    let bestD = Infinity, best = 0
    for (let p = 0; p < palette.length; p++) {
      const dr = r - palette[p][0]
      const dg = g - palette[p][1]
      const db = b - palette[p][2]
      const d = dr * dr + dg * dg + db * db
      if (d < bestD) {
        bestD = d
        best = p
      }
    }

    const mix = 0.85 + intensity * 0.15
    data[i] = clamp(r * (1 - mix) + palette[best][0] * mix)
    data[i + 1] = clamp(g * (1 - mix) + palette[best][1] * mix)
    data[i + 2] = clamp(b * (1 - mix) + palette[best][2] * mix)
  }

  return { data, width, height } as ImageData
}

export const applyInk: FilterFn = (imageData, options) => {
  const intensity = options?.intensity ?? 1
  const { data, width, height } = createImageDataCopy(imageData)
  const gray = new Uint8ClampedArray(width * height)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      gray[y * width + x] = grayscale(imageData.data[i], imageData.data[i + 1], imageData.data[i + 2])
    }
  }

  const hist = new Uint32Array(256)
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++
  const cdf = new Uint32Array(256)
  cdf[0] = hist[0]
  for (let i = 1; i < 256; i++) cdf[i] = cdf[i - 1] + hist[i]
  const total = gray.length
  const eq = new Uint8ClampedArray(256)
  for (let i = 0; i < 256; i++) eq[i] = Math.floor((cdf[i] / total) * 255)
  for (let i = 0; i < gray.length; i++) gray[i] = eq[gray[i]]

  const rs = 2 + Math.floor(intensity * 3)
  const blurred = new Uint8ClampedArray(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let s = 0, c = 0
      for (let dy = -rs; dy <= rs; dy++) {
        for (let dx = -rs; dx <= rs; dx++) {
          const nx = x + dx, ny = y + dy
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
          s += gray[ny * width + nx]; c++
        }
      }
      blurred[y * width + x] = s / c
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      let v = blurred[i]
      v = clamp(255 - Math.pow((255 - v) / 255, 1.5 - intensity * 0.5) * 255)
      const noise = (Math.sin(x * 0.1 + y * 0.13) * 0.5 + Math.sin(x * 0.3 - y * 0.07) * 0.5) * 15
      v = clamp(v + noise * intensity)
      const di = i * 4
      const warm = v < 150 ? 0 : (v - 150) * 0.08 * intensity
      data[di] = clamp(v - 2 + warm)
      data[di + 1] = clamp(v)
      data[di + 2] = clamp(v + 2)
    }
  }

  return { data, width, height } as ImageData
}

export const applyPixel: FilterFn = (imageData, options) => {
  const intensity = options?.intensity ?? 1
  const { data, width, height } = createImageDataCopy(imageData)
  const blockSize = Math.max(3, Math.floor(8 + intensity * 16))

  const palette = [
    [0, 0, 0], [34, 32, 52], [69, 40, 60], [102, 57, 49],
    [143, 86, 59], [223, 113, 38], [217, 160, 102], [238, 195, 154],
    [251, 242, 54], [153, 229, 80], [106, 190, 48], [55, 148, 110],
    [75, 105, 47], [82, 75, 36], [156, 214, 225], [86, 148, 202],
    [63, 63, 116], [118, 66, 138], [172, 50, 50], [217, 87, 99],
    [255, 255, 255], [204, 204, 204], [153, 153, 153], [102, 102, 102],
  ]

  const nearest = (r: number, g: number, b: number) => {
    let bestD = Infinity, br = 0, bg = 0, bb = 0
    for (const p of palette) {
      const dr = r - p[0], dg = g - p[1], db = b - p[2]
      const d = dr * dr + dg * dg + db * db
      if (d < bestD) {
        bestD = d; br = p[0]; bg = p[1]; bb = p[2]
      }
    }
    return [br, bg, bb]
  }

  for (let by = 0; by < height; by += blockSize) {
    for (let bx = 0; bx < width; bx += blockSize) {
      let sr = 0, sg = 0, sb = 0, c = 0
      for (let dy = 0; dy < blockSize && by + dy < height; dy++) {
        for (let dx = 0; dx < blockSize && bx + dx < width; dx++) {
          const i = ((by + dy) * width + (bx + dx)) * 4
          sr += imageData.data[i]
          sg += imageData.data[i + 1]
          sb += imageData.data[i + 2]
          c++
        }
      }
      const ar = sr / c, ag = sg / c, ab = sb / c
      const [br, bg, bb] = intensity >= 0.5 ? nearest(ar, ag, ab) : [ar, ag, ab]
      for (let dy = 0; dy < blockSize && by + dy < height; dy++) {
        for (let dx = 0; dx < blockSize && bx + dx < width; dx++) {
          const i = ((by + dy) * width + (bx + dx)) * 4
          data[i] = br
          data[i + 1] = bg
          data[i + 2] = bb
        }
      }
    }
  }

  return { data, width, height } as ImageData
}

export const applyNone: FilterFn = (imageData) => createImageDataCopy(imageData)

export const FILTER_MAP: Record<Exclude<FilterType, 'none'>, FilterFn> = {
  watercolor: applyWatercolor,
  sketch: applySketch,
  oil: applyOil,
  pop: applyPop,
  ink: applyInk,
  pixel: applyPixel,
}

export function applyFilter(
  type: FilterType,
  imageData: ImageData,
  intensity = 1
): ImageData {
  if (type === 'none') return applyNone(imageData)
  return FILTER_MAP[type](imageData, { intensity })
}
