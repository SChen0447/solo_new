import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { TAG_COLORS, STATUS_LABELS } from './types';
import type { Episode } from './types';
import './EpisodeDetail.css';

const EpisodeDetail = () => {
  const { podcastId } = useParams<{ podcastId: string }>();
  const navigate = useNavigate();
  const { podcasts, fetchPodcasts } = useAppStore();
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);

  useEffect(() => {
    if (podcasts.length === 0) {
      fetchPodcasts();
    }
  }, [fetchPodcasts, podcasts.length]);

  const podcast = podcasts.find((p) => p.id === podcastId);

  useEffect(() => {
    if (podcast && podcast.episodes && podcast.episodes.length > 0 && !selectedEpisode) {
      setSelectedEpisode(podcast.episodes[0]);
    }
  }, [podcast, selectedEpisode]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return '#16c79a';
      case 'recording':
        return '#f39c12';
      case 'draft':
        return '#9a9a9a';
      default:
        return '#9a9a9a';
    }
  };

  const getStatusLabel = (status: string) => {
    const label = STATUS_LABELS.find((s) => s.value === status);
    return label ? label.label : status;
  };

  const formatDuration = (minutes: number) => {
    if (minutes === 0) return '待定';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}小时${mins}分钟`;
    }
    return `${minutes}分钟`;
  };

  if (!podcast) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div className="podcast-detail-page">
      <button className="back-btn" onClick={() => navigate('/')}>
        ← 返回列表
      </button>

      <div className="podcast-header">
        <div className="podcast-cover">
          {podcast.coverUrl ? (
            <img src={podcast.coverUrl} alt={podcast.title} />
          ) : (
            <div className="cover-placeholder">{podcast.title.charAt(0)}</div>
          )}
        </div>
        <div className="podcast-info">
          <span className="category-badge">{podcast.category}</span>
          <h1>{podcast.title}</h1>
          <p className="podcast-description">{podcast.description}</p>
          <div className="podcast-stats">
            <span>{podcast.episodes?.length || 0} 集</span>
            <span>
              {podcast.episodes?.filter((e) => e.status === 'published').length || 0} 已发布
            </span>
          </div>
        </div>
      </div>

      <div className="content-wrapper">
        <div className="episodes-list">
          <h2>单集列表</h2>
          <div className="episode-items">
            {podcast.episodes?.map((episode, index) => (
              <div
                key={episode.id}
                className={`episode-item fade-in-item ${
                  selectedEpisode?.id === episode.id ? 'active' : ''
                }`}
                style={{ animationDelay: `${index * 0.05}s` }}
                onClick={() => setSelectedEpisode(episode)}
              >
                <div className="episode-item-header">
                  <h4>{episode.title}</h4>
                  <span
                    className="status-dot"
                    style={{ backgroundColor: getStatusColor(episode.status) }}
                  />
                </div>
                <div className="episode-item-meta">
                  <span>{episode.publishDate}</span>
                  <span>·</span>
                  <span>{formatDuration(episode.duration)}</span>
                </div>
              </div>
            ))}
          </div>

          {(!podcast.episodes || podcast.episodes.length === 0) && (
            <div className="empty-episodes">
              <p>暂无单集</p>
            </div>
          )}
        </div>

        <div className="episode-detail">
          {selectedEpisode ? (
            <div className="detail-card fade-in">
              <div className="detail-header">
              <span
                className="status-badge"
                style={{ backgroundColor: getStatusColor(selectedEpisode.status) }}
              >
                {getStatusLabel(selectedEpisode.status)}
              </span>
              <h2>{selectedEpisode.title}</h2>
            </div>

            <div className="detail-info">
              <div className="info-item">
                <span className="info-label">嘉宾</span>
                <span className="info-value">
                  {selectedEpisode.guest || '暂无嘉宾'}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">时长</span>
                <span className="info-value">
                  {formatDuration(selectedEpisode.duration)}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">上线日期</span>
                <span className="info-value">{selectedEpisode.publishDate}</span>
              </div>
            </div>

            <div className="detail-keywords">
              <h3>关键词</h3>
              <div className="keywords-list">
                {selectedEpisode.keywords?.map((keyword, idx) => (
                  <span
                    key={keyword}
                    className="keyword-tag"
                    style={{ backgroundColor: TAG_COLORS[idx % TAG_COLORS.length] }}
                  >
                    {keyword}
                  </span>
                ))}
                {(!selectedEpisode.keywords || selectedEpisode.keywords.length === 0) && (
                  <span className="no-keywords">暂无关键词</span>
                )}
              </div>
            </div>
          </div>
          ) : (
            <div className="no-selection">
              <p>请选择一个单集查看详情</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EpisodeDetail;
