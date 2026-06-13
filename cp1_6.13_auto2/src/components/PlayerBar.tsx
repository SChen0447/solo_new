import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Music, Volume2 } from 'lucide-react';
import { useStore } from '../store';
import { formatDuration } from '../types';
import styles from './PlayerBar.module.css';
import clsx from 'clsx';

export const PlayerBar: React.FC = () => {
  const currentSong = useStore((s) => s.currentSong);
  const isPlaying = useStore((s) => s.isPlaying);
  const togglePlay = useStore((s) => s.togglePlay);
  const playProgress = useStore((s) => s.playProgress);
  const setPlayProgress = useStore((s) => s.setPlayProgress);

  const [key, setKey] = useState(0);
  const progressRef = useRef<HTMLDivElement>(null);
  const animationStartedRef = useRef(false);

  const duration = currentSong?.duration || 0;
  const currentTime = (playProgress / 100) * duration;

  useEffect(() => {
    if (currentSong && isPlaying) {
      setKey((k) => k + 1);
      animationStartedRef.current = true;
    }
  }, [currentSong]);

  useEffect(() => {
    if (!currentSong) {
      setPlayProgress(0);
      return;
    }

    if (!isPlaying) return;

    let startTime: number | null = null;
    let rafId: number;
    const totalDuration = currentSong.duration * 1000;
    const initialProgress = playProgress;

    const updateProgress = (timestamp: number) => {
      if (startTime === null) {
        startTime = timestamp - (initialProgress / 100) * totalDuration;
      }
      const elapsed = timestamp - startTime;
      const progress = Math.min(100, (elapsed / totalDuration) * 100);
      setPlayProgress(progress);

      if (progress < 100 && isPlaying) {
        rafId = requestAnimationFrame(updateProgress);
      }
    };

    rafId = requestAnimationFrame(updateProgress);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [isPlaying, currentSong, setPlayProgress]);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!currentSong || !progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const percent = ((e.clientX - rect.left) / rect.width) * 100;
    setPlayProgress(Math.max(0, Math.min(100, percent)));
  };

  const progressFillStyle: React.CSSProperties = {
    width: `${playProgress}%`,
  };

  return (
    <div className={styles.playerBar}>
      <div
        ref={progressRef}
        className={styles.progressTrack}
        onClick={handleProgressClick}
      >
        <div
          className={clsx(styles.progressFill, {
            [styles.animated]: isPlaying && animationStartedRef.current,
            [styles.paused]: !isPlaying,
          })}
          key={key}
          style={progressFillStyle}
        >
          <div className={styles.progressHandle} />
        </div>
      </div>

      <div className={styles.playerContent}>
        <div className={styles.songInfo}>
          {currentSong ? (
            <>
              <div className={styles.songCover}>
                <Music size={18} color="rgba(255,255,255,0.9)" />
              </div>
              <div className={styles.songText}>
                <div className={styles.songName}>{currentSong.name}</div>
                <div className={styles.songArtist}>{currentSong.artist}</div>
              </div>
            </>
          ) : (
            <div className={styles.noSong}>
              <Music size={18} />
              <span>点击歌曲开始播放</span>
            </div>
          )}
        </div>

        <div className={styles.controls}>
          <button className={styles.ctrlBtn} aria-label="上一首">
            <SkipBack size={18} />
          </button>
          <button
            className={styles.playBtn}
            onClick={togglePlay}
            disabled={!currentSong}
            aria-label={isPlaying ? '暂停' : '播放'}
          >
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
          </button>
          <button className={styles.ctrlBtn} aria-label="下一首">
            <SkipForward size={18} />
          </button>
          <button className={styles.ctrlBtn} aria-label="音量">
            <Volume2 size={18} />
          </button>
        </div>

        <div className={styles.timeDisplay}>
          {currentSong
            ? `${formatDuration(currentTime)} / ${formatDuration(duration)}`
            : '--:-- / --:--'}
        </div>
      </div>
    </div>
  );
};

export default PlayerBar;
