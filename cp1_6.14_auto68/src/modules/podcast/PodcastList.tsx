import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import type { Podcast } from './types';
import './PodcastList.css';

const PodcastList = () => {
  const navigate = useNavigate();
  const { podcasts, loading, fetchPodcasts, searchQuery, dateFilter } = useAppStore();
  const [visibleCards, setVisibleCards] = useState<number>(0);

  useEffect(() => {
    fetchPodcasts();
  }, [fetchPodcasts]);

  useEffect(() => {
    if (podcasts.length > 0) {
      setVisibleCards(0);
      const timer = setInterval(() => {
        setVisibleCards((prev) => {
          if (prev >= podcasts.length) {
            clearInterval(timer);
            return prev;
          }
          return prev + 1;
        });
      }, 100);
      return () => clearInterval(timer);
    }
  }, [podcasts.length]);

  const filteredPodcasts = podcasts.filter((podcast) => {
    const matchesSearch = searchQuery === '' ||
      podcast.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      podcast.description.toLowerCase().includes(searchQuery.toLowerCase());

    if (!dateFilter) return matchesSearch;

    const hasEpisodeInRange = podcast.episodes?.some((ep) => {
      return ep.publishDate >= dateFilter;
    });

    return matchesSearch && hasEpisodeInRange;
  });

  const getProgress = (podcast: Podcast) => {
    const total = podcast.episodes?.length || 0;
    if (total === 0) return 0;
    const published = podcast.episodes?.filter((e) => e.status === 'published').length || 0;
    return Math.round((published / total) * 100);
  };

  const getLatestEpisodeDate = (podcast: Podcast) => {
    if (!podcast.episodes || podcast.episodes.length === 0) return null;
    const sorted = [...podcast.episodes].sort(
      (a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
    );
    return sorted[0].publishDate;
  };

  if (loading && podcasts.length === 0) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div className="podcast-list-page">
      <div className="page-header">
        <h1>我的播客</h1>
        <button className="btn-primary" onClick={() => {}}>
          + 新建节目
        </button>
      </div>

      <div className="podcast-grid">
        {filteredPodcasts.map((podcast, index) => (
          <div
            key={podcast.id}
            className={`podcast-card ${index < visibleCards ? 'fade-in' : ''}`}
            onClick={() => navigate(`/podcast/${podcast.id}`)}
          >
            <div className="card-cover">
              {podcast.coverUrl ? (
                <img src={podcast.coverUrl} alt={podcast.title} />
              ) : (
                <div className="cover-placeholder">{podcast.title.charAt(0)}</div>
              )}
              <span className="category-tag">{podcast.category}</span>
            </div>
            <div className="card-content">
              <h3 className="card-title">{podcast.title}</h3>
              <p className="card-description">{podcast.description}</p>
              <div className="card-footer">
                <span className="episode-count">
                  {podcast.episodes?.length || 0} 集
                </span>
                <div className="progress-wrapper">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${getProgress(podcast)}%` }}
                    />
                  </div>
                  <span className="progress-text">{getProgress(podcast)}%</span>
                </div>
              </div>
            </div>
            <div className="card-hover-info">
              最新一期: {getLatestEpisodeDate(podcast) || '暂无'}
            </div>
          </div>
        ))}
      </div>

      {filteredPodcasts.length === 0 && (
        <div className="empty-state">
          <p>暂无播客节目</p>
        </div>
      )}
    </div>
  );
};

export default PodcastList;
