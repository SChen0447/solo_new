import { BandData } from '../store/useStore'

export class EEGAnalyzer {
  private windowSize: number
  private history: BandData[]
  private baseFrequencies: BandData
  private callback: (data: BandData) => void
  private intervalId: number | null
  private speedMultiplier: number
  private baseInterval: number

  constructor(callback: (data: BandData) => void, windowSize = 5) {
    this.windowSize = windowSize
    this.history = []
    this.baseFrequencies = {
      alpha: 0.5,
      beta: 0.5,
      theta: 0.5,
      delta: 0.5
    }
    this.callback = callback
    this.intervalId = null
    this.speedMultiplier = 1
    this.baseInterval = 100
  }

  private generateSimulatedData(): BandData {
    const driftSpeed = 0.02 * this.speedMultiplier
    const randomFactor = 0.1

    const bands: (keyof BandData)[] = ['alpha', 'beta', 'theta', 'delta']
    const newData: Partial<BandData> = {}

    for (const band of bands) {
      const drift = (Math.random() - 0.5) * 2 * driftSpeed
      let value = this.baseFrequencies[band] + drift + (Math.random() - 0.5) * randomFactor

      value = Math.max(0, Math.min(1, value))
      newData[band] = value
      this.baseFrequencies[band] = this.baseFrequencies[band] * 0.95 + value * 0.05
    }

    return newData as BandData
  }

  private applySlidingWindow(data: BandData): BandData {
    this.history.push(data)

    if (this.history.length > this.windowSize) {
      this.history.shift()
    }

    const bands: (keyof BandData)[] = ['alpha', 'beta', 'theta', 'delta']
    const averaged: Partial<BandData> = {}

    for (const band of bands) {
      const sum = this.history.reduce((acc, item) => acc + item[band], 0)
      averaged[band] = sum / this.history.length
    }

    return averaged as BandData
  }

  private tick(): void {
    const rawData = this.generateSimulatedData()
    const filteredData = this.applySlidingWindow(rawData)
    this.callback(filteredData)
  }

  public start(): void {
    if (this.intervalId !== null) return
    this.startInterval()
  }

  private startInterval(): void {
    const interval = this.baseInterval / this.speedMultiplier
    this.intervalId = window.setInterval(() => this.tick(), interval)
  }

  public stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  public setSpeed(multiplier: number): void {
    this.speedMultiplier = Math.max(0.5, Math.min(3, multiplier))
    if (this.intervalId !== null) {
      this.stop()
      this.startInterval()
    }
  }

  public getSpeed(): number {
    return this.speedMultiplier
  }

  public fftTransform(rawSignal: number[]): BandData {
    const n = rawSignal.length
    const spectrum = new Array(n).fill(0)

    for (let k = 0; k < n; k++) {
      let real = 0
      let imag = 0
      for (let t = 0; t < n; t++) {
        const angle = (-2 * Math.PI * k * t) / n
        real += rawSignal[t] * Math.cos(angle)
        imag += rawSignal[t] * Math.sin(angle)
      }
      spectrum[k] = Math.sqrt(real * real + imag * imag)
    }

    const deltaRange = [0, 4]
    const thetaRange = [4, 8]
    const alphaRange = [8, 13]
    const betaRange = [13, 30]

    const sampleRate = 256
    const freqResolution = sampleRate / n

    const sumRange = (range: number[]): number => {
      let sum = 0
      const startIdx = Math.floor(range[0] / freqResolution)
      const endIdx = Math.min(Math.floor(range[1] / freqResolution), n - 1)
      for (let i = startIdx; i <= endIdx; i++) {
        sum += spectrum[i]
      }
      return sum / (endIdx - startIdx + 1)
    }

    const delta = sumRange(deltaRange)
    const theta = sumRange(thetaRange)
    const alpha = sumRange(alphaRange)
    const beta = sumRange(betaRange)

    const total = delta + theta + alpha + beta || 1

    return {
      alpha: alpha / total,
      beta: beta / total,
      theta: theta / total,
      delta: delta / total
    }
  }
}
