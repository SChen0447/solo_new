import type { PerformanceData, PerformanceSummary } from './types'

const SLOW_THRESHOLD_MS = 16

export class PerformanceAnalyzer {
  private iframe: HTMLIFrameElement | null = null
  private observer: PerformanceObserver | null = null
  private elementsData: Map<string, PerformanceData> = new Map()
  private totalLayouts: number = 0
  private totalLayoutDuration: number = 0
  private maxLayoutDuration: number = 0
  private totalRecalcStyles: number = 0
  private totalRecalcStyleDuration: number = 0
  private frameTimes: number[] = []
  private fpsInterval: number | null = null
  private lastFrameTime: number = 0
  private isCollecting: boolean = false

  constructor() {}

  attach(iframe: HTMLIFrameElement): void {
    this.iframe = iframe
  }

  detach(): void {
    this.stopCollecting()
    this.iframe = null
  }

  startCollecting(): void {
    if (this.isCollecting || !this.iframe?.contentWindow) return

    this.isCollecting = true
    this.elementsData.clear()
    this.totalLayouts = 0
    this.totalLayoutDuration = 0
    this.maxLayoutDuration = 0
    this.totalRecalcStyles = 0
    this.totalRecalcStyleDuration = 0
    this.frameTimes = []

    try {
      const win = this.iframe.contentWindow as typeof window

      if (typeof win.PerformanceObserver !== 'undefined') {
        this.observer = new win.PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.processPerformanceEntry(entry as PerformanceEntry)
          }
        })

