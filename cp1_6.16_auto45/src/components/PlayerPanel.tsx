import { useEffect, useState, useCallback } from 'react'
import { useMusicStore } from '@/hooks/useAudioPlayer'
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react'

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export default function PlayerPanel() {
  const {
    currentTrack, isPlaying, volume, isMuted, currentTime, duration,
    togglePlay, playNext, playPrev, setVolume, toggleMute, setCurrentTime,
    visualizerMode, setVisualizerMode,
  } = useMusicStore()

  const [iconClass, setIconClass] = useState('')
  const [isDraggingVolume, setIsDraggingVolume] = useState(false)

  useEffect(() => {
    setIconClass(isPlaying ? 'spin-in' : 'spin-out')
    const t = setTimeout(() => setIconClass(''), 200)
    return () => clearTimeout(t)
  }, [isPlaying])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
    switch (e.code) {
      case 'Space': e.preventDefault(); togglePlay(); break
      case 'ArrowLeft': e.preventDefault(); playPrev(); break
      case 'ArrowRight': e.preventDefault(); playNext(); break
      case 'ArrowUp': e.preventDefault(); setVolume(Math.min(1, volume + 0.1)); break
      case 'ArrowDown': e.preventDefault(); setVolume(Math.max(0, volume - 0.1)); break
    }
  }, [togglePlay, playNext, playPrev, setVolume, volume])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const volumePercent = Math.round(volume * 100)

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      height: 64, background: '#282828', zIndex: 100,
      display: 'flex', alignItems: 'center', padding: '0 16px',
    }}>
      {/* Left: track info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 200, flex: '1 1 0' }}>
        <img
          key={currentTrack?.id}
          src={currentTrack?.coverUrl || ''}
          alt="cover"
          style={{
            width: 50, height: 50, borderRadius: 8, objectFit: 'cover',
            transition: 'opacity 0.3s ease',
          }}
        />
        <div style={{ overflow: 'hidden' }}>
          <div style={{ color: '#fff', fontWeight: 'bold', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
            {currentTrack?.title || 'No track'}
          </div>
          <div style={{ color: '#999', fontSize: 13, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
            {currentTrack?.artist || '—'}
          </div>
        </div>
      </div>

      {/* Center: controls & progress */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '2 1 0', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <SkipBack size={18} color="#fff" style={{ cursor: 'pointer' }} onClick={playPrev} />
          <button
            onClick={togglePlay}
            className={iconClass}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'transform 0.2s ease',
            }}
          >
            {isPlaying ? <Pause size={24} color="#fff" /> : <Play size={24} color="#fff" />}
          </button>
          <SkipForward size={18} color="#fff" style={{ cursor: 'pointer' }} onClick={playNext} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', maxWidth: 480 }}>
          <span style={{ color: '#aaa', fontSize: 11, minWidth: 36, textAlign: 'right' }}>{formatTime(currentTime)}</span>
          <input
            type="range" min={0} max={100} value={progress}
            onChange={e => {
              const t = (Number(e.target.value) / 100) * duration
              setCurrentTime(t)
            }}
            title={formatTime(currentTime)}
            style={{
              flex: 1, height: 4, appearance: 'none', background: 'transparent', cursor: 'pointer',
            }}
            className="player-progress"
          />
          <span style={{ color: '#aaa', fontSize: 11, minWidth: 36 }}>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Right: volume & visualizer toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 200, flex: '1 1 0', justifyContent: 'flex-end' }}>
        <span style={{ color: '#aaa', fontSize: 11, minWidth: 30, textAlign: 'center' }}>
          {isDraggingVolume ? `${volumePercent}%` : ''}
        </span>
        {isMuted ? (
          <VolumeX size={18} color="#ef4444" style={{ cursor: 'pointer' }} onClick={toggleMute} />
        ) : (
          <Volume2 size={18} color="#fff" style={{ cursor: 'pointer' }} onClick={toggleMute} />
        )}
        <input
          type="range" min={0} max={100} value={isMuted ? 0 : volumePercent}
          onMouseDown={() => setIsDraggingVolume(true)}
          onMouseUp={() => setIsDraggingVolume(false)}
          onChange={e => setVolume(Number(e.target.value) / 100)}
          style={{ width: 80, height: 4, appearance: 'none', background: 'transparent', cursor: 'pointer' }}
          className="player-volume"
        />
        <button
          onClick={() => setVisualizerMode(visualizerMode === 'bars' ? 'waveform' : 'bars')}
          style={{
            background: 'none', border: '1px solid #555', borderRadius: 4,
            color: '#ccc', fontSize: 11, padding: '2px 8px', cursor: 'pointer',
          }}
        >
          {visualizerMode === 'bars' ? 'Bars' : 'Wave'}
        </button>
      </div>

      <style>{`
        .spin-in { transform: rotate(0deg); }
        .spin-out { transform: rotate(-90deg); }
        .player-progress::-webkit-slider-runnable-track {
          height: 4px; border-radius: 2px;
          background: linear-gradient(to right, #4F46E5, #7B2FF7) ${progress}%, #4a4a4a ${progress}%;
        }
        .player-progress::-webkit-slider-thumb {
          appearance: none; width: 12px; height: 12px; border-radius: 50%;
          background: #fff; margin-top: -4px; cursor: pointer;
        }
        .player-volume::-webkit-slider-runnable-track {
          height: 4px; border-radius: 2px;
          background: linear-gradient(to right, #4F46E5, #7B2FF7) ${isMuted ? 0 : volumePercent}%, #4a4a4a ${isMuted ? 0 : volumePercent}%;
        }
        .player-volume::-webkit-slider-thumb {
          appearance: none; width: 10px; height: 10px; border-radius: 50%;
          background: #fff; margin-top: -3px; cursor: pointer;
        }
      `}</style>
    </div>
  )
}
