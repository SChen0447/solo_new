import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Song, Playlist as PlaylistType } from './types';
import { songApi, playlistApi } from './services/api';
import SearchBar from './components/SearchBar';
import Playlist from './components/Playlist';
import SongLibrary from './components/SongLibrary';
import Recommendations from './components/Recommendations';
import PlaylistCard from './components/PlaylistCard';
import MiniPlayer from './components/MiniPlayer';
import Modal from './components/Modal';

const App: React.FC = () => {
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [filteredSongs, setFilteredSongs] = useState<Song[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [playlistSongs, setPlaylistSongs] = useState<Song[]>([]);
  const [recommendations, setRecommendations] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistType[]>([]);
  const [playlistDetails, setPlaylistDetails] = useState<Record<string, Song[]>>({});

  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecLoading, setIsRecLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [activeTab, setActiveTab] = useState<'library' | 'playlists'>('library');

  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [songs, genreList, playlistList] = await Promise.all([
          songApi.getSongs(),
          songApi.getGenres(),
          playlistApi.getPlaylists(),
        ]);
        setAllSongs(songs);
        setFilteredSongs(songs);
        setGenres(genreList);
        setPlaylists(playlistList);

        const detailsMap: Record<string, Song[]> = {};
        for (const pl of playlistList) {
          const details = await playlistApi.getPlaylist(pl.id);
          detailsMap[pl.id] = details.songs;
        }
        setPlaylistDetails(detailsMap);
      } catch (err) {
        console.error('加载数据失败:', err);
      }
    };
    loadData();
  }, []);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    try {
      if (!query.trim()) {
        setFilteredSongs(allSongs);
        return;
      }
      const results = await songApi.getSongs({ search: query });
      setFilteredSongs(results);
    } catch (err) {
      console.error('搜索失败:', err);
    }
  }, [allSongs]);

  const loadRecommendations = useCallback(async () => {
    if (playlistSongs.length === 0) {
      setRecommendations([]);
      return;
    }
    setIsRecLoading(true);
    try {
      const recs = await songApi.getRecommendations(
        playlistSongs.map((s) => s.id),
        3
      );
      setRecommendations(recs);
    } catch (err) {
      console.error('获取推荐失败:', err);
    } finally {
      setIsRecLoading(false);
    }
  }, [playlistSongs]);

  const handleSongDrop = useCallback((song: Song) => {
    setPlaylistSongs((prev) => {
      if (prev.find((s) => s.id === song.id)) {
        return prev;
      }
      return [...prev, song];
    });
  }, []);

  const handleReorder = useCallback((songs: Song[]) => {
    setPlaylistSongs(songs);
  }, []);

  const handleRemoveSong = useCallback((songId: string) => {
    setPlaylistSongs((prev) => prev.filter((s) => s.id !== songId));
  }, []);

  const handleAcceptRecommendation = useCallback((song: Song) => {
    setPlaylistSongs((prev) => {
      if (prev.find((s) => s.id === song.id)) {
        return prev;
      }
      return [...prev, song];
    });
    setRecommendations((prev) => prev.filter((s) => s.id !== song.id));
  }, []);

  const startAudio = useCallback((song: Song) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;

      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      if (oscillatorRef.current) {
        oscillatorRef.current.stop();
        oscillatorRef.current.disconnect();
      }
      if (gainNodeRef.current) {
        gainNodeRef.current.disconnect();
      }

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      const genreFrequencies: Record<string, number> = {
        '流行': 440,
        '摇滚': 220,
        '电子': 660,
        '古典': 330,
      };
      const baseFreq = genreFrequencies[song.genre] || 440;

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(baseFreq, ctx.currentTime);
      oscillator.frequency.setValueAtTime(baseFreq * 1.25, ctx.currentTime + 0.3);
      oscillator.frequency.setValueAtTime(baseFreq * 1.5, ctx.currentTime + 0.6);
      oscillator.frequency.setValueAtTime(baseFreq * 1.25, ctx.currentTime + 0.9);
      oscillator.frequency.setValueAtTime(baseFreq, ctx.currentTime + 1.2);

      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
      gainNode.gain.setValueAtTime(0.2, ctx.currentTime + 4.5);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 5);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 5);

      oscillatorRef.current = oscillator;
      gainNodeRef.current = gainNode;

      oscillator.onended = () => {
        setIsPlaying(false);
      };
    } catch (err) {
      console.error('音频播放失败:', err);
    }
  }, []);

  const handleSongClick = useCallback((song: Song) => {
    if (currentSong?.id === song.id && isPlaying) {
      setIsPlaying(false);
      if (oscillatorRef.current && audioContextRef.current) {
        oscillatorRef.current.stop();
      }
      return;
    }

    setCurrentSong(song);
    setIsPlaying(true);
    startAudio(song);
  }, [currentSong, isPlaying, startAudio]);

  const handlePlayPause = useCallback(() => {
    if (!currentSong) return;
    if (isPlaying) {
      setIsPlaying(false);
      if (oscillatorRef.current && audioContextRef.current) {
        oscillatorRef.current.stop();
      }
    } else {
      setIsPlaying(true);
      startAudio(currentSong);
    }
  }, [currentSong, isPlaying, startAudio]);

  const handleStop = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleSavePlaylist = async () => {
    if (!newPlaylistName.trim() || playlistSongs.length === 0) return;

    try {
      const newPlaylist = await playlistApi.createPlaylist({
        name: newPlaylistName.trim(),
        song_ids: playlistSongs.map((s) => s.id),
      });

      setPlaylists((prev) => [...prev, newPlaylist]);
      setPlaylistDetails((prev) => ({
        ...prev,
        [newPlaylist.id]: playlistSongs,
      }));

      setNewPlaylistName('');
      setShowSaveModal(false);
    } catch (err) {
      console.error('保存歌单失败:', err);
    }
  };

  const handleLoadPlaylist = (playlist: PlaylistType) => {
    const songs = playlistDetails[playlist.id] || [];
    setPlaylistSongs(songs);
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    try {
      await playlistApi.deletePlaylist(playlistId);
      setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
      setPlaylistDetails((prev) => {
        const next = { ...prev };
        delete next[playlistId];
        return next;
      });
    } catch (err) {
      console.error('删除歌单失败:', err);
    }
  };

  const playlistGenres = Array.from(new Set(playlistSongs.map((s) => s.genre)));

  return (
    <div className="app">
      <div className="app__bg" />
      
      <header className="app__header">
        <div className="app__logo">
          <span className="app__logo-icon">🎵</span>
          <h1 className="app__title">音乐发现</h1>
        </div>
        <SearchBar onSearch={handleSearch} placeholder="搜索歌手、歌名或专辑..." />
        <button
          className="app__save-btn"
          onClick={() => setShowSaveModal(true)}
          disabled={playlistSongs.length === 0}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          保存歌单
        </button>
      </header>

      <main className="app__main">
        <section className="app__left">
          <Playlist
            songs={playlistSongs}
            title="我的播放列表"
            currentSong={currentSong}
            isPlaying={isPlaying}
            onSongClick={handleSongClick}
            onReorder={handleReorder}
            onSongDrop={handleSongDrop}
            onRemoveSong={handleRemoveSong}
          />
        </section>

        <aside className="app__right">
          <div className="app__tabs">
            <button
              className={`app__tab ${activeTab === 'library' ? 'app__tab--active' : ''}`}
              onClick={() => setActiveTab('library')}
            >
              曲库
            </button>
            <button
              className={`app__tab ${activeTab === 'playlists' ? 'app__tab--active' : ''}`}
              onClick={() => setActiveTab('playlists')}
            >
              我的歌单
            </button>
          </div>

          {activeTab === 'library' ? (
            <SongLibrary
              songs={filteredSongs}
              genres={genres}
            />
          ) : (
            <div className="app__playlists">
              <div className="app__playlists-header">
                <h3>我的歌单</h3>
                <span>{playlists.length} 个歌单</span>
              </div>
              {playlists.length === 0 ? (
                <div className="app__playlists-empty">
                  <p>还没有保存的歌单</p>
                  <p className="app__playlists-empty-hint">
                    创建播放列表后点击"保存歌单"即可保存
                  </p>
                </div>
              ) : (
                <div className="app__playlist-grid">
                  {playlists.map((playlist) => (
                    <PlaylistCard
                      key={playlist.id}
                      playlist={playlist}
                      songs={playlistDetails[playlist.id] || []}
                      onLoad={handleLoadPlaylist}
                      onDelete={handleDeletePlaylist}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          <Recommendations
            recommendations={recommendations}
            onAccept={handleAcceptRecommendation}
            onRefresh={loadRecommendations}
            isLoading={isRecLoading}
            currentPlaylistGenres={playlistGenres}
          />
        </aside>
      </main>

      <MiniPlayer
        song={currentSong}
        isPlaying={isPlaying}
        onPlayPause={handlePlayPause}
        onStop={handleStop}
        playDuration={5}
      />

      <Modal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        title="保存为歌单"
      >
        <div className="save-playlist">
          <input
            type="text"
            className="save-playlist__input"
            placeholder="输入歌单名称..."
            value={newPlaylistName}
            onChange={(e) => setNewPlaylistName(e.target.value)}
            autoFocus
          />
          <p className="save-playlist__hint">
            将保存 {playlistSongs.length} 首歌曲
          </p>
          <div className="save-playlist__actions">
            <button
              className="save-playlist__btn save-playlist__btn--cancel"
              onClick={() => setShowSaveModal(false)}
            >
              取消
            </button>
            <button
              className="save-playlist__btn save-playlist__btn--confirm"
              onClick={handleSavePlaylist}
              disabled={!newPlaylistName.trim()}
            >
              保存
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default App;
