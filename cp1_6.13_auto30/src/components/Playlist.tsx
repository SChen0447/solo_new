import React, { useState, useRef, useEffect } from 'react';
import { Song } from '../types';
import SongCard from './SongCard';

interface PlaylistProps {
  songs: Song[];
  title?: string;
  isDropTarget?: boolean;
  currentSong: Song | null;
  isPlaying: boolean;
  onSongClick: (song: Song) => void;
  onReorder: (songs: Song[]) => void;
  onSongDrop?: (song: Song) => void;
  onRemoveSong?: (songId: string) => void;
}

const Playlist: React.FC<PlaylistProps> = ({
  songs,
  title = '播放列表',
  isDropTarget = false,
  currentSong,
  isPlaying,
  onSongClick,
  onReorder,
  onSongDrop,
  onRemoveSong,
}) => {
  const [internalDragItem, setInternalDragItem] = useState<Song | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (e: React.DragEvent, song: Song, index?: number) => {
    setInternalDragItem(song);
    setDragIndex(index ?? null);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({ song, source: 'playlist' }));
  };

  const handleDragEnd = () => {
    setInternalDragItem(null);
    setDragIndex(null);
    setDropIndex(null);
    setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragOverList = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDropList = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      const song: Song = data.song;
      const source = data.source;

      if (source === 'playlist' && dragIndex !== null && dropIndex !== null) {
        const newSongs = [...songs];
        const [removed] = newSongs.splice(dragIndex, 1);
        newSongs.splice(dropIndex > dragIndex ? dropIndex - 1 : dropIndex, 0, removed);
        onReorder(newSongs);
      } else if (source === 'library' && onSongDrop) {
        onSongDrop(song);
      }
    } catch (err) {
      console.error('Drop error:', err);
    }

    setInternalDragItem(null);
    setDragIndex(null);
    setDropIndex(null);
  };

  const handleCardDragOver = (_e: React.DragEvent, index?: number) => {
    if (index !== undefined) {
      setDropIndex(index);
    }
  };

  const handleCardDrop = (e: React.DragEvent, index?: number) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      const song: Song = data.song;
      const source = data.source;

      if (source === 'playlist' && dragIndex !== null && index !== undefined) {
        const newSongs = [...songs];
        const [removed] = newSongs.splice(dragIndex, 1);
        const targetIndex = index > dragIndex ? index - 1 : index;
        newSongs.splice(targetIndex, 0, removed);
        onReorder(newSongs);
      } else if (source === 'library' && onSongDrop) {
        onSongDrop(song);
      }
    } catch (err) {
      console.error('Card drop error:', err);
    }

    setInternalDragItem(null);
    setDragIndex(null);
    setDropIndex(null);
    setIsDragOver(false);
  };

  return (
    <div
      className={`playlist ${isDragOver ? 'playlist--drag-over' : ''}`}
      ref={listRef}
      onDragOver={handleDragOverList}
      onDragLeave={handleDragLeave}
      onDrop={handleDropList}
    >
      <div className="playlist__header">
        <h2 className="playlist__title">{title}</h2>
        <span className="playlist__count">{songs.length} 首歌曲</span>
      </div>

      <div className="playlist__songs">
        {songs.length === 0 ? (
          <div className="playlist__empty">
            <p>拖拽歌曲到这里创建你的播放列表</p>
          </div>
        ) : (
          songs.map((song, index) => (
            <React.Fragment key={song.id}>
              {dropIndex === index && dragIndex !== index && (
                <div className="playlist__drop-indicator" />
              )}
              <SongCard
                song={song}
                isPlaying={currentSong?.id === song.id && isPlaying}
                isDragging={dragIndex === index}
                index={index}
                draggable={true}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={handleCardDragOver}
                onDrop={handleCardDrop}
                onClick={onSongClick}
                showRemove={true}
                onRemove={onRemoveSong}
                animationDelay={index * 30}
              />
            </React.Fragment>
          ))
        )}
        {dropIndex === songs.length && dragIndex !== null && (
          <div className="playlist__drop-indicator playlist__drop-indicator--bottom" />
        )}
      </div>

      {isDropTarget && isDragOver && (
        <div className="playlist__drop-hint">
          松开放置歌曲
        </div>
      )}
    </div>
  );
};

export default Playlist;
