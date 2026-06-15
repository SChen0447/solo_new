import React, { useRef, useEffect, useCallback, useState } from 'react'
import { useStore, type DataPoint, type TimeWindow } from '@/store/Store'
import { SimulationEngine } from '@/modules/physiology/SimulationEngine'

interface ChartData {
  label: string
  color: string
  data: DataPoint[]
  isDashed?: boolean
}

const DataPanel: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, time: 0 })
  const [displayWindow, setDisplayWindow] = useState<TimeWindow>({ start: 0, end: 60 })
  const lastRenderTime = useRef(0)
  const animationFrameId = useRef<number | null>(null)
  const simulationEngine = useRef(new SimulationEngine())

  const selectedOrganelleId = useStore((state) => state.selectedOrganelleId)
  const timeWindow = useStore((state) => state.timeWindow)
  const setTimeWindow = useStore((state) => state.setTimeWindow)
  const organelleData = useStore((state) => state.organelleData)
  const simulationTime = useStore((state) => state.simulationTime)

  const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3)

  const interpolateWindow = useCallback(
    (target: TimeWindow, duration: number = 150): void => {
      const start = { ...displayWindow }
      const startTime = performance.now()

      const animate = (now: number): void => {
        const elapsed = now - startTime
        const progress = Math.min(elapsed / duration, 1)
        const eased = easeOutCubic(progress)

        setDisplayWindow({
          start: start.start + (target.start - start.start) * eased,
          end: start.end + (target.end - start.end) * eased,
        })

        if (progress < 1) {
          requestAnimationFrame(animate)
        }
      }

      requestAnimationFrame(animate)
    },
    [displayWindow]
  )

  useEffect(() => {
    if (timeWindow.start !== displayWindow.start || timeWindow.end !== displayWindow.end) {
      interpolateWindow(timeWindow)
    }
  }, [timeWindow, interpolateWindow, displayWindow.start, displayWindow.end])

  useEffect(() => {
    if (simulationTime > displayWindow.end && simulationTime > 60) {
      const newEnd = simulationTime
      const newStart = Math.max(0, newEnd - (displayWindow.end - displayWindow.start))
      setTimeWindow({ start: newStart, end: newEnd })
    }
  }, [simulationTime, displayWindow.end, displayWindow.start, setTimeWindow])

  const getChartData = useCallback((): ChartData[] => {
    if (!selectedOrganelleId) return []

    const primary = organelleData[selectedOrganelleId]
    const linkedId = simulationEngine.current.getLinkedOrganelle(selectedOrganelleId)
    const linked = linkedId ? organelleData[linkedId] : null

    const data: ChartData[] = [
      {
        label: primary.name,
        color: primary.color,
        data: primary.dataSeries,
      },
    ]

    if (linked) {
      data.push({
        label: linked.name,
        color: linked.color,
        data: linked.dataSeries,
        isDashed: true,
      })
    }

    return data
  }, [selectedOrganelleId, organelleData])

  const drawChart = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      width: number,
      height: number,
      data: ChartData[],
      title: string,
      showLegend: boolean = true
    ): void => {
      const padding = { top: 25, right: 15, bottom: 30, left: 50 }
      const chartWidth = width - padding.left - padding.right
      const chartHeight = height - padding.top - padding.bottom

      ctx.fillStyle = '#1a1a1a'
      ctx.fillRect(x, y, width, height)

      ctx.strokeStyle = '#333'
      ctx.lineWidth = 1
      ctx.strokeRect(x, y, width, height)

      if (data.length === 0) return

      const window = displayWindow
      const windowDuration = window.end - window.start

      const allValues = data.flatMap((d) => d.data.map((p) => p.value))
      const minVal = Math.min(...allValues, 0)
      const maxVal = Math.max(...allValues, 1)
      const valueRange = maxVal - minVal || 1
      const yPadding = valueRange * 0.1

      ctx.strokeStyle = '#e0e0e0'
      ctx.lineWidth = 0.5
      ctx.globalAlpha = 0.3

      for (let i = 0; i <= 5; i++) {
        const yPos = y + padding.top + (chartHeight * i) / 5
        ctx.beginPath()
        ctx.moveTo(x + padding.left, yPos)
        ctx.lineTo(x + padding.left + chartWidth, yPos)
        ctx.stroke()
      }

      for (let i = 0; i <= 6; i++) {
        const xPos = x + padding.left + (chartWidth * i) / 6
        ctx.beginPath()
        ctx.moveTo(xPos, y + padding.top)
        ctx.lineTo(xPos, y + padding.top + chartHeight)
        ctx.stroke()
      }

      ctx.globalAlpha = 1

      ctx.fillStyle = '#888'
      ctx.font = '10px sans-serif'
      ctx.textAlign = 'right'

      for (let i = 0; i <= 5; i++) {
        const yPos = y + padding.top + (chartHeight * i) / 5
        const value = maxVal + yPadding - ((valueRange + yPadding * 2) * i) / 5
        ctx.fillText(value.toFixed(1), x + padding.left - 5, yPos + 3)
      }

      ctx.textAlign = 'center'
      for (let i = 0; i <= 6; i++) {
        const xPos = x + padding.left + (chartWidth * i) / 6
        const time = window.start + (windowDuration * i) / 6
        const minutes = Math.floor(time / 60)
        const seconds = Math.floor(time % 60)
        ctx.fillText(`${minutes}:${seconds.toString().padStart(2, '0')}`, xPos, y + padding.top + chartHeight + 15)
      }

      ctx.fillStyle = '#fff'
      ctx.font = 'bold 12px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(title, x + padding.left, y + padding.top - 8)

      data.forEach((series, seriesIndex) => {
        if (series.data.length < 2) return

        ctx.strokeStyle = series.color
        ctx.lineWidth = 3
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        if (series.isDashed) {
          ctx.setLineDash([8, 4])
        } else {
          ctx.setLineDash([])
        }

        ctx.beginPath()
        let started = false

        for (let i = 0; i < series.data.length; i++) {
          const point = series.data[i]
          if (point.timestamp < window.start || point.timestamp > window.end) continue

          const xPos =
            x + padding.left + ((point.timestamp - window.start) / windowDuration) * chartWidth
          const yPos =
            y +
            padding.top +
            chartHeight -
            ((point.value - (minVal - yPadding)) / (valueRange + yPadding * 2)) * chartHeight

          if (!started) {
            ctx.moveTo(xPos, yPos)
            started = true
          } else {
            ctx.lineTo(xPos, yPos)
          }
        }

        ctx.stroke()
        ctx.setLineDash([])

        const lastPoint = series.data[series.data.length - 1]
        if (lastPoint) {
          const xPos =
            x + padding.left + ((lastPoint.timestamp - window.start) / windowDuration) * chartWidth
          const yPos =
            y +
            padding.top +
            chartHeight -
            ((lastPoint.value - (minVal - yPadding)) / (valueRange + yPadding * 2)) * chartHeight

          if (xPos >= x + padding.left && xPos <= x + padding.left + chartWidth) {
            ctx.beginPath()
            ctx.arc(xPos, yPos, 4, 0, Math.PI * 2)
            ctx.fillStyle = series.color
            ctx.fill()
            ctx.strokeStyle = '#fff'
            ctx.lineWidth = 1
            ctx.stroke()
          }
        }

        if (showLegend) {
          const legendX = x + padding.left + 10 + seriesIndex * 120
          const legendY = y + padding.top + 10

          ctx.fillStyle = '#1a1a1a'
          ctx.fillRect(legendX - 5, legendY - 10, 110, 20)

          ctx.strokeStyle = series.color
          ctx.lineWidth = 2
          if (series.isDashed) {
            ctx.setLineDash([5, 3])
          } else {
            ctx.setLineDash([])
          }
          ctx.beginPath()
          ctx.moveTo(legendX, legendY)
          ctx.lineTo(legendX + 20, legendY)
          ctx.stroke()
          ctx.setLineDash([])

          ctx.fillStyle = '#fff'
          ctx.font = '10px sans-serif'
          ctx.textAlign = 'left'
          ctx.fillText(series.label, legendX + 25, legendY + 3)
        }
      })
    },
    [displayWindow]
  )

  const render = useCallback(() => {
    const now = performance.now()
    if (now - lastRenderTime.current < 166) {
      animationFrameId.current = requestAnimationFrame(render)
      return
    }
    lastRenderTime.current = now

    const canvas = canvasRef.current
    if (!canvas) {
      animationFrameId.current = requestAnimationFrame(render)
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      animationFrameId.current = requestAnimationFrame(render)
      return
    }

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()

    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    ctx.fillStyle = '#121212'
    ctx.fillRect(0, 0, rect.width, rect.height)

    if (!selectedOrganelleId) {
      ctx.fillStyle = '#888'
      ctx.font = '14px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('请点击细胞器查看详情', rect.width / 2, rect.height / 2)
      animationFrameId.current = requestAnimationFrame(render)
      return
    }

    const chartWidth = (rect.width - 40) * 0.45
    const chartHeight = 280
    const gap = (rect.width - 40) * 0.1

    const allData = getChartData()
    const primaryData: ChartData[] = [allData[0]].filter(Boolean)
    const comparisonData: ChartData[] = allData

    drawChart(ctx, 20, 20, chartWidth, chartHeight, primaryData, '参数时间序列', true)
    drawChart(ctx, 20 + chartWidth + gap, 20, chartWidth, chartHeight, comparisonData, '联动对比', true)

    animationFrameId.current = requestAnimationFrame(render)
  }, [selectedOrganelleId, getChartData, drawChart])

  useEffect(() => {
    animationFrameId.current = requestAnimationFrame(render)
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current)
      }
    }
  }, [render])

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>): void => {
    if (!selectedOrganelleId) return
    setIsDragging(true)
    setDragStart({
      x: e.clientX,
      time: displayWindow.start,
    })
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>): void => {
    if (!isDragging || !selectedOrganelleId) return

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const deltaX = e.clientX - dragStart.x
    const chartWidth = (rect.width - 40) * 0.45
    const windowDuration = displayWindow.end - displayWindow.start
    const timeDelta = -(deltaX / chartWidth) * windowDuration

    const newStart = Math.max(0, Math.min(simulationTime - windowDuration, dragStart.time + timeDelta))
    const newEnd = newStart + windowDuration

    setDisplayWindow({ start: newStart, end: newEnd })
  }

  const handleMouseUp = (): void => {
    if (isDragging) {
      setTimeWindow(displayWindow)
    }
    setIsDragging(false)
  }

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>): void => {
    if (!selectedOrganelleId) return
    e.preventDefault()

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const currentDuration = displayWindow.end - displayWindow.start
    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9
    const newDuration = Math.max(30, Math.min(300, currentDuration * zoomFactor))

    const center = (displayWindow.start + displayWindow.end) / 2
    const newStart = Math.max(0, Math.min(simulationTime - newDuration, center - newDuration / 2))
    const newEnd = newStart + newDuration

    const target = { start: newStart, end: newEnd }
    setTimeWindow(target)
    interpolateWindow(target)
  }

  return (
    <div
      className="data-panel"
      style={{
        width: '100%',
        height: '560px',
        backgroundColor: '#121212',
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          cursor: isDragging ? 'grabbing' : selectedOrganelleId ? 'grab' : 'default',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />
    </div>
  )
}

export default DataPanel
