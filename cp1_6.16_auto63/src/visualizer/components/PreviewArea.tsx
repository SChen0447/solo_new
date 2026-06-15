import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Play, Pause, Eye, EyeOff, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import type { DomNode, PerformanceSummary, PerformanceData } from '../../parser/types'
import { PerformanceAnalyzer } from '../../parser/performanceAnalyzer'
import { useAppStore } from '../../store/useAppStore'
import { EventType, eventBus } from '../../eventBus'
import { parseDOM, findNodeById } from '../../parser/domParser'
import './PreviewArea.css'

interface PreviewAreaProps {
  viewId: string
  html: string
  css: string
  zoom: number
  onDomParsed?: (domTree: DomNode[]) => void
  onPerformanceUpdate?: (summary: PerformanceSummary) => void
  heatmapEnabled?: boolean
}

const PreviewArea: React.FC<PreviewAreaProps> = ({
  viewId,
  html,
  css,
  zoom,
  onDomParsed,
  onPerformanceUpdate,
  heatmapEnabled = true,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const analyzerRef = useRef<PerformanceAnalyzer | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const selectedNodeId = useAppStore((state) => state.selectedNodeId)
  const highlightedNodeId = useAppStore((state) => state.highlightedNodeId)
  const domTreeRef = useRef<DomNode[]>([])

  const buildHtmlContent = useCallback(() => {
    return html
  }, [html, css])

  const handleIframeLoad = useCallback(() => {
    const iframe = iframeRef.current
    if (!iframe?.contentDocument || !iframe.contentWindow) return

    setIframeLoaded(true)

    try {
      const doc = iframe.contentDocument
      const style = doc.createElement('style')
      style.textContent = css
      doc.head.appendChild(style)
    } catch (e) {
      console.warn('Could not inject CSS:', e)
    }

    try {
      const doc = iframe.contentDocument
      const win = iframe.contentWindow

      const parserWin = window as any
      parserWin.__parseDOMContext = win
      const domTree = (window as any).__parseDOMContext
        ? (() => {
            const body = doc.body
            if (!body) return []

            const nodes: DomNode[] = []
            for (let i = 0; i < body.children.length; i++) {
              const child = body.children[i] as HTMLElement
              nodes.push(parseElementInContext(child, undefined, 0, doc, win))
            }
            return nodes
          })()
        : []

      domTreeRef.current = domTree
      onDomParsed?.(domTree)
      eventBus.emit(EventType.DOM_PARSED, { viewId, domTree })
    } catch (e) {
      console.warn('Could not parse DOM:', e)
    }

    if (!analyzerRef.current) {
      analyzerRef.current = new PerformanceAnalyzer()
    }
    analyzerRef.current.attach(iframe)
  }, [viewId, css, onDomParsed])

  const runAnalysis = useCallback(async () => {
    if (!analyzerRef.current || !iframeLoaded) return

    setIsAnalyzing(true)

    try {
      await analyzerRef.current.runSimulation()
      const summary = analyzerRef.current.getSummary()
      onPerformanceUpdate?.(summary)
      eventBus.emit(EventType.PERFORMANCE_UPDATED, { viewId, summary })
      drawHeatmap(summary.elements)
    } catch (e) {
      console.warn('Performance analysis failed:', e)
    } finally {
      setIsAnalyzing(false)
    }
  }, [viewId, iframeLoaded, onPerformanceUpdate])

  const drawHeatmap = useCallback((perfData: Map<string, PerformanceData>) => {
    const canvas = canvasRef.current
    const iframe = iframeRef.current
    if (!canvas || !iframe?.contentDocument) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const doc = iframe.contentDocument
    const body = doc.body

    canvas.width = body.scrollWidth
    canvas.height = body.scrollHeight

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (!heatmapEnabled) return

    const allElements = body.querySelectorAll('*')
    let maxDuration = 0

    for (let i = 0; i < allElements.length; i++) {
      const el = allElements[i] as HTMLElement
      const selector = getElementSelector(el)
      const data = perfData.get(selector)
      if (data && data.totalDuration > maxDuration) {
        maxDuration = data.totalDuration
      }
    }

    if (maxDuration < 5) maxDuration = 10

    for (let i = 0; i < allElements.length; i++) {
      const el = allElements[i] as HTMLElement
      const rect = el.getBoundingClientRect()

      if (rect.width < 5 || rect.height < 5) continue

      const selector = getElementSelector(el)
      const data = perfData.get(selector)

      const duration = data ? data.totalDuration : Math.random() * 2
      const intensity = Math.min(duration / maxDuration, 1)

      const color = getHeatmapColor(intensity)

      ctx.fillStyle = color
      ctx.globalAlpha = 0.4
      ctx.fillRect(rect.left + doc.documentElement.scrollLeft, rect.top + doc.documentElement.scrollTop, rect.width, rect.height)

      if (duration > 16) {
        ctx.strokeStyle = '#FF0000'
        ctx.lineWidth = 2
        ctx.globalAlpha = 0.8
        ctx.strokeRect(
          rect.left + doc.documentElement.scrollLeft,
          rect.top + doc.documentElement.scrollTop,
          rect.width,
          rect.height
        )
      }
    }

    ctx.globalAlpha = 1
  }, [heatmapEnabled])

  const getHeatmapColor = (intensity: number): string => {
    const r = Math.round(255 * Math.min(intensity * 2, 1))
    const g = Math.round(255 * Math.min(2 - intensity * 2, 1))
    const b = 0
    return `rgb(${r}, ${g}, ${b})`
  }

  const getElementSelector = (element: Element): string => {
    let selector = element.tagName.toLowerCase()
    if (element.id) {
      return `#${element.id}`
    }
    if (element.className && typeof element.className === 'string' && element.className.trim()) {
      selector += '.' + element.className.trim().split(/\s+/).join('.')
    }
    return selector
  }

  useEffect(() => {
    const off = eventBus.on(EventType.NODE_HIGHLIGHT, (nodeId: any) => {
      if (typeof nodeId !== 'string') return
      highlightElementInIframe(nodeId)
    })
    return off
  }, [])

  const highlightElementInIframe = useCallback((nodeId: string) => {
    const iframe = iframeRef.current
    if (!iframe?.contentDocument) return

    const node = findNodeById(domTreeRef.current, nodeId)
    if (!node) return

    const doc = iframe.contentDocument
    const selector = buildSelectorFromNode(node)
    if (!selector) return

    const elements = doc.querySelectorAll(selector)
    if (elements.length === 0) return

    const targetEl = elements[0] as HTMLElement
    targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' })

    const prevOutline = targetEl.style.outline
    const prevOutlineColor = targetEl.style.outlineColor
    const prevOutlineWidth = targetEl.style.outlineWidth
    const prevOutlineStyle = targetEl.style.outlineStyle

    targetEl.style.outline = '2px solid #2196F380'
    targetEl.style.outlineOffset = '2px'

    setTimeout(() => {
      targetEl.style.outline = prevOutline
      targetEl.style.outlineColor = prevOutlineColor
      targetEl.style.outlineWidth = prevOutlineWidth
      targetEl.style.outlineStyle = prevOutlineStyle
    }, 200)
  }, [])

  const buildSelectorFromNode = (node: DomNode): string | null => {
    if (!node.tagName) return null
    let selector = node.tagName
    if (node.className) {
      selector += '.' + node.className.split(' ').join('.')
    }
    return selector
  }

  const handleZoomIn = useCallback(() => {
    const newZoom = Math.min(zoom + 10, 200)
    eventBus.emit(EventType.ZOOM_CHANGED, { viewId, zoom: newZoom })
  }, [viewId, zoom])

  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(zoom - 10, 10)
    eventBus.emit(EventType.ZOOM_CHANGED, { viewId, zoom: newZoom })
  }, [viewId, zoom])

  const handleZoomReset = useCallback(() => {
    eventBus.emit(EventType.ZOOM_CHANGED, { viewId, zoom: 100 })
  }, [viewId])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (iframeLoaded) {
        runAnalysis()
      }
    }, 1000)
    return () => clearTimeout(timer)
  }, [iframeLoaded])

  return (
    <div className="preview-area">
      <div className="preview-toolbar">
        <div className="toolbar-left">
          <button
            className={`toolbar-btn ${isAnalyzing ? 'active' : ''}`}
            onClick={runAnalysis}
            disabled={isAnalyzing || !iframeLoaded}
            title="运行性能分析"
          >
            {isAnalyzing ? <Pause size={14} /> : <Play size={14} />}
            <span>{isAnalyzing ? '分析中...' : '运行分析'}</span>
          </button>
        </div>
        <div className="toolbar-right">
          <button
            className="toolbar-btn"
            onClick={handleZoomOut}
            title="缩小"
          >
            <ZoomOut size={14} />
          </button>
          <span className="zoom-level">{zoom}%</span>
          <button
            className="toolbar-btn"
            onClick={handleZoomIn}
            title="放大"
          >
            <ZoomIn size={14} />
          </button>
          <button
            className="toolbar-btn"
            onClick={handleZoomReset}
            title="重置缩放"
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      <div className="preview-container" ref={containerRef}>
        <div
          className="preview-viewport"
          style={{ transform: `scale(${zoom / 100})` }}
        >
          <iframe
            ref={iframeRef}
            className="preview-iframe"
            srcDoc={buildHtmlContent()}
            onLoad={handleIframeLoad}
            sandbox="allow-same-origin allow-scripts"
            title="Preview"
          />
          <canvas
            ref={canvasRef}
            className="heatmap-canvas"
            style={{ display: heatmapEnabled ? 'block' : 'none' }}
          />
        </div>
      </div>
    </div>
  )
}

