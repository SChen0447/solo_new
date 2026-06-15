import { Link } from 'react-router-dom';
import { Playlist, MOOD_CONFIG, formatRelativeTime } from '@/types';
import { usePlaylistStore } from '@/store/playlistStore';
import { useRef, useEffect, useState } from 'react';

interface PlaylistCardProps {
  playlist: Playlist;
  showStats?: boolean;
}

export default function PlaylistCard({ playlist, showStats = true }: PlaylistCardProps) {
  const { playSong, likePlaylist, toggleFavorite } = usePlaylistStore();
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgVisible, setImgVisible] = useState(false);

  useEffect(() => {
    if (!imgRef.current || typeof IntersectionObserver === 'undefined') {
      setImgVisible(true);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setImgVisible(true);
          observer.disconnect();
        }
      });
    }, { rootMargin: '100px' });
    observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, []);

  const moodInfo = MOOD_CONFIG[playlist.mood];

  const handleLikeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    likePlaylist(playlist.id);
  };

  const handleFavClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite('playlist', playlist.id);
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (playlist.songs.length > 0) {
      playSong(playlist.songs[0], playlist, 0);
    }
  };

  return (
    <Link
      to={`/playlist/${playlist.id}`}
      style={{
        display: 'block',
        textDecoration: 'none',
        color: 'inherit',
        background: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        transition: 'all 0.3s var(--easing)',
        cursor: 'pointer',
        boxShadow: 'var(--shadow-sm)',
        willChange: 'transform, box-shadow',
        position: 'relative',
        ':hover': {},
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-hover)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
      }}
    >
      <div
        ref={imgRef}
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16 / 10',
          background: 'linear-gradient(135deg, #2a2a2a, #1a1a1a)',
          overflow: 'hidden',
        }}
      >
        {imgVisible ? (
          <img
            src={playlist.cover}
            alt={playlist.name}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: imgLoaded ? 1 : 0,
              transition: 'opacity 0.5s ease, transform 0.5s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
              setImgLoaded(true);
            }}
          />
        ) : null}
        
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'var(--gradient-green)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            boxShadow: '0 4px 16px rgba(29, 185, 84, 0.4)',
            transform: 'translateY(20px)',
            opacity: 0,
            transition: 'all 0.3s var(--easing)',
            cursor: 'pointer',
            zIndex: 10,
          }}
          onClick={handlePlayClick}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
          }}
          className="play-btn-overlay"
        >
          ▶
        </div>
        <style>{`
          a:hover .play-btn-overlay { transform: translateY(0) !important; opacity: 1 !important; }
        `}</style>
      </div>

      <div style={{ padding: 14 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
          gap: 8,
        }}>
          <span className="tag tag-accent" style={{ fontSize: 11 }}>
            {moodInfo?.emoji} {moodInfo?.label}
          </span>
          {playlist.scene && (
            <span className="tag tag-muted" style={{ fontSize: 11 }}>
              {playlist.scene === 'workout' ? '🏃 运动' :
               playlist.scene === 'study' ? '📚 学习' :
               playlist.scene === 'party' ? '🎉 派对' : '🌙 睡前'}
            </span>
          )}
        </div>

        <h3 style={{
          fontSize: 15,
          fontWeight: 600,
          color: 'var(--text-primary)',
          margin: '0 0 6px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          lineHeight: 1.3,
        }}>
          {playlist.name}
        </h3>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{
            fontSize: 12,
            color: 'var(--text-muted)',
          }}>
            🎵 {playlist.songs.length} 首歌曲
          </span>
          <span style={{
            fontSize: 11,
            color: 'var(--text-muted)',
          }}>
            {formatRelativeTime(playlist.createdAt)}
          </span>
        </div>

        {showStats && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginTop: 12,
            paddingTop: 12,
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          }}>
            <button
              onClick={handleLikeClick}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                color: playlist.isLiked ? 'var(--accent)' : 'var(--text-muted)',
                padding: 0,
                transition: 'color 0.2s ease',
              }}
            >
              <span style={{ fontSize: 14 }}>{playlist.isLiked ? '❤️' : '🤍'}</span>
              {playlist.likes}
            </button>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              color: 'var(--text-muted)',
            }}>
              <span style={{ fontSize: 14 }}>💬</span>
              {playlist.comments?.length || 0}
            </span>
            <span style={{ flex: 1 }} />
            <button
              onClick={handleFavClick}
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                color: playlist.isFavorited ? 'var(--accent)' : 'var(--text-muted)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.transform = 'scale(1.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {playlist.isFavorited ? '⭐' : '☆'}
            </button>
          </div>
        )}
      </div>
    </Link>
  );
}
