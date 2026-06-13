import React, { useState, useRef, useCallback } from 'react';
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
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    draggedId: string | null;
    draggedIndex: number | null;
    targetIndex: number | null;
    dragSource: 'playlist' | 'library' | null;
  }>({
    isDragging: false,
    draggedId: null,
    draggedIndex: null,
    targetIndex: null,
    dragSource: null,
  });

  const listRef = useRef<HTMLDivElement>(null);

  const handleDragStart = useCallback((e: React.DragEvent, song: Song, index?: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData(
      'text/plain',
      JSON.stringify({ song, source: 'playlist', index })
    );
    setDragState({
      isDragging: true,
      draggedId: song.id,
      draggedIndex: index ?? null,
      targetIndex: index ?? null,
      dragSource: 'playlist',
    });
    const target = e.currentTarget as HTMLElement;
    requestAnimationFrame(() => {
      target.style.opacity = '0.4';
      target.style.transform = 'scale(0.95)';
    });
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '';
    target.style.transform = '';

    const { draggedIndex, targetIndex, dragSource } = dragState;

    if (dragSource === 'playlist' && draggedIndex !== null && targetIndex !== null && draggedIndex !== targetIndex) {
      const newSongs = [...songs];
      const [removed] = newSongs.splice(draggedIndex, 1);
      const insertIndex = targetIndex > draggedIndex ? targetIndex - 1 : targetIndex;
      newSongs.splice(insertIndex, 0, removed);
      onReorder(newSongs);
    }

    setDragState({
      isDragging: false,
      draggedId: null,
      draggedIndex: null,
      targetIndex: null,
      dragSource: null,
    });
  }, [dragState, songs, onReorder]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleCardDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragState.targetIndex !== index) {
      setDragState(prev => ({ ...prev, targetIndex: index }));
    }
  }, [dragState.targetIndex]);

  const handleCardDragLeave = useCallback((_e: React.DragEvent) => {
    // 可选：处理离开时的状态
  }, []);

  const handleListDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (data.source === 'library' && dragState.dragSource !== 'library') {
        setDragState(prev => ({
          ...prev,
          dragSource: 'library',
          isDragging: true,
          targetIndex: prev.targetIndex ?? songs.length,
        }));
      }
    } catch {
      // ignore
    }
  }, [songs.length, dragState.dragSource]);

  const handleListDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      const song: Song = data.song;
      const source = data.source;

      if (source === 'playlist') {
        const { draggedIndex, targetIndex } = dragState;
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

    setDragState({
      isDragging: false,
      draggedId: null,
      draggedIndex: null,
      targetIndex: null,
      dragSource: null,
    });
  }, [dragState, songs, onReorder, onSongDrop]);

  const handleCardDrop = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      const song: Song = data.song;
      const source = data.source;

      if (source === 'playlist') {
        const { draggedIndex } = dragState;
        if (draggedIndex !== null && draggedIndex !== index) {
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

    setDragState({
      isDragging: false,
      draggedId: null,
      draggedIndex: null,
      targetIndex: null,
      dragSource: null,
    });
  }, [dragState, songs, onReorder, onSongDrop]);

  const renderList = () => {
    if (songs.length === 0) {
      return (
        <div className={`playlist__empty ${dragState.isDragging ? 'playlist__empty--active' : ''}`}>
          <div className="playlist__empty-icon">🎵</div>
          <p className="playlist__empty-text">从右侧曲库拖拽歌曲到这里</p>
          <p className="playlist__empty-hint">开始创建你的专属播放列表</p>
        </div>
      );
    }

    const items: React.ReactNode[] = [];

    for (let i = 0; i < songs.length; i++) {
      const song = songs[i];
      const isDragged = dragState.draggedId === song.id;

      if (dragState.isDragging &&
          dragState.targetIndex === i &&
          dragState.draggedIndex !== i) {
        items.push(
          <div
            key={`placeholder-${i}`}
            className="playlist__drop-placeholder"
          >
            <div className="playlist__drop-placeholder-inner" />
          </div>
        );
      }

      const getCardWrapperStyle = () => {
        let transform = 'translateY(0)';
        let transition = 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)';

        if (dragState.isDragging && !isDragged && dragState.draggedIndex !== null && dragState.targetIndex !== null) {
          const di = dragState.draggedIndex;
          const ti = dragState.targetIndex;

          if (di < ti) {
            if (i > di && i < ti) {
              transform = 'translateY(-8px)';
            } else if (i === ti) {
              transform = 'translateY(-8px)';
            }
          } else if (di > ti) {
            if (i >= ti && i < di) {
              transform = 'translateY(8px)';
            }
          }
        }

        return { transform, transition };
      };

      items.push(
        <div
          key={song.id}
          className={`playlist-song-wrapper ${isDragged ? 'playlist-song-wrapper--dragging' : ''}`}
          style={getCardWrapperStyle()}
          onDragOver={(e) => handleCardDragOver(e, i)}
          onDragLeave={handleCardDragLeave}
          onDrop={(e) => handleCardDrop(e, i)}
        >
          <SongCard
            song={song}
            isPlaying={currentSong?.id === song.id && isPlaying}
            isDragging={isDragged}
            index={i}
            draggable={true}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onClick={onSongClick}
            showRemove={true}
            onRemove={onRemoveSong}
            animationDelay={i * 30}
          />
        </div>
      );
    }

    if (
      dragState.isDragging &&
      dragState.targetIndex === songs.length &&
      dragState.draggedIndex !== null &&
      dragState.draggedIndex < songs.length
    ) {
      items.push(
        <div
          key="placeholder-end"
          className="playlist__drop-placeholder playlist__drop-placeholder--bottom"
        >
          <div className="playlist__drop-placeholder-inner" />
        </div>
      );
    }

    return items;
  };

  const totalDuration = songs.reduce((acc, s) => acc + s.duration, 0);
  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}小时${mins}分`;
    return `${mins}分钟`;
  };

  return (
    <div
      className={`playlist ${dragState.isDragging ? 'playlist--dragging' : ''}`}
      ref={listRef}
      onDragOver={handleListDragOver}
      onDrop={handleListDrop}
    >
      <div className="playlist__header">
        <div className="playlist__header-left">
          <h2 className="playlist__title">{title}</h2>
          <div className="playlist__meta">
            <span className="playlist__count">{songs.length} 首歌曲</span>
            {songs.length > 0 && (
              <span className="playlist__duration">
                · {formatDuration(totalDuration)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="playlist__songs">{renderList()}</div>
    </div>
  );
};

export default Playlist;
