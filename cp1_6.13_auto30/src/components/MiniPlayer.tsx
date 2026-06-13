import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Song } from '../types';

interface MiniPlayerProps {
  song: Song | null;
  isPlaying: boolean;
  onPlayPause: () => void;
  onStop: () => void;
  playDuration?: number;
}

const MiniPlayer: React.FC<MiniPlayerProps> = ({
  song,
  isPlaying,
  onPlayPause,
  onStop,
  playDuration = 5,
}) => {
  const [progress, setProgress] = useState(0);
  const displayTime = useRef(0);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedProgressRef = useRef<number>(0);

  const duration = playDuration * 1000;

  const animate = useCallback((timestamp: number) => {
    const elapsed = timestamp - startTimeRef.current;
    const currentProgress = Math.min((pausedProgressRef.current + elapsed) / duration;
    const pct = Math.min(currentProgress * 100, 100);
    setProgress(pct);
    displayTime.current = Math.min(pausedProgressRef.current + elapsed, duration);

    if (currentProgress < 1) {
      rafRef.current = requestAnimationFrame(animate);
    } else {
      onStop();
    }
  }, [duration, onStop]);

  useEffect(() => {
    if (isPlaying && song) {
      startTimeRef.current = performance.now();
      rafRef.current = requestAnimationFrame(animate);
    } else {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
        if (song) {
          pausedProgressRef.current = displayTime.current;
        }
      }
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isPlaying, song, animate]);

  useEffect(() => {
    setProgress(0);
    displayTime.current = 0;
    pausedProgressRef.current = 0;
    startTimeRef.current = 0;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, [song?.id]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const currentSeconds = Math.floor((progress / 100) * playDuration);

  if (!song) return null;

  return (
    <div className={`mini-player ${isPlaying ? 'mini-player--active' : ''}`}>
      <div className="mini-player__progress-wrap">
        <div className="mini-player__progress-track">
          <div
            className="mini-player__progress-bar"
            style={{ width: `${progress}%` }}
          >
            <div className="mini-player__progress-glow" />
          </div>
          <div
            className="mini-player__progress-thumb"
            style={{ left: `calc(${progress}% - 6px)` }}
          />
        </div>
        <div className="mini-player__time-info">
          <span className="mini-player__time-current">
            {formatTime(displayTime.current)}
          </span>
          <span className="mini-player__time-total">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      <div className="mini-player__main">
        <div className="mini-player__cover">
          <span className="mini-player__cover-emoji">{song.cover}</span>
          {isPlaying && (
            <div className="mini-player__cover-overlay">
              <div className="mini-player__visualizer">
                <span style={{ animationDelay: '0s' }} />
                <span style={{ animationDelay: '0.1s' }} />
                <span style={{ animationDelay: '0.2s' }} />
                <span style={{ animationDelay: '0.3s' }} />
                <span style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          )}
        </div>

        <div className="mini-player__info">
          <div className="mini-player__title">{song.title}</div>
          <div className="mini-player__artist">
            {song.artist}
            <span className="mini-player__sep">·</span>
            {song.album}
          </div>
          <span className="mini-player__genre">{song.genre}</span>
        </div>

        <div className="mini-player__controls">
          <button
            className="mini-player__btn mini-player__btn--prev"
            onClick={onStop}
            title="停止"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          </button>
          <button
            className="mini-player__btn mini-player__btn--play-main"
            onClick={onPlayPause}
            title={isPlaying ? '暂停' : '播放'}
          >
            {isPlaying ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          <button
            className="mini-player__btn mini-player__btn--next"
            onClick={onStop}
            title="下一首"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MiniPlayer;
