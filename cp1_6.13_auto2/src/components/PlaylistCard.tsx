import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Music, Play, Plus, Palette, Clock, Disc3 } from 'lucide-react';
import type { Song, Playlist } from '../types';
import { formatDuration, formatTotalDuration, generateId } from '../types';
import { useDragSort } from '../hooks/useDragSort';
import { useStore, gradientPresets } from '../store';
import styles from './PlaylistCard.module.css';
import clsx from 'clsx';

interface PlaylistCardProps {
  playlist: Playlist;
}

export const PlaylistCard: React.FC<PlaylistCardProps> = ({ playlist }) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSong, setNewSong] = useState({ name: '', artist: '', duration: '' });
  const colorPickerRef = useRef<HTMLDivElement>(null);

  const currentSong = useStore((s) => s.currentSong);
  const setCurrentSong = useStore((s) => s.setCurrentSong);
  const addSong = useStore((s) => s.addSong);
  const updatePlaylistColor = useStore((s) => s.updatePlaylistColor);
  const reorderSongs = useStore((s) => s.reorderSongs);
  const addToMainList = useStore((s) => s.addToMainList);

  const { dragState, startDrag, onDrag, endDrag, registerItem } = useDragSort(
    playlist.songs,
    `playlist-${playlist.id}`,
    (from, to) => reorderSongs(playlist.id, from, to),
    (song) => addToMainList(song)
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleColorSelect = (color: string) => {
    updatePlaylistColor(playlist.id, color);
  };

  const handleSongClick = (song: Song) => {
    if (dragState.isDragging) return;
    setCurrentSong(song);
  };

  const handleAddSong = () => {
    if (!newSong.name.trim()) return;
    const duration = parseInt(newSong.duration) || 180;
    addSong(playlist.id, {
      id: generateId(),
      name: newSong.name.trim(),
      artist: newSong.artist.trim() || '未知歌手',
      duration,
    });
    setNewSong({ name: '', artist: '', duration: '' });
    setShowAddModal(false);
  };

  const isPlayingSong = (song: Song) => currentSong?.id === song.id;

  const cardStyle = {
    '--card-gradient': playlist.gradientColor,
  } as React.CSSProperties;

  return (
    <>
      <motion.div
        className={styles.card}
        style={cardStyle}
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24, mass: 0.8 }}
      >
        <div className={styles.content}>
          <div className={styles.header}>
            <div className={styles.titleBlock}>
              <h3 className={styles.title}>{playlist.name}</h3>
              <div className={styles.stats}>
                <span className={styles.statItem}>
                  <Disc3 size={12} />
                  {playlist.songs.length} 首
                </span>
                <span className={styles.statItem}>
                  <Clock size={12} />
                  {formatTotalDuration(playlist.songs)}
                </span>
              </div>
            </div>
            <div className={styles.headerActions}>
              <div className={styles.colorPickerWrap} ref={colorPickerRef}>
                <button
                  className={styles.colorBtn}
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  aria-label="选择颜色"
                >
                  <Palette size={16} color="rgba(255,255,255,0.85)" />
                </button>
                {showColorPicker && (
                  <div
                    className={styles.colorPicker}
                    role="dialog"
                    aria-label={`歌单颜色选择器 - ${playlist.name}`}
                  >
                    {gradientPresets.map((color, idx) => (
                      <div
                        key={`${playlist.id}-color-${idx}`}
                        className={clsx(styles.colorSwatch, {
                          [styles.active]: playlist.gradientColor === color,
                        })}
                        style={{ background: color }}
                        onClick={() => handleColorSelect(color)}
                        role="button"
                        tabIndex={0}
                        aria-label={`颜色选项 ${idx + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div
            id={`playlist-${playlist.id}`}
            className={styles.songList}
            onPointerMove={onDrag}
            onPointerUp={endDrag}
          >
            {playlist.songs.length === 0 ? (
              <div className={styles.emptyState}>
                <Music size={32} className={styles.emptyIcon} />
                <p className={styles.emptyText}>还没有歌曲<br />点击下方按钮添加</p>
              </div>
            ) : (
              playlist.songs.map((song, index) => (
                <motion.div
                  key={song.id}
                  ref={(el) => registerItem(song.id, el)}
                  className={clsx(styles.songItem, {
                    [styles.isPlaying]: isPlayingSong(song),
                    [styles.isDragging]: dragState.draggingId === song.id,
                  })}
                  onClick={() => handleSongClick(song)}
                  layout
                  animate={{
                    scale: dragState.draggingId === song.id ? 1.08 : 1,
                    x: dragState.draggingId === song.id ? dragState.dragX.get() : 0,
                    y: dragState.draggingId === song.id ? dragState.dragY.get() : 0,
                    rotate: dragState.draggingId === song.id ? dragState.rotate.get() : 0,
                    zIndex: dragState.draggingId === song.id ? 999 : 1,
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 300,
                    damping: 28,
                    mass: 0.5,
                  }}
                  style={{ cursor: dragState.isDragging ? 'grabbing' : 'grab' }}
                >
                  <div
                    className={styles.dragHandle}
                    onPointerDown={(e) => startDrag(e, song.id, index)}
                  >
                    <span className={styles.dragDot} />
                    <span className={styles.dragDot} />
                    <span className={styles.dragDot} />
                  </div>
                  <div className={styles.songCover}>
                    <Music size={16} color="rgba(255,255,255,0.9)" />
                  </div>
                  <div className={styles.songInfo}>
                    <div className={styles.songName}>{song.name}</div>
                    <div className={styles.songArtist}>{song.artist}</div>
                  </div>
                  {isPlayingSong(song) ? (
                    <div className={styles.equalizer}>
                      <span className={styles.eqBar} style={{ animationDelay: '0s' }} />
                      <span className={styles.eqBar} style={{ animationDelay: '0.2s' }} />
                      <span className={styles.eqBar} style={{ animationDelay: '0.4s' }} />
                    </div>
                  ) : (
                    <Play size={14} className={styles.playIcon} />
                  )}
                  <div className={styles.songDuration}>{formatDuration(song.duration)}</div>
                </motion.div>
              ))
            )}
          </div>

          <button className={styles.addSongBtn} onClick={() => setShowAddModal(true)}>
            <Plus size={16} />
            添加歌曲
          </button>
        </div>
      </motion.div>

      {showAddModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>添加新歌曲</h3>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>歌曲名称 *</label>
              <input
                className={styles.formInput}
                type="text"
                placeholder="输入歌曲名称"
                value={newSong.name}
                onChange={(e) => setNewSong({ ...newSong, name: e.target.value })}
                autoFocus
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>歌手</label>
              <input
                className={styles.formInput}
                type="text"
                placeholder="输入歌手名称"
                value={newSong.artist}
                onChange={(e) => setNewSong({ ...newSong, artist: e.target.value })}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>时长（秒）</label>
              <input
                className={styles.formInput}
                type="number"
                placeholder="180"
                value={newSong.duration}
                onChange={(e) => setNewSong({ ...newSong, duration: e.target.value })}
              />
            </div>
            <div className={styles.modalActions}>
              <button className={styles.btnCancel} onClick={() => setShowAddModal(false)}>
                取消
              </button>
              <button
                className={styles.btnSubmit}
                onClick={handleAddSong}
                disabled={!newSong.name.trim()}
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PlaylistCard;
