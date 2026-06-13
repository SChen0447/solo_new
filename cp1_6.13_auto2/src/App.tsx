import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Music,
  Plus,
  Trash2,
  Sparkles,
  ChevronUp,
  Disc3,
  Play,
} from 'lucide-react';
import clsx from 'clsx';
import { PlaylistCard } from './components/PlaylistCard';
import { PlayerBar } from './components/PlayerBar';
import { useStore } from './store';
import { formatDuration } from './types';
import type { Song } from './types';
import styles from './App.module.css';

function App() {
  const playlists = useStore((s) => s.playlists);
  const mainList = useStore((s) => s.mainList);
  const currentSong = useStore((s) => s.currentSong);
  const addPlaylist = useStore((s) => s.addPlaylist);
  const clearMainList = useStore((s) => s.clearMainList);
  const setCurrentSong = useStore((s) => s.setCurrentSong);
  const addToMainList = useStore((s) => s.addToMainList);

  const [showNewModal, setShowNewModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [mobileListOpen, setMobileListOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleCreatePlaylist = () => {
    if (!newPlaylistName.trim()) return;
    addPlaylist(newPlaylistName.trim());
    setNewPlaylistName('');
    setShowNewModal(false);
  };

  const handleSongClick = (song: Song) => {
    setCurrentSong(song);
    if (isMobile) {
      setMobileListOpen(false);
    }
  };

  const isPlayingSong = (song: Song) => currentSong?.id === song.id;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 260,
        damping: 24,
      },
    },
  };

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>
              <Sparkles size={22} color="#fff" />
            </div>
            <div className={styles.logoText}>
              <h1 className={styles.appTitle}>星夜歌单</h1>
              <span className={styles.appSubtitle}>按场景管理你的音乐世界</span>
            </div>
          </div>
          <button
            className={styles.addPlaylistBtn}
            onClick={() => setShowNewModal(true)}
          >
            <Plus size={18} />
            新建歌单
          </button>
        </div>
      </header>

      <main className={styles.mainLayout}>
        <section className={styles.playlistsSection}>
          <motion.div
            className={styles.playlistsGrid}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {playlists.map((playlist) => (
              <motion.div key={playlist.id} variants={itemVariants}>
                <PlaylistCard playlist={playlist} />
              </motion.div>
            ))}
          </motion.div>
        </section>

        <aside
          id="main-playlist-container"
          className={clsx(styles.sidebar, {
            [styles.isOpen]: mobileListOpen,
          })}
        >
          <div className={clsx(styles.mainListCard)}>
            {isMobile && <div className={styles.dragHandleBar} />}
            <div className={styles.mainListHeader}>
              <div className={styles.mainListTitleBlock}>
                <h2 className={styles.mainListTitle}>
                  <Disc3 size={18} color="#7eb8da" />
                  主播放列表
                </h2>
                <span className={styles.mainListCount}>
                  {mainList.length} 首歌曲
                </span>
              </div>
              <button
                className={styles.clearBtn}
                onClick={clearMainList}
                disabled={mainList.length === 0}
                aria-label="清空主播放列表"
              >
                <Trash2 size={12} />
                清空
              </button>
            </div>

            <div className={styles.mainListContent}>
              {mainList.length === 0 ? (
                <div className={styles.emptyMainList}>
                  <Music size={32} className={styles.emptyMainIcon} />
                  <p className={styles.emptyMainText}>
                    将歌曲拖拽到此处
                    <br />
                    创建你的混搭歌单
                  </p>
                </div>
              ) : (
                <div className={styles.mainListSongs}>
                  <AnimatePresence>
                    {mainList.map((song, index) => (
                      <motion.div
                        key={song.id}
                        layout
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{
                          type: 'spring',
                          stiffness: 300,
                          damping: 28,
                          delay: index * 0.02,
                        }}
                        className={clsx(styles.mainSongItem, {
                          [styles.isPlaying]: isPlayingSong(song),
                        })}
                        onClick={() => handleSongClick(song)}
                        onDoubleClick={() => addToMainList(song)}
                      >
                        <div className={styles.mainSongCover}>
                          {isPlayingSong(song) ? (
                            <Play size={12} color="#fff" fill="#fff" />
                          ) : (
                            <Music size={12} color="rgba(255,255,255,0.8)" />
                          )}
                        </div>
                        <div className={styles.mainSongInfo}>
                          <div className={styles.mainSongName}>{song.name}</div>
                          <div className={styles.mainSongArtist}>{song.artist}</div>
                        </div>
                        <div className={styles.mainSongDuration}>
                          {formatDuration(song.duration)}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </aside>
      </main>

      {isMobile && (
        <motion.button
          className={styles.mobileToggle}
          onClick={() => setMobileListOpen(!mobileListOpen)}
          aria-label={mobileListOpen ? '收起播放列表' : '展开播放列表'}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          animate={{ y: mobileListOpen ? -10 : 0 }}
        >
          <ChevronUp
            size={22}
            style={{
              transform: mobileListOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          />
          {mainList.length > 0 && <span className={styles.badge}>{mainList.length}</span>}
        </motion.button>
      )}

      <PlayerBar />

      {showNewModal && (
        <div className={styles.modalOverlay} onClick={() => setShowNewModal(false)}>
          <motion.div
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          >
            <h3 className={styles.modalTitle}>创建新歌单</h3>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>歌单名称</label>
              <input
                className={styles.formInput}
                type="text"
                placeholder="例如：深夜爵士乐"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreatePlaylist();
                }}
              />
            </div>
            <div className={styles.modalActions}>
              <button
                className={styles.btnCancel}
                onClick={() => setShowNewModal(false)}
              >
                取消
              </button>
              <button
                className={styles.btnSubmit}
                onClick={handleCreatePlaylist}
                disabled={!newPlaylistName.trim()}
              >
                创建
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default App;
