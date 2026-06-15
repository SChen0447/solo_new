import pixelmatch from 'pixelmatch'
import { eventBus, Events } from './EventBus'

export interface DiffPixel {
  x: number
  y: number
}

export interface DiffResult {
  diffPixels: DiffPixel[]
  diffCount: number
  diffPercentage: number
  diffImageData: ImageData
  overlayImageData: ImageData
  hashSimilarity: number
  width: number
  height: number
  viewport: number
}

export class DiffCalculator {
  async calculate(
    imageDataA: ImageData,
    imageDataB: ImageData,
    viewport: number,
    threshold: number = 0.1
  ): Promise<DiffResult> {
    try {
      eventBus.emit(Events.DIFF_START, { viewport })
      eventBus.emit(Events.STATUS_MESSAGE, `正在计算差异 - 宽度${viewport}px`)

      const width = Math.min(imageDataA.width, imageDataB.width)
      const height = Math.min(imageDataA.height, imageDataB.height)

      const diffCanvas = document.createElement('canvas')
      diffCanvas.width = width
      diffCanvas.height = height
      const diffCtx = diffCanvas.getContext('2d')!
      const diffImageData = diffCtx.createImageData(width, height)

      const diffCount = pixelmatch(
        imageDataA.data,
        imageDataB.data,
        diffImageData.data,
        width,
        height,
        { threshold, includeAA: true }
      )

      const diffPixels = this.extractDiffPixels(diffImageData, width, height)
      const diffPercentage = (diffCount / (width * height)) * 100

      const overlayImageData = this.createOverlayImageData(imageDataA, diffImageData, width, height)

      const hashSimilarity = this.calculatePHashSimilarity(imageDataA, imageDataB)

      const result: DiffResult = {
        diffPixels,
        diffCount,
        diffPercentage,
        diffImageData,
        overlayImageData,
        hashSimilarity,
        width,
        height,
        viewport
      }

      eventBus.emit(Events.DIFF_COMPLETE, { viewport, result })
      eventBus.emit(Events.STATUS_MESSAGE, `差异计算完成 - 宽度${viewport}px`)

      return result
    } catch (error) {
      eventBus.emit(Events.DIFF_ERROR, { viewport, error })
      eventBus.emit(Events.STATUS_MESSAGE, `差异计算失败 - 宽度${viewport}px`)
      throw error
    }
  }

  private extractDiffPixels(diffImageData: ImageData, width: number, height: number): DiffPixel[] {
    const pixels: DiffPixel[] = []
    const data = diffImageData.data

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4
        if (data[idx] > 0 || data[idx + 1] > 0 || data[idx + 2] > 0) {
          pixels.push({ x, y })
        }
      }
    }

    return pixels
  }

  private createOverlayImageData(
    baseImageData: ImageData,
    diffImageData: ImageData,
    width: number,
    height: number
  ): ImageData {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!
    const overlayData = ctx.createImageData(width, height)
    const baseData = baseImageData.data
    const diffData = diffImageData.data
    const outData = overlayData.data

    for (let i = 0; i < width * height; i++) {
      const idx = i * 4
      const isDiff = diffData[idx] > 0 || diffData[idx + 1] > 0 || diffData[idx + 2] > 0

      if (isDiff) {
        outData[idx] = 255
        outData[idx + 1] = 107
        outData[idx + 2] = 107
        outData[idx + 3] = 255
      } else {
        outData[idx] = baseData[idx]
        outData[idx + 1] = baseData[idx + 1]
        outData[idx + 2] = baseData[idx + 2]
        outData[idx + 3] = Math.floor(baseData[idx + 3] * 0.3)
      }
    }

    return overlayData
  }

  private calculatePHash(imageData: ImageData): bigint {
    const size = 32
    const smallSize = 8

    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!

    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = imageData.width
    tempCanvas.height = imageData.height
    const tempCtx = tempCanvas.getContext('2d')!
    tempCtx.putImageData(imageData, 0, 0)

    ctx.drawImage(tempCanvas, 0, 0, size, size)
    const smallImageData = ctx.getImageData(0, 0, size, size)

    const grayValues: number[] = []
    const data = smallImageData.data
    for (let i = 0; i < size * size; i++) {
      const idx = i * 4
      const gray = (data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114)
      grayValues.push(gray)
    }

    const dctValues = this.dct(grayValues, size)

    let sum = 0
    for (let y = 0; y < smallSize; y++) {
      for (let x = 0; x < smallSize; x++) {
        sum += dctValues[y * size + x]
      }
    }
    const avg = sum / (smallSize * smallSize)

    let hash = BigInt(0)
    for (let y = 0; y < smallSize; y++) {
      for (let x = 0; x < smallSize; x++) {
        const bit = dctValues[y * size + x] > avg ? BigInt(1) : BigInt(0)
        hash = (hash << BigInt(1)) | bit
      }
    }

    return hash
  }

  private dct(input: number[], size: number): number[] {
    const output: number[] = new Array(size * size).fill(0)

    for (let u = 0; u < size; u++) {
      for (let v = 0; v < size; v++) {
        let sum = 0
        for (let x = 0; x < size; x++) {
          for (let y = 0; y < size; y++) {
            sum +=
              input[y * size + x] *
              Math.cos(((2 * x + 1) * u * Math.PI) / (2 * size)) *
              Math.cos(((2 * y + 1) * v * Math.PI) / (2 * size))
          }
        }
        const cu = u === 0 ? 1 / Math.sqrt(2) : 1
        const cv = v === 0 ? 1 / Math.sqrt(2) : 1
        output[v * size + u] = (2 / size) * cu * cv * sum
      }
    }

    return output
  }

  private hammingDistance(hash1: bigint, hash2: bigint): number {
    let xor: bigint = hash1 ^ hash2
    let distance = 0
    while (xor > BigInt(0)) {
      distance += Number(xor & BigInt(1))
      xor >>= BigInt(1)
    }
    return distance
  }

  calculatePHashSimilarity(imageDataA: ImageData, imageDataB: ImageData): number {
    const hashA = this.calculatePHash(imageDataA)
    const hashB = this.calculatePHash(imageDataB)
    const distance = this.hammingDistance(hashA, hashB)
    const maxBits = 64
    const similarity = ((maxBits - distance) / maxBits) * 100
    return Math.max(0, Math.min(100, Math.round(similarity * 100) / 100))
  }

  async calculateBatch(
    screenshots: { viewport: number; screenshotA: { imageData: ImageData }; screenshotB: { imageData: ImageData } }[]
  ): Promise<{ viewport: number; result: DiffResult }[]> {
    const results: { viewport: number; result: DiffResult }[] = []

    for (const item of screenshots) {
      const result = await this.calculate(
        item.screenshotA.imageData,
        item.screenshotB.imageData,
        item.viewport
      )
      results.push({ viewport: item.viewport, result })
    }

    return results
  }
}

export const diffCalculator = new DiffCalculator()
