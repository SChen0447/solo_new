import { useRef, useEffect } from 'react'
import { useStore } from '../store'

export default function Player() {
  const { currentTrack, isPlaying, currentTime, duration, setPlaying, setCurrentTime, setDuration } = useStore()
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return

    if (isPlaying) {
      audio.play().catch(() => {})
    } else {
      audio.pause()
    }
  }, [isPlaying, currentTrack])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
    const handleLoadedMetadata = () => setDuration(audio.duration)
    const handleEnded = () => setPlaying(false)

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [setCurrentTime, setDuration, setPlaying])

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00'
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    audio.currentTime = percent * duration
  }

  const togglePlay = () => {
    if (!currentTrack) return
    setPlaying(!isPlaying)
  }

  if (!currentTrack) {
    return null
  }

  const progressPercent = duration ? (currentTime / duration) * 100 : 0

  return (
    <>
      <audio ref={audioRef} src={currentTrack.audioUrl} preload="metadata" />
      <div style={styles.player}>
        <div style={styles.coverWrap}>
          <img src={currentTrack.cover} alt={currentTrack.title} style={styles.cover} />
        </div>
        <div style={styles.info}>
          <div style={styles.title}>{currentTrack.title}</div>
          <div style={styles.artist}>{currentTrack.artist}</div>
        </div>
        <button style={styles.playBtn} onClick={togglePlay}>
          {isPlaying ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="8,5 19,12 8,19" />
            </svg>
          )}
        </button>
        <div style={styles.progressWrap}>
          <span style={styles.time}>{formatTime(currentTime)}</span>
          <div style={styles.progressBar} onClick={handleProgressClick}>
            <div style={{ ...styles.progressFill, width: `${progressPercent}%` }} />
          </div>
          <span style={styles.time}>{formatTime(duration)}</span>
        </div>
      </div>
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
        .play-btn:active {
          animation: bounce 0.2s ease-out;
        }
      `}</style>
    </>
  )
}

const styles: Record<string, React.CSSProperties> = {
  player: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: 72,
    background: 'white',
    boxShadow: '0 -4px 12px rgba(0,0,0,0.08)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 24px',
    gap: 16,
    zIndex: 50
  },
  coverWrap: {
    width: 48,
    height: 48,
    borderRadius: 8,
    overflow: 'hidden',
    flexShrink: 0,
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  cover: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  info: {
    minWidth: 120,
    flexShrink: 0
  },
  title: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-color)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  artist: {
    fontSize: 12,
    color: 'var(--text-light)',
    marginTop: 2
  },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: 'var(--primary-color)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'transform 0.2s ease-out'
  },
  progressWrap: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 12
  },
  progressBar: {
    flex: 1,
    height: 4,
    background: 'var(--secondary-color)',
    borderRadius: 2,
    cursor: 'pointer',
    position: 'relative'
  },
  progressFill: {
    height: '100%',
    background: 'var(--primary-color)',
    borderRadius: 2,
    transition: 'width 0.1s linear'
  },
  time: {
    fontSize: 12,
    color: 'var(--text-light)',
    minWidth: 40,
    textAlign: 'center'
  }
}
