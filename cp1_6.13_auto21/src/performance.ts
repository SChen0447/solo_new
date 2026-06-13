import { eventBus } from './eventBus'

class PerformanceMonitor {
  private frameTimes: number[] = []
  private lastFrameTime: number = 0
  private rafId: number | null = null
  private dragStartTime: number = 0
  private enabled: boolean = true

  startFrameMonitoring(): void {
    if (!this.enabled || this.rafId !== null) return

    const measureFrame = (timestamp: number) => {
      if (this.lastFrameTime > 0) {
        const delta = timestamp - this.lastFrameTime
        this.frameTimes.push(delta)
        if (this.frameTimes.length > 60) {
          this.frameTimes.shift()
        }
      }
      this.lastFrameTime = timestamp
      this.rafId = requestAnimationFrame(measureFrame)
    }

    this.rafId = requestAnimationFrame(measureFrame)
  }

  stopFrameMonitoring(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
      this.lastFrameTime = 0
    }
  }

  getAverageFPS(): number {
    if (this.frameTimes.length === 0) return 0
    const avgDelta = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length
    return Math.round(1000 / avgDelta)
  }

  getMinFPS(): number {
    if (this.frameTimes.length === 0) return 0
    const maxDelta = Math.max(...this.frameTimes)
    return Math.round(1000 / maxDelta)
  }

  startDragTimer(): void {
    this.dragStartTime = performance.now()
  }

  endDragTimer(): number {
    const endTime = performance.now()
    const latency = endTime - this.dragStartTime
    eventBus.emit('performance:metric', {
      name: 'drag_latency',
      value: latency,
      unit: 'ms'
    })
    return latency
  }

  measureSceneSwitch(callback: () => void): void {
    const startTime = performance.now()
    let frameCount = 0
    let animationStartTime = 0

    const measureAnimation = (timestamp: number) => {
      if (animationStartTime === 0) animationStartTime = timestamp
      frameCount++
      const elapsed = timestamp - animationStartTime

      if (elapsed < 500) {
        requestAnimationFrame(measureAnimation)
      } else {
        const fps = (frameCount / elapsed) * 1000
        eventBus.emit('performance:metric', {
          name: 'scene_switch_fps',
          value: Math.round(fps),
          unit: 'fps'
        })
        eventBus.emit('performance:metric', {
          name: 'scene_switch_duration',
          value: elapsed,
          unit: 'ms'
        })
      }
    }

    callback()
    requestAnimationFrame(measureAnimation)
  }

  getMemoryUsage(): number | null {
    if ('memory' in performance) {
      const mem = (performance as any).memory
      const usageMB = mem.usedJSHeapSize / (1024 * 1024)
      eventBus.emit('performance:metric', {
        name: 'memory_usage',
        value: Math.round(usageMB),
        unit: 'MB'
      })
      return Math.round(usageMB)
    }
    return null
  }

  logMetrics(): void {
    console.log('[Performance Monitor]', {
      avgFPS: this.getAverageFPS(),
      minFPS: this.getMinFPS(),
      memory: this.getMemoryUsage()
    })
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    if (!enabled) {
      this.stopFrameMonitoring()
    }
  }
}

export const perfMonitor = new PerformanceMonitor()
export default perfMonitor
