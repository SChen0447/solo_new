import { AudioEngine, WaveformData, SpectrumData } from '../audioEngine/audioEngine'

export interface VisualizerOptions {
  waveformColorLeft: string
  waveformColorRight: string
  spectrumLowColor: string
  spectrumHighColor: string
  backgroundColor: string
  fftSize: number
}

const DEFAULT_OPTIONS: VisualizerOptions = {
  waveformColorLeft: '#00D2FF',
  waveformColorRight: '#FF6B6B',
  spectrumLowColor: '#00FF88',
  spectrumHighColor: '#FFD700',
  backgroundColor: '#1A1A2E',
  fftSize: 256,
}

export class Visualizer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private audioEngine: AudioEngine
  private options: VisualizerOptions
  private width: number = 0
  private height: number = 0
  private animationFrameId: number | null = null
  private spectrumGradient: CanvasGradient | null = null
  private loadedAudioBuffer: AudioBuffer | null = null
  private isPlaying: boolean = false

  constructor(
    canvas: HTMLCanvasElement,
    audioEngine: AudioEngine,
    options?: Partial<VisualizerOptions>
  ) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get 2D context')
    this.ctx = ctx
    this.audioEngine = audioEngine
    this.options = { ...DEFAULT_OPTIONS, ...options }

    this.resize()
    window.addEventListener('resize', this.resize)
  }

  public setLoadedAudioBuffer(buffer: AudioBuffer | null): void {
    this.loadedAudioBuffer = buffer
    if (!this.isPlaying) {
      this.renderStatic()
    }
  }

  public resize = (): void => {
    const dpr = window.devicePixelRatio || 1
    const rect = this.canvas.getBoundingClientRect()
    this.width = rect.width
    this.height = rect.height
    this.canvas.width = rect.width * dpr
    this.canvas.height = rect.height * dpr
    this.ctx.scale(dpr, dpr)

    this.createGradient()
    if (!this.isPlaying) {
      this.renderStatic()
    }
  }

  private createGradient(): void {
    const spectrumHeight = this.height * 0.35
    this.spectrumGradient = this.ctx.createLinearGradient(0, this.height * 0.65, 0, this.height * 0.65 + spectrumHeight)
    this.spectrumGradient.addColorStop(0, this.options.spectrumLowColor)
    this.spectrumGradient.addColorStop(1, this.options.spectrumHighColor)
  }

  private drawBackground(): void {
    this.ctx.fillStyle = this.options.backgroundColor
    this.ctx.fillRect(0, 0, this.width, this.height)

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'
    this.ctx.lineWidth = 1

    const gridSize = 40
    for (let x = 0; x < this.width; x += gridSize) {
      this.ctx.beginPath()
      this.ctx.moveTo(x, 0)
      this.ctx.lineTo(x, this.height)
      this.ctx.stroke()
    }
    for (let y = 0; y < this.height; y += gridSize) {
      this.ctx.beginPath()
      this.ctx.moveTo(0, y)
      this.ctx.lineTo(this.width, y)
      this.ctx.stroke()
    }
  }

  private drawWaveform(waveform: WaveformData): void {
    const waveformHeight = this.height * 0.6
    const centerY = this.height * 0.3
    const halfHeight = waveformHeight / 2

    this.ctx.lineWidth = 2
    this.ctx.lineCap = 'round'
    this.ctx.lineJoin = 'round'

    this.ctx.beginPath()
    this.ctx.strokeStyle = this.options.waveformColorLeft
    this.ctx.shadowColor = this.options.waveformColorLeft
    this.ctx.shadowBlur = 10

    const sliceWidth = this.width / waveform.left.length
    let x = 0

    for (let i = 0; i < waveform.left.length; i++) {
      const v = waveform.left[i]
      const y = centerY - (v * halfHeight)

      if (i === 0) {
        this.ctx.moveTo(x, y)
      } else {
        this.ctx.lineTo(x, y)
      }

      x += sliceWidth
    }
    this.ctx.stroke()

    this.ctx.beginPath()
    this.ctx.strokeStyle = this.options.waveformColorRight
    this.ctx.shadowColor = this.options.waveformColorRight
    this.ctx.shadowBlur = 10

    x = 0
    for (let i = 0; i < waveform.right.length; i++) {
      const v = waveform.right[i]
      const y = centerY + (v * halfHeight)

      if (i === 0) {
        this.ctx.moveTo(x, y)
      } else {
        this.ctx.lineTo(x, y)
      }

      x += sliceWidth
    }
    this.ctx.stroke()

    this.ctx.shadowBlur = 0

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    this.ctx.lineWidth = 1
    this.ctx.beginPath()
    this.ctx.moveTo(0, centerY)
    this.ctx.lineTo(this.width, centerY)
    this.ctx.stroke()
  }

  private drawSpectrum(spectrum: SpectrumData): void {
    const spectrumY = this.height * 0.65
    const spectrumHeight = this.height * 0.35
    const barCount = spectrum.length
    const barWidth = (this.width - (barCount + 1) * 2) / barCount
    const gap = 2

    const minDb = -100
    const maxDb = -10

    for (let i = 0; i < barCount; i++) {
      const db = spectrum[i]
      const normalizedDb = Math.max(0, Math.min(1, (db - minDb) / (maxDb - minDb)))
      const barHeight = normalizedDb * spectrumHeight

      const x = gap + i * (barWidth + gap)
      const y = spectrumY + spectrumHeight - barHeight

      const hue = 120 - normalizedDb * 120
      const saturation = 100
      const lightness = 30 + normalizedDb * 30

      const gradient = this.ctx.createLinearGradient(x, spectrumY + spectrumHeight, x, y)
      gradient.addColorStop(0, `hsl(120, ${saturation}%, 50%)`)
      gradient.addColorStop(1, `hsl(${hue}, ${saturation}%, ${lightness}%)`)

      this.ctx.fillStyle = gradient
      this.ctx.shadowColor = `hsl(${hue}, ${saturation}%, 50%)`
      this.ctx.shadowBlur = 8

      const radius = Math.min(barWidth / 2, 4)
      this.beginRoundedRect(x, y, barWidth, barHeight, radius)
      this.ctx.fill()

      this.ctx.shadowBlur = 0
    }
  }

  private beginRoundedRect(x: number, y: number, width: number, height: number, radius: number): void {
    this.ctx.beginPath()
    this.ctx.moveTo(x + radius, y)
    this.ctx.lineTo(x + width - radius, y)
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
    this.ctx.lineTo(x + width, y + height - radius)
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
    this.ctx.lineTo(x + radius, y + height)
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
    this.ctx.lineTo(x, y + radius)
    this.ctx.quadraticCurveTo(x, y, x + radius, y)
    this.ctx.closePath()
  }

  private drawStaticWaveform(): void {
    if (!this.loadedAudioBuffer) return

    const waveformHeight = this.height * 0.6
    const centerY = this.height * 0.3
    const halfHeight = waveformHeight / 2

    const channelData = this.loadedAudioBuffer.getChannelData(0)
    const samplesPerPixel = Math.floor(channelData.length / this.width)

    this.ctx.beginPath()
    this.ctx.strokeStyle = 'rgba(0, 210, 255, 0.5)'
    this.ctx.lineWidth = 1

    for (let x = 0; x < this.width; x++) {
      let min = 1.0
      let max = -1.0
      const start = x * samplesPerPixel
      const end = Math.min(start + samplesPerPixel, channelData.length)

      for (let i = start; i < end; i++) {
        const sample = channelData[i]
        if (sample < min) min = sample
        if (sample > max) max = sample
      }

      const yMin = centerY - (max * halfHeight)
      const yMax = centerY - (min * halfHeight)

      this.ctx.moveTo(x, yMin)
      this.ctx.lineTo(x, yMax)
    }
    this.ctx.stroke()
  }

  private renderStatic(): void {
    this.drawBackground()
    if (this.loadedAudioBuffer) {
      this.drawStaticWaveform()
    } else {
      const spectrumY = this.height * 0.65
      const spectrumHeight = this.height * 0.35

      for (let i = 0; i < 128; i++) {
        const barWidth = (this.width - 129 * 2) / 128
        const gap = 2
        const x = gap + i * (barWidth + gap)
        const barHeight = spectrumHeight * 0.1
        const y = spectrumY + spectrumHeight - barHeight

        this.ctx.fillStyle = 'rgba(0, 255, 136, 0.3)'
        this.beginRoundedRect(x, y, barWidth, barHeight, 2)
        this.ctx.fill()
      }

      const centerY = this.height * 0.3
      this.ctx.strokeStyle = 'rgba(0, 210, 255, 0.3)'
      this.ctx.lineWidth = 2
      this.ctx.beginPath()
      this.ctx.moveTo(0, centerY)
      this.ctx.lineTo(this.width, centerY)
      this.ctx.stroke()
    }
  }

  private render = (): void => {
    if (!this.isPlaying) return

    const waveform = this.audioEngine.getWaveformData()
    const spectrum = this.audioEngine.getSpectrumData()

    this.drawBackground()
    this.drawWaveform(waveform)
    this.drawSpectrum(spectrum)

    this.animationFrameId = requestAnimationFrame(this.render)
  }

  public start(): void {
    if (this.isPlaying) return
    this.isPlaying = true
    this.animationFrameId = requestAnimationFrame(this.render)
  }

  public stop(): void {
    this.isPlaying = false
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
    this.renderStatic()
  }

  public dispose(): void {
    this.stop()
    window.removeEventListener('resize', this.resize)
  }
}
