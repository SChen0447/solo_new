import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { create } from 'zustand';
import { Podcast, Episode, CurrentPlaying, ParsedRSS } from './types';
import { PodcastManager } from './PodcastManager';
import { AudioPlayer } from './AudioPlayer';
import { StatsPanel } from './StatsPanel';

interface AppStore {
  podcasts: Podcast[];
  currentPlaying: CurrentPlaying;
  stateTick: number;
  uiTick: number;
  setPodcasts: (p: Podcast[]) => void;
  setCurrentPlaying: (cp: CurrentPlaying) => void;
  refreshState: () => void;
  refreshUI: () => void;
}

const useAppStore = create<AppStore>((set) => ({
  podcasts: [],
  currentPlaying: { podcast: null, episode: null },
  stateTick: 0,
  uiTick: 0,
  setPodcasts: (podcasts) => set({ podcasts }),
  setCurrentPlaying: (currentPlaying) => set({ currentPlaying }),
  refreshState: () => set((s) => ({ stateTick: s.stateTick + 1 })),
  refreshUI: () => set((s) => ({ uiTick: s.uiTick + 1 })),
}));

function formatDuration(seconds: number): string {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}时${m}分`;
  return `${m}分`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  } catch {
    return dateStr;
  }
}

const App: React.FC = () => {
  const {
    podcasts,
    currentPlaying,
    stateTick,
    uiTick,
    setPodcasts,
    setCurrentPlaying,
    refreshState,
    refreshUI,
  } = useAppStore();

  const [rssUrl, setRssUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statsOpen, setStatsOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  useEffect(() => {
    setPodcasts(PodcastManager.getPodcasts());
  }, []);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (windowWidth > 768) {
      setStatsOpen(false);
    }
  }, [windowWidth]);

  const isMobile = windowWidth <= 768;

  const starredEpisodes = useMemo(() => {
    return PodcastManager.getStarredEpisodes();
  }, [stateTick, podcasts.length]);

  const handleAddPodcast = useCallback(async () => {
    const url = rssUrl.trim();
    if (!url) {
      setError('请输入RSS订阅源地址');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await axios.get('/api/parse', {
        params: { url },
        timeout: 20000,
      });
      if (res.data && res.data.success && res.data.data) {
        const data = res.data.data as ParsedRSS;
        const podcast = PodcastManager.addPodcast({
          rssUrl: data.rssUrl || url,
          title: data.title,
          description: data.description,
          cover: data.cover,
          link: data.link,
          language: data.language,
          categories: data.categories,
          episodes: data.episodes,
          lastBuildDate: data.lastBuildDate,
        });
        setPodcasts(PodcastManager.getPodcasts());
        setRssUrl('');
        refreshState();
        refreshUI();
      } else {
        setError(res.data?.error || '解析失败，请检查RSS地址是否正确');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || '网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [rssUrl, setPodcasts, refreshState, refreshUI]);

  const handleRemovePodcast = useCallback((id: string) => {
    if (!confirm('确定要取消订阅这个播客吗？')) return;
    PodcastManager.removePodcast(id);
    setPodcasts(PodcastManager.getPodcasts());
    refreshState();
    if (currentPlaying.podcast?.id === id) {
      setCurrentPlaying({ podcast: null, episode: null });
    }
  }, [currentPlaying.podcast?.id, setPodcasts, setCurrentPlaying, refreshState]);

  const handlePlayEpisode = useCallback((podcast: Podcast, episode: Episode) => {
    setCurrentPlaying({ podcast, episode });
  }, [setCurrentPlaying]);

  const handleMarkListened = useCallback((e: React.MouseEvent, episodeId: string) => {
    e.stopPropagation();
    PodcastManager.markAsListened(episodeId, !PodcastManager.isListened(episodeId));
    refreshState();
    refreshUI();
  }, [refreshState, refreshUI]);

  const handleToggleStar = useCallback((e: React.MouseEvent, episodeId: string) => {
    e.stopPropagation();
    PodcastManager.toggleStarred(episodeId);
    refreshState();
    refreshUI();
  }, [refreshState, refreshUI]);

  const handleProgressUpdate = useCallback(() => {
    refreshState();
    refreshUI();
  }, [refreshState, refreshUI]);

  return (
    <div className="app-container" onClick={() => {}}>
      <main className="main-content">
        <header className="header">
          <h1>🎧 播客管家</h1>
          <p>管理你的播客订阅，追踪收听习惯，记录灵感笔记</p>
        </header>

        <section className="add-rss-section">
          <h2>添加播客订阅</h2>
          <div className="rss-input-group">
            <input
              className="rss-input"
              type="text"
              placeholder="输入RSS订阅源地址，例如 https://example.com/feed.xml"
              value={rssUrl}
              onChange={(e) => setRssUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !loading) handleAddPodcast();
              }}
              disabled={loading}
            />
            <button
              className="btn"
              onClick={handleAddPodcast}
              disabled={loading}
            >
              {loading ? <span className="loading-spinner" /> : '添加订阅'}
            </button>
          </div>
          {error && <div className="error-message">{error}</div>}
        </section>

        {starredEpisodes.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <h2 className="section-title">⭐ 收藏节目</h2>
            <div className="starred-grid">
              {starredEpisodes.map(({ podcast, episode }) => (
                <div
                  key={episode.id}
                  className="starred-item"
                  onClick={() => handlePlayEpisode(podcast, episode)}
                >
                  <img
                    src={episode.cover || podcast.cover}
                    alt={episode.title}
                    onError={(e) => { (e.target as HTMLImageElement).style.background = '#2a3a5a'; }}
                  />
                  <h4>{episode.title}</h4>
                  <p>{podcast.title}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="section-title">📚 我的订阅 ({podcasts.length})</h2>
          {podcasts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📻</div>
              <p>还没有订阅任何播客</p>
              <p style={{ fontSize: 12, marginTop: 6, opacity: 0.7 }}>
                在上方输入RSS地址开始你的播客之旅
              </p>
            </div>
          ) : (
            <div className="podcast-list">
              {podcasts.map((podcast) => (
                <div key={podcast.id} className="podcast-card">
                  <div className="podcast-header">
                    <img
                      className="podcast-cover"
                      src={podcast.cover}
                      alt={podcast.title}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect fill="%232a3a5a" width="96" height="96"/><text x="48" y="54" text-anchor="middle" fill="%2300c9a7" font-size="32" font-family="Arial">🎙</text></svg>';
                      }}
                    />
                    <div className="podcast-info">
                      <div className="podcast-title">{podcast.title}</div>
                      <div className="podcast-desc">{podcast.description || '暂无描述'}</div>
                      {podcast.categories.length > 0 && (
                        <div className="podcast-categories">
                          {podcast.categories.slice(0, 5).map((cat) => (
                            <span key={cat} className="category-tag">
                              {cat}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="podcast-actions">
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleRemovePodcast(podcast.id)}
                      >
                        取消订阅
                      </button>
                    </div>
                  </div>

                  <div className="episode-list">
                    {podcast.episodes.map((episode) => {
                      const isListened = PodcastManager.isListened(episode.id);
                      const isStarred = PodcastManager.isStarred(episode.id);
                      const isPlaying = currentPlaying.episode?.id === episode.id;
                      return (
                        <div
                          key={episode.id}
                          className={`episode-item ${isListened ? 'listened' : ''}`}
                          onClick={() => handlePlayEpisode(podcast, episode)}
                          style={{
                            outline: isPlaying ? '2px solid #00c9a7' : 'none',
                            outlineOffset: '-2px',
                          }}
                        >
                          <img
                            className="episode-cover"
                            src={episode.cover || podcast.cover}
                            alt={episode.title}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.visibility = 'hidden';
                            }}
                          />
                          <div className="episode-info">
                            <div className="episode-title">
                              {isPlaying && <span style={{ color: '#00c9a7', marginRight: 4 }}>▶</span>}
                              {episode.title}
                            </div>
                            <div className="episode-meta">
                              {episode.pubDate && <span>{formatDate(episode.pubDate)}</span>}
                              {episode.duration > 0 && <span>⏱ {formatDuration(episode.duration)}</span>}
                              {isListened && <span style={{ color: '#00c9a7' }}>✓ 已听</span>}
                            </div>
                          </div>
                          <div className="episode-btn-group">
                            <button
                              className={`icon-btn ${isListened ? 'active' : ''}`}
                              onClick={(e) => handleMarkListened(e, episode.id)}
                              title={isListened ? '取消已听标记' : '标记已听'}
                            >
                              {isListened ? '✓' : '○'}
                            </button>
                            <button
                              className={`icon-btn ${isStarred ? 'starred' : ''}`}
                              onClick={(e) => handleToggleStar(e, episode.id)}
                              title={isStarred ? '取消收藏' : '收藏节目'}
                            >
                              {isStarred ? '★' : '☆'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <StatsPanel refreshKey={stateTick + uiTick} isOpen={!isMobile || statsOpen} />

      {isMobile && (
        <button
          className="stats-toggle-btn"
          onClick={() => setStatsOpen(!statsOpen)}
          title={statsOpen ? '隐藏统计' : '显示统计'}
        >
          {statsOpen ? '▼' : '📊'}
        </button>
      )}

      <AudioPlayer
        podcast={currentPlaying.podcast}
        episode={currentPlaying.episode}
        onProgressUpdate={handleProgressUpdate}
      />
    </div>
  );
};

export default App;
