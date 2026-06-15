import html2canvas from 'html2canvas'
import { eventBus, Events } from './EventBus'

export interface ScreenshotResult {
  canvas: HTMLCanvasElement
  imageData: ImageData
  width: number
  height: number
  viewport: number
  label: string
}

export interface ScreenshotOptions {
  viewportWidth: number
  waitTime?: number
  scale?: number
}

type InputType = 'url' | 'html'

export class ScreenshotEngine {
  private container: HTMLDivElement | null = null
  private iframeA: HTMLIFrameElement | null = null
  private iframeB: HTMLIFrameElement | null = null

  constructor() {
    this.initContainer()
  }

  private initContainer(): void {
    this.container = document.createElement('div')
    this.container.style.position = 'fixed'
    this.container.style.left = '-99999px'
    this.container.style.top = '-99999px'
    this.container.style.visibility = 'hidden'
    this.container.style.pointerEvents = 'none'
    this.container.style.zIndex = '-9999'
    document.body.appendChild(this.container)
  }

  private createIframe(width: number): HTMLIFrameElement {
    const iframe = document.createElement('iframe')
    iframe.style.width = `${width}px`
    iframe.style.height = '800px'
    iframe.style.border = 'none'
    iframe.style.overflow = 'hidden'
    iframe.sandbox.add('allow-same-origin', 'allow-scripts', 'allow-popups')
    this.container!.appendChild(iframe)
    return iframe
  }

  private loadContent(iframe: HTMLIFrameElement, type: InputType, content: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('加载超时'))
      }, 30000)

      iframe.onload = () => {
        clearTimeout(timeoutId)
        resolve()
      }

      iframe.onerror = () => {
        clearTimeout(timeoutId)
        reject(new Error('加载失败'))
      }

      if (type === 'url') {
        iframe.src = content
      } else {
        iframe.srcdoc = content
      }
    })
  }

  private async captureIframe(
    iframe: HTMLIFrameElement,
    viewport: number,
    label: string,
    scale: number = 1
  ): Promise<ScreenshotResult> {
    const doc = iframe.contentDocument
    if (!doc) {
      throw new Error('无法访问iframe内容')
    }

    const canvas = await html2canvas(doc.body, {
      scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: viewport,
      windowWidth: viewport
    })

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('无法获取canvas上下文')
    }

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

    return {
      canvas,
      imageData,
      width: canvas.width,
      height: canvas.height,
      viewport,
      label
    }
  }

  async capture(
    inputA: { type: InputType; content: string },
    inputB: { type: InputType; content: string },
    options: ScreenshotOptions
  ): Promise<{ screenshotA: ScreenshotResult; screenshotB: ScreenshotResult }> {
    const { viewportWidth, waitTime = 3000, scale = 1 } = options

    try {
      eventBus.emit(Events.STATUS_MESSAGE, `开始截图 - 宽度${viewportWidth}px`)
      eventBus.emit(Events.SCREENSHOT_PROGRESS, { viewport: viewportWidth, phase: 'loading' })

      if (this.iframeA) this.container!.removeChild(this.iframeA)
      if (this.iframeB) this.container!.removeChild(this.iframeB)

      this.iframeA = this.createIframe(viewportWidth)
      this.iframeB = this.createIframe(viewportWidth)

      await Promise.all([
        this.loadContent(this.iframeA, inputA.type, inputA.content),
        this.loadContent(this.iframeB, inputB.type, inputB.content)
      ])

      eventBus.emit(Events.SCREENSHOT_PROGRESS, { viewport: viewportWidth, phase: 'waiting' })
      eventBus.emit(Events.STATUS_MESSAGE, `等待页面渲染 - 宽度${viewportWidth}px`)

      await new Promise((resolve) => setTimeout(resolve, waitTime))

      eventBus.emit(Events.SCREENSHOT_PROGRESS, { viewport: viewportWidth, phase: 'capturing' })
      eventBus.emit(Events.STATUS_MESSAGE, `正在截取页面 - 宽度${viewportWidth}px`)

      const [screenshotA, screenshotB] = await Promise.all([
        this.captureIframe(this.iframeA, viewportWidth, 'A', scale),
        this.captureIframe(this.iframeB, viewportWidth, 'B', scale)
      ])

      eventBus.emit(Events.SCREENSHOT_COMPLETE, { viewport: viewportWidth, screenshotA, screenshotB })
      eventBus.emit(Events.STATUS_MESSAGE, `截图完成 - 宽度${viewportWidth}px`)

      return { screenshotA, screenshotB }
    } catch (error) {
      eventBus.emit(Events.SCREENSHOT_ERROR, { viewport: viewportWidth, error })
      eventBus.emit(Events.STATUS_MESSAGE, `截图失败 - 宽度${viewportWidth}px: ${(error as Error).message}`)
      throw error
    }
  }

  async captureBatch(
    inputA: { type: InputType; content: string },
    inputB: { type: InputType; content: string },
    viewports: number[],
    waitTime: number = 3000
  ): Promise<{ viewport: number; screenshotA: ScreenshotResult; screenshotB: ScreenshotResult }[]> {
    const results: { viewport: number; screenshotA: ScreenshotResult; screenshotB: ScreenshotResult }[] = []

    for (let i = 0; i < viewports.length; i++) {
      const viewport = viewports[i]
      try {
        const result = await this.capture(inputA, inputB, { viewportWidth: viewport, waitTime })
        results.push({ viewport, ...result })
      } catch (e) {
        console.error(`Viewport ${viewport} failed:`, e)
      }
    }

    eventBus.emit(Events.BATCH_COMPLETE, results)
    return results
  }

  destroy(): void {
    if (this.iframeA) this.container?.removeChild(this.iframeA)
    if (this.iframeB) this.container?.removeChild(this.iframeB)
    if (this.container) document.body.removeChild(this.container)
    this.iframeA = null
    this.iframeB = null
    this.container = null
  }
}

export const screenshotEngine = new ScreenshotEngine()
