import { useRef, useEffect, useState, useCallback } from 'react'

interface AudioPlayerProps {
  waveformData: number[]
  audioUrl?: string
  duration: number
  color?: string
  height?: number
  showControls?: boolean
}

export default function AudioPlayer({
  waveformData,
  audioUrl,
  duration,
  color = '#888899',
  height = 120,
  showControls = true,
}: AudioPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const animationRef = useRef<number>(0)
  
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartX, setDragStartX] = useState(0)
  const [dragStartOffset, setDragStartOffset] = useState(0)
  const [canvasWidth, setCanvasWidth] = useState(0)

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container || waveformData.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const width = container.clientWidth
    const height = canvas.clientHeight

    if (canvasWidth !== width) {
      setCanvasWidth(width)
    }

    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, width, height)

    const midY = height / 2
    const totalPoints = waveformData.length
    const visiblePoints = Math.floor(totalPoints / zoom)
    const startIndex = Math.floor(offset * totalPoints)
    const endIndex = Math.min(startIndex + visiblePoints, totalPoints)

    const pointsToDraw = endIndex - startIndex
    const barWidth = width / pointsToDraw
    const barGap = Math.max(1, barWidth * 0.3)

    ctx.strokeStyle = color
    ctx.lineWidth = Math.max(1, barWidth - barGap)
    ctx.lineCap = 'round'

    for (let i = 0; i < pointsToDraw; i++) {
      const dataIndex = startIndex + i
      if (dataIndex >= waveformData.length) break

      const value = waveformData[dataIndex]
      const x = i * barWidth + barWidth / 2
      const barHeight = value * (height - 10) * 0.9

      ctx.beginPath()
      ctx.moveTo(x, midY - barHeight / 2)
      ctx.lineTo(x, midY + barHeight / 2)
      ctx.stroke()
    }
  }, [waveformData, zoom, offset, color, canvasWidth])

  useEffect(() => {
    let animationId: number
    const animate = () => {
      drawWaveform()
      animationId = requestAnimationFrame(animate)
    }
    animationId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationId)
  }, [drawWaveform])

  useEffect(() => {
    const handleResize = () => {
      drawWaveform()
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [drawWaveform])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    setIsDragging(true)
    setDragStartX(e.clientX)
    setDragStartOffset(offset)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return
    
    const deltaX = e.clientX - dragStartX
    const containerWidth = containerRef.current.clientWidth
    const deltaOffset = (deltaX / containerWidth) * zoom
    
    let newOffset = dragStartOffset - deltaOffset / zoom
    newOffset = Math.max(0, Math.min(1 - 1 / zoom, newOffset))
    setOffset(newOffset)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    let newZoom = zoom * delta
    newZoom = Math.max(1, Math.min(10, newZoom))
    
    const rect = containerRef.current?.getBoundingClientRect()
    if (rect) {
      const mouseX = e.clientX - rect.left
      const mouseRatio = mouseX / rect.width
      const zoomRatio = mouseRatio * (1 - 1 / zoom) + offset / zoom
      
      let newOffset = zoomRatio * (1 - 1 / newZoom)
      newOffset = Math.max(0, Math.min(1 - 1 / newZoom, newOffset))
      setOffset(newOffset)
    }
    
    setZoom(newZoom)
  }

  const togglePlay = () => {
    if (!audioUrl) return
    
    if (isPlaying) {
      audioRef.current?.pause()
    } else {
      audioRef.current?.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleEnded = () => {
    setIsPlaying(false)
    setCurrentTime(0)
  }

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (isDragging || !audioRef.current || !containerRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const clickRatio = clickX / rect.width
    
    const visibleDuration = duration / zoom
    const startOffset = offset * duration
    const seekTime = startOffset + clickRatio * visibleDuration
    
    audioRef.current.currentTime = Math.max(0, Math.min(duration, seekTime))
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0
  const visibleProgress = (currentTime - offset * duration) / (duration / zoom) * 100

  return (
    <div>
      <div
        ref={containerRef}
        className="waveform-container"
        style={{ height: `${height}px` }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleCanvasClick}
      >
        <canvas
          ref={canvasRef}
          className="waveform-canvas"
          style={{ height: '100%' }}
        />
        {audioUrl && duration > 0 && (
          <div
            className="waveform-progress"
            style={{
              width: `${Math.max(0, Math.min(100, visibleProgress))}%`,
              left: `${offset * 100}%`,
              transform: `scaleX(${zoom})`,
              transformOrigin: 'left',
            }}
          />
        )}
      </div>
      
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
        />
      )}

      {showControls && audioUrl && (
        <div className="playback-controls">
          <button
            className="play-btn"
            onClick={togglePlay}
            disabled={!audioUrl}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <span className="time-display">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      )}
    </div>
  )
}