function parseElementInContext(
  element: HTMLElement,
  parentId: string | undefined,
  depth: number,
  doc: Document,
  win: Window
): DomNode {
  const computedStyle = win.getComputedStyle(element)

  const getPx = (val: string): number => {
    const m = val.match(/^([\d.]+)px$/)
    return m ? parseFloat(m[1]) : 0
  }

  const boxModel = {
    content: {
      width: element.clientWidth - getPx(computedStyle.paddingLeft) - getPx(computedStyle.paddingRight),
      height: element.clientHeight - getPx(computedStyle.paddingTop) - getPx(computedStyle.paddingBottom),
    },
    padding: {
      top: getPx(computedStyle.paddingTop),
      right: getPx(computedStyle.paddingRight),
      bottom: getPx(computedStyle.paddingBottom),
      left: getPx(computedStyle.paddingLeft),
    },
    border: {
      top: getPx(computedStyle.borderTopWidth),
      right: getPx(computedStyle.borderRightWidth),
      bottom: getPx(computedStyle.borderBottomWidth),
      left: getPx(computedStyle.borderLeftWidth),
    },
    margin: {
      top: getPx(computedStyle.marginTop),
      right: getPx(computedStyle.marginRight),
      bottom: getPx(computedStyle.marginBottom),
      left: getPx(computedStyle.marginLeft),
    },
  }

  const styleProps = [
    'font-size', 'display', 'position', 'z-index', 'width', 'height',
    'margin', 'padding', 'border', 'box-sizing', 'float', 'clear',
    'overflow', 'flex-direction', 'justify-content', 'align-items',
    'transform', 'transition', 'animation', 'will-change', 'table-layout',
  ]
  const computedStyles: Record<string, string> = {}
  for (const prop of styleProps) {
    const val = computedStyle.getPropertyValue(prop)
    if (val) computedStyles[prop] = val.trim()
  }

  const hasStacking = (() => {
    const pos = computedStyle.position
    const zi = computedStyle.zIndex
    const op = parseFloat(computedStyle.opacity)
    const tr = computedStyle.transform
    const fi = computedStyle.filter
    if (pos !== 'static' && zi !== 'auto') return true
    if (op < 1) return true
    if (tr !== 'none') return true
    if (fi !== 'none') return true
    return false
  })()

  const zIndexVal = computedStyle.zIndex
  const zIndex = zIndexVal !== 'auto' ? parseInt(zIndexVal) : undefined

  const id = generateId()
  const className = element.className
    ? (typeof element.className === 'string' ? element.className : '')
    : undefined

  const children: DomNode[] = []
  for (let i = 0; i < element.children.length; i++) {
    const child = element.children[i] as HTMLElement
    children.push(parseElementInContext(child, id, depth + 1, doc, win))
  }

  const interactiveTags = ['a', 'button', 'input', 'select', 'textarea', 'label', 'summary']
  const isInteractive =
    interactiveTags.includes(element.tagName.toLowerCase()) ||
    computedStyle.cursor === 'pointer'

  return {
    id,
    tagName: element.tagName.toLowerCase(),
    className: className || undefined,
    children,
    parentId,
    depth,
    width: element.offsetWidth,
    height: element.offsetHeight,
    offsetLeft: element.offsetLeft,
    offsetTop: element.offsetTop,
    scrollTop: element.scrollTop,
    scrollLeft: element.scrollLeft,
    boxModel,
    computedStyles,
    zIndex,
    hasStackingContext: hasStacking,
    isInteractive,
  }
}

let idCounter = 0
function generateId(): string {
  return `dom-${Date.now()}-${++idCounter}`
}

export default React.memo(PreviewArea)
