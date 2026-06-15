import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { worksApi, Work } from '../services/api'
import MessageBoard from '../components/MessageBoard'
import { parseLyrics, LyricLine } from '../utils/lyrics'
import './WorkDetailPage.css'

export default function WorkDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [work, setWork] = useState<Work | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentLyricIndex, setCurrentLyricIndex] = useState(-1)
  const audioRef = useRef<HTMLAudioElement>(null)
  const lyricsContainerRef = useRef<HTMLDivElement>(null)
  const lyricLinesRef = useRef<LyricLine[]>([])

  useEffect(() => {
    if (work?.lyrics) {
      lyricLinesRef.current = parseLyrics(work.lyrics)
    }
  }, [work])

  useEffect(() => {
    const lines = lyricLinesRef.current
    if (lines.length === 0) {
      setCurrentLyricIndex(-1)
      return
    }

    let index = -1
    for (let i = lines.length - 1; i >= 0; i--) {
      if (currentTime >= lines[i].time) {
        index = i
        break
      }
    }
    setCurrentLyricIndex(index)
  }, [currentTime])

  useEffect(() => {
    if (lyricsContainerRef.current && currentLyricIndex >= 0) {
      const activeLine = lyricsContainerRef.current.querySelector(
        `.lyric-line:nth-child(${currentLyricIndex + 1})`
      ) as HTMLElement
      if (activeLine) {
        const container = lyricsContainerRef.current
        const containerHeight = container.clientHeight
        const lineTop = activeLine.offsetTop
        const lineHeight = activeLine.offsetHeight
        const scrollTop = lineTop - containerHeight / 2 + lineHeight / 2
        container.scrollTo({
          top: scrollTop,
          behavior: 'smooth'
        })
      }
    }
  }, [currentLyricIndex])

  const loadWork = useCallback(async () => {
    if (!id) return
    try {
      setIsLoading(true)
      const response = await worksApi.getById(id)
      setWork(response.data)
    } catch (error) {
      console.error('加载作品失败:', error)
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadWork()
  }, [loadWork])

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    const newTime = percent * duration
    audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  const handleEnded = () => {
    setIsPlaying(false)
    setCurrentTime(0)
  }

  const goBack = () => {
    navigate('/')
  }

  if (isLoading) {
    return <div className="loading">加载中...</div>
  }

  if (!work) {
    return <div className="loading">作品不存在</div>
  }

  const lyrics = lyricLinesRef.current

  return (
    <div className="work-detail-page">
      <button className="back-button" onClick={goBack}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        返回作品列表
      </button>

      <div className="work-detail-content">
        <div className="work-detail-cover">
          <img src={work.cover_url} alt={work.title} />
        </div>

        <div className="work-detail-info">
          <h1 className="work-detail-title">{work.title}</h1>
          <p className="work-detail-artist">{work.artist}</p>
        </div>

        <div className="lyrics-section">
          <h2 className="section-title">歌词</h2>
          <div className="lyrics-container" ref={lyricsContainerRef}>
            {lyrics.length > 0 ? (
              lyrics.map((line, index) => (
                <div
                  key={index}
                  className={`lyric-line ${index === currentLyricIndex ? 'active' : ''}`}
                >
                  {line.text || '　'}
                </div>
              ))
            ) : (
              <div className="no-lyrics">暂无歌词</div>
            )}
          </div>
        </div>

        <div className="comments-section">
          <h2 className="section-title">留言板</h2>
          <MessageBoard workId={work.id} />
        </div>
      </div>

      <div className="audio-player">
        <div className="player-cover">
          <img src={work.cover_url} alt={work.title} />
        </div>

        <div className="player-info">
          <div className="player-title">{work.title}</div>
          <div className="player-artist">{work.artist}</div>
        </div>

        <div className="player-controls">
          <button className="player-btn play-btn" onClick={togglePlay}>
            {isPlaying ? (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
        </div>

        <div className="player-progress">
          <span className="time-text">{formatTime(currentTime)}</span>
          <div className="progress-bar" onClick={handleSeek}>
            <div
              className="progress-fill"
              style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
            />
            <div
              className="progress-thumb"
              style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>
          <span className="time-text">{formatTime(duration)}</span>
        </div>

        <audio
          ref={audioRef}
          src={work.media_url}
          preload="none"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
        />
      </div>
    </div>
  )
}
