import React, { useState } from 'react';
import { Playlist, Song } from '../types';

interface PlaylistCardProps {
  playlist: Playlist;
  songs?: Song[];
  onLoad: (playlist: Playlist) => void;
  onDelete: (playlistId: string) => void;
}

const PlaylistCard: React.FC<PlaylistCardProps> = ({
  playlist,
  songs = [],
  onLoad,
  onDelete,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDeleting) return;

    setIsDeleting(true);
    setTimeout(() => {
      onDelete(playlist.id);
    }, 400);
  };

  const handleCardClick = () => {
    if (isDeleting) return;
    setIsExpanded(!isExpanded);
  };

  const handleLoad = (e: React.MouseEvent) => {
    e.stopPropagation();
    onLoad(playlist);
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
    } catch {
      return '';
    }
  };

  const covers = songs.slice(0, 4).map((s) => s.cover);
  const genreSet = new Set(songs.map((s) => s.genre));

  return (
    <div
      className={`playlist-card 
        ${isExpanded ? 'playlist-card--expanded' : ''}
        ${isDeleting ? 'playlist-card--deleting' : ''}
      `}
      onClick={handleCardClick}
    >
      <div className="playlist-card__header">
        <div className="playlist-card__covers">
          {covers.length > 0 ? (
            covers.map((cover, i) => (
              <span
                key={i}
                className="playlist-card__cover-item"
                style={{
                  transform: `translate(${i * 6}px, ${i * 4}px)`,
                  zIndex: 4 - i,
                }}
              >
                {cover}
              </span>
            ))
          ) : (
            <span className="playlist-card__cover-empty">📀</span>
          )}
        </div>
        <div className="playlist-card__info">
          <h4 className="playlist-card__name">{playlist.name}</h4>
          <p className="playlist-card__meta">
            {playlist.song_ids.length} 首歌曲
            {genreSet.size > 0 && (
              <span className="playlist-card__genres">
                {' · '}{[...genreSet].slice(0, 2).join(' / ')}
              </span>
            )}
          </p>
          <p className="playlist-card__date">创建于 {formatDate(playlist.created_at)}</p>
        </div>
        <button
          className="playlist-card__expand-btn"
          aria-label={isExpanded ? '收起' : '展开'}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      <div className={`playlist-card__content ${isExpanded ? 'playlist-card__content--open' : ''}`}>
        <div className="playlist-card__songs">
          {songs.length === 0 ? (
            <p className="playlist-card__empty">这个歌单还没有歌曲</p>
          ) : (
            <div className="playlist-card__song-list">
              {songs.map((song, i) => (
                <div key={song.id} className="playlist-card__song-item">
                  <span className="playlist-card__song-index">{i + 1}</span>
                  <span className="playlist-card__song-cover">{song.cover}</span>
                  <div className="playlist-card__song-info">
                    <span className="playlist-card__song-title">{song.title}</span>
                    <span className="playlist-card__song-artist">{song.artist}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="playlist-card__actions">
          <button className="playlist-card__action-btn playlist-card__action-btn--primary" onClick={handleLoad}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            加载歌单
          </button>
          <button className="playlist-card__action-btn playlist-card__action-btn--danger" onClick={handleDelete}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            删除歌单
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlaylistCard;
