import React, { useState, useRef } from 'react';
import { Song } from '../types';
import SongCard from './SongCard';

interface PlaylistProps {
  songs: Song[];
  title?: string;
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
  currentSong,
  isPlaying,
  onSongClick,
  onReorder,
  onSongDrop,
  onRemoveSong,
}) => {
  const [dragInfo, setDragInfo] = useState<{
    isDragging: boolean;
    draggedSong: Song | null;
    draggedIndex: number | null;
    targetIndex: number | null;
  }>({
    isDragging: false,
    draggedSong: null,
    draggedIndex: null,
    targetIndex: null,
  });

  const listRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (e: React.DragEvent, song: Song, index?: number) => {
    setDragInfo({
      isDragging: true,
      draggedSong: song,
      draggedIndex: index ?? null,
      targetIndex: index ?? null,
    });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData(
      'text/plain',
      JSON.stringify({ song, source: 'playlist', index })
    );
    const target = e.currentTarget as HTMLElement;
    setTimeout(() => {
      target.classList.add('song-card--dragging-real');
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.classList.remove('song-card--dragging-real');

    const { draggedIndex, targetIndex } = dragInfo;

    if (draggedIndex !== null && targetIndex !== null && draggedIndex !== targetIndex) {
      const newSongs = [...songs];
      const [removed] = newSongs.splice(draggedIndex, 1);
      const insertIndex = targetIndex > draggedIndex ? targetIndex - 1 : targetIndex;
      newSongs.splice(insertIndex, 0, removed);
      onReorder(newSongs);
    }

    setDragInfo({
      isDragging: false,
      draggedSong: null,
      draggedIndex: null,
      targetIndex: null,
    });
  };

  const handleDragOver = (e: React.DragEvent, index?: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (index !== undefined && index !== dragInfo.targetIndex) {
      setDragInfo((prev) => ({ ...prev, targetIndex: index }));
    }
  };

  const handleListDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleListDrop = (e: React.DragEvent) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      const song: Song = data.song;
      const source = data.source;

      if (source === 'playlist') {
        const { draggedIndex, targetIndex } = dragInfo;
        if (draggedIndex !== null && targetIndex !== null && draggedIndex !== targetIndex) {
          const newSongs = [...songs];
          const [removed] = newSongs.splice(draggedIndex, 1);
          const insertIndex = targetIndex > draggedIndex ? targetIndex - 1 : targetIndex;
          newSongs.splice(insertIndex, 0, removed);
          onReorder(newSongs);
        }
      } else if (source === 'library' && onSongDrop) {
        onSongDrop(song);
      }
    } catch (err) {
      console.error('Drop error:', err);
    }

    setDragInfo({
      isDragging: false,
      draggedSong: null,
      draggedIndex: null,
      targetIndex: null,
    });
  };

  const handleCardDrop = (e: React.DragEvent, index?: number) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      const song: Song = data.song;
      const source = data.source;

      if (source === 'playlist') {
        const { draggedIndex } = dragInfo;
        if (draggedIndex !== null && index !== undefined && draggedIndex !== index) {
          const newSongs = [...songs];
          const [removed] = newSongs.splice(draggedIndex, 1);
          const insertIndex = index > draggedIndex ? index - 1 : index;
          newSongs.splice(insertIndex, 0, removed);
          onReorder(newSongs);
        }
      } else if (source === 'library' && onSongDrop) {
        onSongDrop(song);
      }
    } catch (err) {
      console.error('Card drop error:', err);
    }

    setDragInfo({
      isDragging: false,
      draggedSong: null,
      draggedIndex: null,
      targetIndex: null,
    });
  };

  const renderSongList = () => {
    if (songs.length === 0) {
      return (
        <div className="playlist__empty">
          <div className="playlist__empty-icon">🎵</div>
          <p>从右侧曲库拖拽歌曲到这里</p>
          <p className="playlist__empty-hint">开始创建你的专属播放列表</p>
        </div>
      );
    }

    const result: React.ReactNode[] = [];
    songs.forEach((song, index) => {
      if (dragInfo.isDragging && dragInfo.targetIndex === index && dragInfo.draggedIndex !== index) {
        result.push(
          <div
            key={`placeholder-${index}`}
            className={`playlist__placeholder ${dragInfo.draggedIndex !== null && dragInfo.draggedIndex !== index ? 'playlist__placeholder--bounce' : ''}`}
          />
        );
      }

      const isShifted =
        dragInfo.isDragging &&
        dragInfo.draggedIndex !== null &&
        dragInfo.targetIndex !== null &&
        ((dragInfo.targetIndex > dragInfo.draggedIndex &&
          index > dragInfo.draggedIndex &&
          index < dragInfo.targetIndex) ||
          (dragInfo.targetIndex < dragInfo.draggedIndex &&
            index >= dragInfo.targetIndex &&
            index < dragInfo.draggedIndex));

      result.push(
        <div
          key={song.id}
          className={`playlist__song-wrapper ${isShifted ? 'playlist__song-wrapper--shifted' : ''}`}
        >
          <SongCard
            song={song}
            isPlaying={currentSong?.id === song.id && isPlaying}
            isDragging={dragInfo.draggedIndex === index}
            index={index}
            draggable={true}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleCardDrop(e, index)}
            onClick={onSongClick}
            showRemove={true}
            onRemove={onRemoveSong}
            animationDelay={index * 30}
          />
        </div>
      );
    });

    if (
      dragInfo.isDragging &&
      dragInfo.targetIndex === songs.length &&
      dragInfo.draggedIndex !== null &&
      dragInfo.draggedIndex < songs.length
    ) {
      result.push(
        <div
          key={`placeholder-end`}
          className="playlist__placeholder playlist__placeholder--bottom"
        />
      );
    }

    return result;
  };

  const totalDuration = songs.reduce((acc, song) => acc + song.duration, 0);
  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}小时${mins}分钟`;
    return `${mins}分钟`;
  };

  return (
    <div
      className={`playlist ${dragInfo.isDragging ? 'playlist--dragging' : ''}`}
      ref={listRef}
      onDragOver={handleListDragOver}
      onDrop={handleListDrop}
    >
      <div className="playlist__header">
        <div className="playlist__header-left">
          <h2 className="playlist__title">{title}</h2>
          <span className="playlist__count">{songs.length} 首歌曲</span>
          {songs.length > 0 && (
            <span className="playlist__duration">
              总时长: {formatDuration(totalDuration)}
            </span>
          )}
        </div>
      </div>

      <div className="playlist__songs">{renderSongList()}</div>
    </div>
  );
};

export default Playlist;
