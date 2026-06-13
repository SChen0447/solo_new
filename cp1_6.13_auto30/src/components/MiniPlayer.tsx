import React, { useState, useEffect, useRef } from 'react';
import { Song } from '../types';

interface MiniPlayerProps {
  song: Song | null;
  isPlaying: boolean;
  onPlayPause: () => void;
  onStop: () => void;
}

const MiniPlayer: React.FC<MiniPlayerProps> = ({
  song,
  isPlaying,
  onPlayPause,
  onStop,
}) => {
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const animationRef = useRef<number | null>(null);
  const duration = song?.duration || 5;
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);

  useEffect(() => {
    setProgress(0);
    setCurrentTime(0);
    startTimeRef.current = 0;
    pausedAtRef.current = 0;
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, [song?.id]);

  useEffect(() => {
    if (isPlaying && song) {
      const durationMs = Math.min(duration, 5) * 1000;
      startTimeRef.current = performance.now() - pausedAtRef.current;

      const animate = (now: number) => {
        const elapsed = now - startTimeRef.current;
        const percent = Math.min(elapsed / durationMs, 1);
        setProgress(percent * 100);
        setCurrentTime(Math.min((now - startTimeRef.current) / 1000, displayDuration));

        if (percent < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          onStop();
        }
      };

      animationRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          pausedAtRef.current = performance.now() - startTimeRef.current;
        }
      };
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
  }, [isPlaying, song, duration, onStop]);

  const formatTime = (seconds: number) => {
    const secs = Math.floor(seconds);
    const s = secs % 60;
    const m = Math.floor(secs / 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const displayDuration = Math.min(duration, 5);

  if (!song) return null;

  return (
    <div className={`mini-player ${isPlaying ? 'mini-player--visible' : ''}`}>
      <div className="mini-player__progress-container">
        <div
          className="mini-player__progress-bg"
        >
          <div
            className="mini-player__progress-fill"
            style={{ width: `${progress}%` }}
        >
          <div className="mini-player__progress-shine" />
          </div>
          <div
            className="mini-player__progress-thumb"
            style={{ left: `${progress}%` }}
          />
        </div>
        <div className="mini-player__time">
          <span className="mini-player__time-current">
            {formatTime(currentTime)}
          </span>
          <span className="mini-player__time-separator">/</span>
          <span className="mini-player__time-total">
            {formatTime(displayDuration)}
          </span>
        </div>
      </div>

      <div className="mini-player__content">
        <div className="mini-player__cover">
          <span className="mini-player__cover-emoji">{song.cover}</span>
          {isPlaying && (
            <div className="mini-player__cover-overlay">
              <div className="mini-player__equalizer">
                <span />
                <span />
                <span />
                <span />
              </div>
            </div>
          )}
        </div>

        <div className="mini-player__info">
          <div className="mini-player__title">{song.title}</div>
          <div className="mini-player__artist">{song.artist}</div>
          <div className="mini-player__album">
            <span className="mini-player__genre-tag">{song.genre}</span>
            {song.album}
          </div>
        </div>

        <div className="mini-player__controls">
          <button
            className="mini-player__btn mini-player__btn--sm"
            title="上一首"
            onClick={onStop}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
            </svg>
          </button>

          <button
            className={`mini-player__btn mini-player__btn--play ${isPlaying ? 'mini-player__btn--playing' : ''}`}
            onClick={onPlayPause}
            title={isPlaying ? '暂停' : '播放'}
          >
            {isPlaying ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <button
            className="mini-player__btn mini-player__btn--sm"
            title="停止"
            onClick={onStop}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 4h12v16H6z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MiniPlayer;
