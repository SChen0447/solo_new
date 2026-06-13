import React from 'react';
import { Song } from '../types';

interface SongCardProps {
  song: Song;
  isPlaying?: boolean;
  isDragging?: boolean;
  isPlaceholder?: boolean;
  index?: number;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, song: Song, index?: number) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, index?: number) => void;
  onClick?: (song: Song) => void;
  showRemove?: boolean;
  onRemove?: (songId: string) => void;
  animationDelay?: number;
}

const SongCard: React.FC<SongCardProps> = ({
  song,
  isPlaying = false,
  isDragging = false,
  isPlaceholder = false,
  index,
  draggable = true,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onClick,
  showRemove = false,
  onRemove,
  animationDelay = 0,
}) => {
  const handleDragStart = (e: React.DragEvent) => {
    if (onDragStart) {
      onDragStart(e, song, index);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (onDragOver) {
      onDragOver(e);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (onDrop) {
      onDrop(e, index);
    }
  };

  const handleClick = () => {
    if (onClick) {
      onClick(song);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRemove) {
      onRemove(song.id);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isPlaceholder) {
    return (
      <div className="song-card song-card--placeholder">
        <div className="song-card__placeholder-inner" />
      </div>
    );
  }

  return (
    <div
      className={`song-card ${isPlaying ? 'song-card--playing' : ''} ${isDragging ? 'song-card--dragging' : ''}`}
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div className="song-card__cover">
        <span className="song-card__cover-emoji">{song.cover}</span>
        {isPlaying && (
          <div className="song-card__playing-indicator">
            <span />
            <span />
            <span />
          </div>
        )}
      </div>
      <div className="song-card__info">
        <h4 className="song-card__title">{song.title}</h4>
        <p className="song-card__artist">{song.artist}</p>
        <span className="song-card__genre">{song.genre}</span>
      </div>
      <div className="song-card__duration">{formatDuration(song.duration)}</div>
      {showRemove && (
        <button className="song-card__remove" onClick={handleRemove}>
          ×
        </button>
      )}
    </div>
  );
};

export default SongCard;
