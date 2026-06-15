import { useRef, useEffect, useState } from 'react'
import { useAudioStore } from './store'

interface TrackCardProps {
  title: string
  icon: string
  iconClass: string
  waveformData: number[]
  audioUrl?: string
  duration: number
  volume: number
  onVolumeChange: (volume: number) => void
  color: string
  fileName: string
}

function TrackCard({
  title,
  icon,
  iconClass,
  waveformData,
  audioUrl,
  duration,
  volume,
  onVolumeChange,
  color,
  fileName,
}: TrackCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const animationRef = useRef<number>(0)

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100
    }
  }, [volume])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container || waveformData.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const width = container.clientWidth
    const height = container.clientHeight

    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, width, height)

    const midY = height / 2
    const totalPoints = waveformData.length
    const barWidth = width / totalPoints
    const barGap = Math.max(1, barWidth * 0.3)

    ctx.strokeStyle = color
    ctx.lineWidth = Math.max(1, barWidth - barGap)
    ctx.lineCap = 'round'

    const draw = () => {
      ctx.clearRect(0, 0, width, height)
      
      for (let i = 0; i < totalPoints; i++) {
        const value = waveformData[i]
        const x = i * barWidth + barWidth / 2
        const barHeight = value * (height - 10) * 0.9

        ctx.beginPath()
        ctx.moveTo(x, midY - barHeight / 2)
        ctx.lineTo(x, midY + barHeight / 2)
        ctx.stroke()
      }

      if (audioUrl && duration > 0) {
        const progressX = (currentTime / duration) * width
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
        ctx.fillRect(0, 0, progressX, height)
      }

      animationRef.current = requestAnimationFrame(draw)
    }

    animationRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animationRef.current)
    }
  }, [waveformData, color, audioUrl, duration, currentTime])

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

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onVolumeChange(Number(e.target.value))
  }

  const handleDownload = () => {
    if (!audioUrl) return
    
    const link = document.createElement('a')
    link.href = audioUrl
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="track-card">
      <div className="track-header">
        <div className="track-title">
          <div className={`track-icon ${iconClass}`}>{icon}</div>
          <span className="track-name">{title}</span>
        </div>
        <button
          className="play-btn"
          style={{ width: '36px', height: '36px', fontSize: '14px' }}
          onClick={togglePlay}
          disabled={!audioUrl}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
      </div>

      <div ref={containerRef} className="track-waveform">
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', display: 'block' }}
        />
      </div>

      {audioUrl && duration > 0 && (
        <div style={{ fontSize: '12px', color: '#a0a0b0', marginBottom: '12px', textAlign: 'right' }}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      )}

      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
        />
      )}

      <div className="track-controls">
        <div className="volume-control">
          <span className="volume-icon">🔊</span>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={handleVolumeChange}
            className="volume-slider"
          />
          <span className="volume-value">{volume}%</span>
        </div>
        <button
          className="download-btn"
          onClick={handleDownload}
          disabled={!audioUrl}
        >
          ⬇ 下载
        </button>
      </div>
    </div>
  )
}

export default function TrackPanel() {
  const {
    isSeparated,
    vocalWaveform,
    accompanimentWaveform,
    vocalVolume,
    accompanimentVolume,
    duration,
    fileName,
    setVocalVolume,
    setAccompanimentVolume,
    file,
  } = useAudioStore()

  const baseName = fileName.replace(/\.mp3$/i, '')

  const vocalAudioUrl = file ? URL.createObjectURL(file) : undefined
  const accompaniomentAudioUrl = file ? URL.createObjectURL(file) : undefined

  if (!isSeparated) {
    return null
  }

  return (
    <div className="card">
      <h3 style={{ fontSize: '18px', fontWeight: '500', marginBottom: '20px' }}>
        分离结果
      </h3>
      <div className="track-panel">
        <TrackCard
          title="人声音轨"
          icon="🎤"
          iconClass="vocal"
          waveformData={vocalWaveform}
          audioUrl={vocalAudioUrl}
          duration={duration}
          volume={vocalVolume}
          onVolumeChange={setVocalVolume}
          color="#667eea"
          fileName={`${baseName}_人声.mp3`}
        />
        <TrackCard
          title="伴奏音轨"
          icon="🎹"
          iconClass="accompaniment"
          waveformData={accompanimentWaveform}
          audioUrl={accompaniomentAudioUrl}
          duration={duration}
          volume={accompanimentVolume}
          onVolumeChange={setAccompanimentVolume}
          color="#11998e"
          fileName={`${baseName}_伴奏.mp3`}
        />
      </div>
    </div>
  )
}