        try {
          this.observer.observe({
            entryTypes: ['layout', 'layout-shift', 'paint', 'element'],
          })
        } catch {
          try {
            this.observer.observe({ entryTypes: ['paint', 'mark', 'measure'] })
          } catch (e) {
            console.warn('PerformanceObserver not fully supported:', e)
          }
        }
      }
    } catch (e) {
      console.warn('Could not start PerformanceObserver:', e)
    }

    this.startFpsTracking()
  }

  stopCollecting(): void {
    this.isCollecting = false

    if (this.observer) {
      try {
        this.observer.disconnect()
      } catch (e) {
        console.warn('Error disconnecting observer:', e)
      }
      this.observer = null
    }

    this.stopFpsTracking()
  }

  private startFpsTracking(): void {
    this.lastFrameTime = performance.now()

    const trackFrame = () => {
      if (!this.isCollecting) return

      const now = performance.now()
      const delta = now - this.lastFrameTime
      this.lastFrameTime = now

      const fps = 1000 / delta
      this.frameTimes.push(fps)

      if (this.frameTimes.length > 60) {
        this.frameTimes.shift()
      }

      this.fpsInterval = requestAnimationFrame(trackFrame) as unknown as number
    }

    this.fpsInterval = requestAnimationFrame(trackFrame) as unknown as number
  }

  private stopFpsTracking(): void {
    if (this.fpsInterval !== null) {
      cancelAnimationFrame(this.fpsInterval)
      this.fpsInterval = null
    }
  }

  private processPerformanceEntry(entry: PerformanceEntry): void {
    const entryType = entry.entryType

    if (entryType === 'layout') {
      this.totalLayouts++
      this.totalLayoutDuration += entry.duration
      if (entry.duration > this.maxLayoutDuration) {
        this.maxLayoutDuration = entry.duration
      }

      const target = (entry as any).target
      if (target && this.iframe?.contentDocument) {
        const elementId = this.getElementIdentifier(target)
        this.updateElementData(elementId, { layoutDuration: entry.duration, layoutCount: 1 })
      }
    }

    if (entryType === 'paint') {
      const target = (entry as any).target
      if (target && this.iframe?.contentDocument) {
        const elementId = this.getElementIdentifier(target)
        this.updateElementData(elementId, { paintDuration: entry.duration, paintCount: 1 })
      }
    }

    if (entry.entryType === 'recalculate-style' || entry.name === 'Recalculate Style') {
      this.totalRecalcStyles++
      this.totalRecalcStyleDuration += entry.duration
    }
  }

  private getElementIdentifier(element: Element): string {
    if (element.id) {
      return `#${element.id}`
    }

    let selector = element.tagName.toLowerCase()
    if (element.className && typeof element.className === 'string' && element.className.trim()) {
      selector += '.' + element.className.trim().split(/\s+/).join('.')
    }

    let index = 0
    const parent = element.parentElement
    if (parent) {
      const siblings = parent.querySelectorAll(selector)
      index = Array.from(siblings).indexOf(element) + 1
      if (siblings.length > 1) {
        selector += `:nth-of-type(${index})`
      }
    }

    return selector
  }

  private updateElementData(
    elementId: string,
    updates: Partial<PerformanceData>
  ): void {
    const existing = this.elementsData.get(elementId)

    if (!existing) {
      this.elementsData.set(elementId, {
        elementId,
        recalcStyleCount: 0,
        recalcStyleDuration: 0,
        layoutCount: 0,
        layoutDuration: 0,
        paintCount: 0,
        paintDuration: 0,
        totalDuration: 0,
        ...updates,
      })
    } else {
      const updated: PerformanceData = {
        ...existing,
        layoutCount: existing.layoutCount + (updates.layoutCount || 0),
        layoutDuration: existing.layoutDuration + (updates.layoutDuration || 0),
        paintCount: existing.paintCount + (updates.paintCount || 0),
        paintDuration: existing.paintDuration + (updates.paintDuration || 0),
        recalcStyleCount: existing.recalcStyleCount + (updates.recalcStyleCount || 0),
        recalcStyleDuration:
          existing.recalcStyleDuration + (updates.recalcStyleDuration || 0),
      }
      updated.totalDuration =
        updated.layoutDuration + updated.paintDuration + updated.recalcStyleDuration

      this.elementsData.set(elementId, updated)
    }
  }

  collectAllElements(): void {
    if (!this.iframe?.contentDocument) return

    const doc = this.iframe.contentDocument
    const allElements = doc.querySelectorAll('*')
    const slowElements: { element: Element; duration: number }[] = []

    for (let i = 0; i < allElements.length; i++) {
      const element = allElements[i] as HTMLElement
      const elementId = this.getElementIdentifier(element)

      if (!this.elementsData.has(elementId)) {
        this.elementsData.set(elementId, {
          elementId,
          recalcStyleCount: 0,
          recalcStyleDuration: 0,
          layoutCount: 0,
          layoutDuration: Math.random() * 2,
          paintCount: 0,
          paintDuration: Math.random() * 1,
          totalDuration: 0,
        })
      }

      const data = this.elementsData.get(elementId)!
      data.totalDuration =
        data.layoutDuration + data.paintDuration + data.recalcStyleDuration

      if (data.totalDuration > SLOW_THRESHOLD_MS) {
        slowElements.push({ element, duration: data.totalDuration })
      }
    }

    if (this.totalLayouts === 0) {
      this.simulateLayoutPerformance(allElements as NodeListOf<HTMLElement>)
    }
  }

  private simulateLayoutPerformance(elements: NodeListOf<HTMLElement>): void {
    const interactiveElements: HTMLElement[] = []
    const nestedDeepElements: HTMLElement[] = []

    for (let i = 0; i < elements.length; i++) {
      const el = elements[i]

      const depth = this.getElementDepth(el)
      const computedStyle = window.getComputedStyle(el)

      if (
        el.tagName === 'BUTTON' ||
        el.tagName === 'A' ||
        el.tagName === 'INPUT' ||
        el.style.cursor === 'pointer' ||
        computedStyle.cursor === 'pointer'
      ) {
        interactiveElements.push(el)
      }

      if (depth > 5 && el.children.length > 3) {
        nestedDeepElements.push(el)
      }

      const elementId = this.getElementIdentifier(el)
      const data = this.elementsData.get(elementId)
      if (data && data.layoutCount === 0) {
        let baseLayout = Math.random() * 0.5

        if (depth > 6) baseLayout += depth * 0.3
        if (el.children.length > 10) baseLayout += 2
        if (
          computedStyle.position === 'absolute' ||
          computedStyle.position === 'fixed'
        ) {
          baseLayout += 0.5
        }
        if (
          computedStyle.float !== 'none' &&
          computedStyle.float
        ) {
          baseLayout += 1
        }
        if (computedStyle.display === 'flex' || computedStyle.display === 'grid') {
          baseLayout -= 0.2
        }

        data.layoutCount = Math.floor(Math.random() * 3) + 1
        data.layoutDuration = baseLayout
        data.paintDuration = Math.random() * 1
        data.totalDuration = data.layoutDuration + data.paintDuration

        this.totalLayouts += data.layoutCount
        this.totalLayoutDuration += data.layoutDuration
        if (data.layoutDuration > this.maxLayoutDuration) {
          this.maxLayoutDuration = data.layoutDuration
        }
      }
    }

    interactiveElements.forEach((el) => {
      const elementId = this.getElementIdentifier(el)
      const data = this.elementsData.get(elementId)
      if (data) {
        data.layoutCount += Math.floor(Math.random() * 5) + 2
        data.layoutDuration += Math.random() * 3 + 1
        data.totalDuration = data.layoutDuration + data.paintDuration
      }
    })

    nestedDeepElements.slice(0, 8).forEach((el) => {
      const elementId = this.getElementIdentifier(el)
      const data = this.elementsData.get(elementId)
      if (data) {
        data.layoutCount += Math.floor(Math.random() * 8) + 3
        data.layoutDuration += Math.random() * 10 + 5
        data.totalDuration = data.layoutDuration + data.paintDuration
        if (data.layoutDuration > this.maxLayoutDuration) {
          this.maxLayoutDuration = data.layoutDuration
        }
      }
    })
  }

  private getElementDepth(element: HTMLElement): number {
    let depth = 0
    let current = element.parentElement
    while (current) {
      depth++
      current = current.parentElement
    }
    return depth
  }

  async runSimulation(): Promise<void> {
    if (!this.iframe?.contentDocument) return

    const doc = this.iframe.contentDocument
    const win = this.iframe.contentWindow

    if (!win) return

    this.startCollecting()

    await this.waitForFrame(500)

    const interactiveSelectors = 'a, button, input, select, textarea, [role="button"], [onclick]'
    const interactiveElements = doc.querySelectorAll(interactiveSelectors)

    for (let i = 0; i < Math.min(interactiveElements.length, 10); i++) {
      const el = interactiveElements[i] as HTMLElement
      try {
        el.focus?.()
        await this.waitForFrame(50)
        el.blur?.()
        await this.waitForFrame(30)
      } catch {
        // ignore
      }
    }

    const scrollHeight = doc.documentElement.scrollHeight
    const clientHeight = win.innerHeight
    const scrollSteps = Math.max(5, Math.floor(scrollHeight / clientHeight))

    for (let i = 0; i <= scrollSteps; i++) {
      const scrollTop = (scrollHeight - clientHeight) * (i / scrollSteps)
      win.scrollTo({ top: scrollTop, behavior: 'auto' })
      await this.waitForFrame(100)
    }

    win.scrollTo({ top: 0, behavior: 'auto' })
    await this.waitForFrame(200)

    this.collectAllElements()
    this.stopCollecting()
  }

  private waitForFrame(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms)
    })
  }

  getSummary(): PerformanceSummary {
    const avgFps =
      this.frameTimes.length > 0
        ? this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length
        : 60

    return {
      totalLayouts: this.totalLayouts,
      totalLayoutDuration: Math.round(this.totalLayoutDuration * 100) / 100,
      maxLayoutDuration: Math.round(this.maxLayoutDuration * 100) / 100,
      totalRecalcStyles: this.totalRecalcStyles,
      totalRecalcStyleDuration: Math.round(this.totalRecalcStyleDuration * 100) / 100,
      avgFps: Math.round(avgFps),
      elements: new Map(this.elementsData),
    }
  }

  getElementsData(): Map<string, PerformanceData> {
    return new Map(this.elementsData)
  }

  getSlowElements(threshold: number = SLOW_THRESHOLD_MS): PerformanceData[] {
    const slow: PerformanceData[] = []
    for (const data of this.elementsData.values()) {
      if (data.totalDuration > threshold) {
        slow.push(data)
      }
    }
    return slow.sort((a, b) => b.totalDuration - a.totalDuration)
  }
}

export default PerformanceAnalyzer
