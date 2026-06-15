import { useEffect, useRef, useState } from 'react';
import { usePlaylistStore } from '@/store/playlistStore';
import { formatDuration } from '@/types';

export default function PlayerBar() {
  const {
    currentSong, currentPlaylist, currentIndex, isPlaying, playMode, progress,
    togglePlay, nextSong, prevSong, setPlayMode, setProgress,
  } = usePlaylistStore();

  const progressRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!isPlaying || !currentSong) return;
    const interval = setInterval(() => {
      if (!isDragging) {
        setProgress(Math.min(100, progress + (100 / (currentSong.duration || 200))));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, currentSong, progress, isDragging, setProgress]);

  useEffect(() => {
    if (currentSong && progress >= 100) {
      nextSong();
    }
  }, [progress, currentSong, nextSong]);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const percent = ((e.clientX - rect.left) / rect.width) * 100;
    setProgress(percent);
  };

  const playModeIcon = playMode === 'loop' ? '🔁' : '🔀';
  const playModeLabel = playMode === 'loop' ? '列表循环' : '随机播放';

  const currentTime = currentSong ? (progress / 100) * currentSong.duration : 0;

  return (
    <>
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 'var(--player-height)',
        background: 'rgba(18, 18, 18, 0.95)',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
      }}>
        <div style={{
          flex: '0 0 30%',
          minWidth: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          {currentSong ? (
            <>
              <img
                src={currentSong.cover}
                alt={currentSong.title}
                loading="lazy"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 'var(--radius-sm)',
                  objectFit: 'cover',
                  flexShrink: 0,
                  animation: isPlaying ? 'spin 8s linear infinite' : 'none',
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  marginBottom: 2,
                }}>
                  {currentSong.title}
                </div>
                <div style={{
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {currentSong.artist}
                </div>
              </div>
            </>
          ) : (
            <div style={{
              fontSize: 13,
              color: 'var(--text-muted)',
            }}>
              🎵 选择一首歌曲开始播放
            </div>
          )}
        </div>

        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          maxWidth: 600,
          margin: '0 auto',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              className="icon-btn"
              onClick={prevSong}
              title="上一首"
              style={{ fontSize: 16 }}
            >
              ⏮
            </button>
            <button
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: isPlaying ? 'var(--gradient-green)' : 'white',
                color: isPlaying ? 'white' : 'black',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                transition: 'all 0.2s var(--easing)',
                boxShadow: isPlaying ? '0 4px 16px rgba(29, 185, 84, 0.4)' : 'none',
              }}
              onClick={togglePlay}
              title={isPlaying ? '暂停' : '播放'}
              onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.92)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button
              className="icon-btn"
              onClick={nextSong}
              title="下一首"
              style={{ fontSize: 16 }}
            >
              ⏭
            </button>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            width: '100%',
          }}>
            <span style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              minWidth: 40,
              textAlign: 'right',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {formatDuration(Math.floor(currentTime))}
            </span>
            <div
              ref={progressRef}
              onClick={handleProgressClick}
              style={{
                flex: 1,
                height: 6,
                background: 'rgba(255, 255, 255, 0.12)',
                borderRadius: 3,
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                transition: 'height 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.height = '8px')}
              onMouseLeave={(e) => (e.currentTarget.style.height = '6px')}
            >
              <div style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: `${progress}%`,
                background: 'linear-gradient(90deg, var(--accent-start), var(--accent-end))',
                borderRadius: 3,
                transition: isDragging ? 'none' : 'width 0.3s ease',
              }} />
              <div style={{
                position: 'absolute',
                left: `calc(${progress}% - 6px)`,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: 'white',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
                opacity: progress > 2 ? 1 : 0,
                transition: 'opacity 0.2s ease',
              }} />
            </div>
            <span style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              minWidth: 40,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {currentSong ? formatDuration(currentSong.duration) : '0:00'}
            </span>
          </div>
        </div>

        <div style={{
          flex: '0 0 30%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 4,
        }}>
          {currentPlaylist && (
            <div style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              marginRight: 12,
              maxWidth: 120,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              曲目 {currentIndex + 1}/{currentPlaylist.songs.length}
            </div>
          )}
          <button
            className="icon-btn"
            onClick={() => setPlayMode(playMode === 'loop' ? 'shuffle' : 'loop')}
            title={playModeLabel}
            style={{
              fontSize: 16,
              color: playMode === 'shuffle' ? 'var(--accent)' : undefined,
            }}
          >
            {playModeIcon}
          </button>
        </div>
      </div>
    </>
  );
}
