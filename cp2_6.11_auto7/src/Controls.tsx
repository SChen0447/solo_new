import React, { useState, useEffect, useRef, useCallback } from 'react';

interface ControlsProps {
  isPlaying: boolean;
  isLoaded: boolean;
  songName: string;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
}

const formatTime = (sec: number): string => {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export const Controls: React.FC<ControlsProps> = ({
  isPlaying, isLoaded, songName,
  currentTime, duration, volume, muted,
  onPlayPause, onSeek, onVolumeChange, onToggleMute
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState<number>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);
  const prevMutedRef = useRef(muted);

  useEffect(() => {
    const check = () => setIsNarrow(window.innerWidth < 560);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (muted && !prevMutedRef.current && navigator.vibrate) {
      try { navigator.vibrate(30); } catch (_) {}
    }
    prevMutedRef.current = muted;
  }, [muted]);

  const calcTimeFromPos = useCallback((clientX: number): number => {
    const el = progressRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return ratio * (duration || 0);
  }, [duration]);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isLoaded) return;
    const t = calcTimeFromPos(e.clientX);
    onSeek(t);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isLoaded) return;
    e.preventDefault();
    setIsDragging(true);
    setDragTime(calcTimeFromPos(e.clientX));

    const mm = (ev: MouseEvent) => {
      setDragTime(calcTimeFromPos(ev.clientX));
    };
    const mu = (ev: MouseEvent) => {
      const t = calcTimeFromPos(ev.clientX);
      onSeek(t);
      setIsDragging(false);
      setDragTime(null);
      window.removeEventListener('mousemove', mm);
      window.removeEventListener('mouseup', mu);
    };
    window.addEventListener('mousemove', mm);
    window.addEventListener('mouseup', mu);
  };

  const handleProgressHover = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isLoaded) return;
    const el = progressRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setHoverPos(e.clientX - rect.left);
    setHoverTime(calcTimeFromPos(e.clientX));
  };

  const progressPercent = isLoaded && duration > 0
    ? ((isDragging && dragTime !== null ? dragTime : currentTime) / duration) * 100
    : 0;

  return (
    <div className={`controls-bar ${isNarrow ? 'narrow' : ''}`}>
      <div className="controls-row-top">
        <div className="song-info" title={songName || '未选择歌曲'}>
          <div className="song-icon">
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path
                d="M9 18 V5 L19 3 V16"
                fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              />
              <circle cx="6" cy="18" r="3" fill="currentColor" />
              <circle cx="16" cy="16" r="3" fill="currentColor" />
            </svg>
          </div>
          <div className="song-name">
            {songName || '等待上传歌曲...'}
          </div>
        </div>

        {isNarrow ? (
          <button
            type="button"
            className={`btn-ripple hamburger-btn ${mobileMenuOpen ? 'open' : ''}`}
            onClick={() => setMobileMenuOpen(v => !v)}
            title="菜单"
          >
            <span /><span /><span />
          </button>
        ) : (
          <div className="controls-right-section">
            <VolumeControl
              volume={volume}
              muted={muted}
              onVolumeChange={onVolumeChange}
              onToggleMute={onToggleMute}
            />
          </div>
        )}
      </div>

      <div className="progress-container">
        <div
          ref={progressRef}
          className={`progress-track ${!isLoaded ? 'disabled' : ''}`}
          onClick={handleProgressClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleProgressHover}
          onMouseLeave={() => setHoverTime(null)}
        >
          <div className="progress-buffer" />
          <div className="progress-fill" style={{ width: `${progressPercent}%` }}>
            <div className="progress-fill-gradient" />
          </div>
          <div
            className="progress-thumb"
            style={{ left: `calc(${progressPercent}% - 8px)` }}
          />
          {hoverTime !== null && !isDragging && (
            <div className="progress-tooltip" style={{ left: `${hoverPos}px` }}>
              {formatTime(hoverTime)}
            </div>
          )}
          {isDragging && dragTime !== null && (
            <div
              className="progress-tooltip active"
              style={{ left: `${(dragTime / (duration || 1)) * (progressRef.current?.clientWidth || 0)}px` }}
            >
              {formatTime(dragTime)}
            </div>
          )}
        </div>
        <div className="time-display">
          <span>{formatTime(isDragging && dragTime !== null ? dragTime : currentTime)}</span>
          <span className="time-sep">/</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className={`controls-row-bottom ${isNarrow ? (mobileMenuOpen ? 'mobile-open' : 'mobile-closed') : ''}`}>
        <div className="play-controls">
          <button
            type="button"
            className={`btn-ripple play-btn ${isPlaying ? 'playing' : ''}`}
            onClick={onPlayPause}
            disabled={!isLoaded}
            title={isPlaying ? '暂停' : '播放'}
          >
            {isPlaying ? (
              <svg viewBox="0 0 24 24" width="28" height="28">
                <rect x="6" y="4" width="4" height="16" rx="1.5" fill="currentColor" />
                <rect x="14" y="4" width="4" height="16" rx="1.5" fill="currentColor" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="28" height="28">
                <path
                  d="M8 4 L20 12 L8 20 Z"
                  fill="currentColor"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        </div>

        {isNarrow ? (
          <div className="mobile-volume-wrap">
            <VolumeControl
              volume={volume}
              muted={muted}
              onVolumeChange={onVolumeChange}
              onToggleMute={onToggleMute}
              label="音量"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
};

interface VolumeProps {
  volume: number;
  muted: boolean;
  onVolumeChange: (v: number) => void;
  onToggleMute: () => void;
  label?: string;
}

const VolumeControl: React.FC<VolumeProps> = ({
  volume, muted, onVolumeChange, onToggleMute, label
}) => {
  const displayVolume = muted ? 0 : volume;

  const VolumeIcon = () => {
    if (muted || volume === 0) {
      return (
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path
            d="M5 9 L5 15 L10 15 L15 20 L15 4 L10 9 Z"
            fill="currentColor"
            stroke="currentColor" strokeWidth="0.5"
          />
          <path
            d="M18 8 L22 12 M22 8 L18 12"
            fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round"
          />
        </svg>
      );
    }
    if (volume < 0.5) {
      return (
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path
            d="M5 9 L5 15 L10 15 L15 20 L15 4 L10 9 Z"
            fill="currentColor"
            stroke="currentColor" strokeWidth="0.5"
          />
          <path
            d="M18 10 Q20 12 18 14"
            fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round"
          />
        </svg>
      );
    }
    return (
      <svg viewBox="0 0 24 24" width="20" height="20">
        <path
          d="M5 9 L5 15 L10 15 L15 20 L15 4 L10 9 Z"
          fill="currentColor"
          stroke="currentColor" strokeWidth="0.5"
        />
        <path
          d="M18 8 Q22 12 18 16"
          fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round"
        />
        <path
          d="M21 5 Q25 12 21 19"
          fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round"
          opacity="0.6"
        />
      </svg>
    );
  };

  return (
    <div className="volume-control-wrap">
      {label && <span className="volume-label">{label}</span>}
      <button
        type="button"
        className={`btn-ripple volume-icon-btn ${muted ? 'muted' : ''}`}
        onClick={onToggleMute}
        title={muted ? '取消静音' : '静音'}
      >
        <VolumeIcon />
      </button>
      <div className="volume-slider-container">
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={displayVolume}
          onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
          className="volume-slider"
          style={{
            background: `linear-gradient(to right,
              ${muted ? '#f87171' : '#06b6d4'} 0%,
              ${muted ? '#ef4444' : '#8b5cf6'} ${displayVolume * 100}%,
              rgba(139,92,246,0.18) ${displayVolume * 100}%,
              rgba(139,92,246,0.18) 100%)`
          }}
        />
      </div>
    </div>
  );
};
