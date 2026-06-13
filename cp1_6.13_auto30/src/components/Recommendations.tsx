import React, { useState, useEffect } from 'react';
import { Song } from '../types';
import SongCard from './SongCard';

interface RecommendationsProps {
  recommendations: Song[];
  onAccept: (song: Song) => void;
  onRefresh: () => void;
  isLoading?: boolean;
  currentPlaylistGenres?: string[];
}

const Recommendations: React.FC<RecommendationsProps> = ({
  recommendations,
  onAccept,
  onRefresh,
  isLoading = false,
  currentPlaylistGenres = [],
}) => {
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [isFlipping, setIsFlipping] = useState(false);
  const [acceptedSongs, setAcceptedSongs] = useState<Set<string>>(new Set());
  const [isStackAnimating, setIsStackAnimating] = useState(false);

  useEffect(() => {
    setActiveIndex(-1);
    setAcceptedSongs(new Set());
  }, [recommendations]);

  const handleCardClick = (index: number) => {
    if (isFlipping || acceptedSongs.has(recommendations[index]?.id)) return;
    setIsFlipping(true);
    setActiveIndex(activeIndex === index ? -1 : index);
    setTimeout(() => setIsFlipping(false), 700);
  };

  const handleAccept = (e: React.MouseEvent, song: Song, index: number) => {
    e.stopPropagation();
    if (acceptedSongs.has(song.id)) return;

    setAcceptedSongs((prev) => new Set(prev).add(song.id));
    setIsStackAnimating(true);

    setTimeout(() => {
      onAccept(song);
      setIsStackAnimating(false);
      if (activeIndex === index) {
        setActiveIndex(-1);
      }
    }, 400);
  };

  const handleRefresh = () => {
    if (isLoading) return;
    setIsStackAnimating(true);
    setTimeout(() => {
      onRefresh();
      setIsStackAnimating(false);
    }, 300);
  };

  const getCardStyle = (index: number) => {
    const isAccepted = acceptedSongs.has(recommendations[index]?.id);
    const baseOffset = 12;
    const baseScale = 0.05;
    const baseRotate = 2;

    let offsetY = index * baseOffset;
    let scale = 1 - index * baseScale;
    let rotateY = index * baseRotate - (recommendations.length - 1) * baseRotate / 2;

    if (activeIndex === index) {
      offsetY = -20;
      scale = 1.05;
      rotateY = 180;
    } else if (activeIndex !== -1 && activeIndex < index) {
      offsetY = (index - activeIndex) * baseOffset + 40;
      rotateY += 5;
    } else if (activeIndex !== -1 && activeIndex > index) {
      rotateY -= 5;
    }

    return {
      zIndex: activeIndex === index ? 100 : recommendations.length - index,
      transform: `perspective(1200px) translateY(${offsetY}px) scale(${scale}) rotateY(${rotateY}deg) ${isAccepted ? 'translateX(-300px) scale(0.5) opacity(0)' : ''}`,
      transition: isStackAnimating
        ? 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        : 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
      opacity: isAccepted ? 0 : 1,
    };
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="recommendations">
      <div className="recommendations__header">
        <div className="recommendations__header-left">
          <h3 className="recommendations__title">为你推荐</h3>
          <span className="recommendations__subtitle">基于你的听歌喜好智能推荐</span>
        </div>
        <button
          className={`recommendations__refresh-btn ${isLoading ? 'recommendations__refresh-btn--loading' : ''}`}
          onClick={handleRefresh}
          disabled={isLoading}
        >
          <span className="recommendations__refresh-icon">↻</span>
          {isLoading ? '推荐中...' : '换一批'}
        </button>
      </div>

      <div className="recommendations__stack-container">
        {recommendations.length === 0 ? (
          <div className="recommendations__empty">
            <div className="recommendations__empty-icon">🎧</div>
            <p>添加一些歌曲到播放列表</p>
            <p className="recommendations__empty-hint">系统会根据你的喜好推荐更多音乐</p>
          </div>
        ) : (
          <div className={`recommendations__stack ${isStackAnimating ? 'recommendations__stack--animating' : ''}`}>
            {recommendations.map((song, index) => (
              <div
                key={song.id}
                className={`recommendation-stack-card 
                  ${activeIndex === index ? 'recommendation-stack-card--active' : ''}
                  ${acceptedSongs.has(song.id) ? 'recommendation-stack-card--accepted' : ''}
                `}
                style={getCardStyle(index)}
                onClick={() => handleCardClick(index)}
              >
                <div className="recommendation-stack-card__scene">
                  <div
                    className={`recommendation-stack-card__card 
                      ${activeIndex === index ? 'is-flipped' : ''}
                    `}
                  >
                    <div className="recommendation-stack-card__front">
                      <div className="recommendation-stack-card__cover">
                        <span className="recommendation-stack-card__cover-emoji">{song.cover}</span>
                      </div>
                      <div className="recommendation-stack-card__info">
                        <h4 className="recommendation-stack-card__title">{song.title}</h4>
                        <p className="recommendation-stack-card__artist">{song.artist}</p>
                        <div className="recommendation-stack-card__meta">
                          <span className="recommendation-stack-card__genre">{song.genre}</span>
                          <span className="recommendation-stack-card__duration">{formatDuration(song.duration)}</span>
                        </div>
                      </div>
                      <div className="recommendation-stack-card__hint">
                        <span>点击查看详情</span>
                      </div>
                    </div>

                    <div className="recommendation-stack-card__back">
                      <div className="recommendation-stack-card__back-header">
                        <span className="recommendation-stack-card__cover-emoji">{song.cover}</span>
                        <div>
                          <h4>{song.title}</h4>
                          <p>{song.artist}</p>
                        </div>
                      </div>
                      <div className="recommendation-stack-card__reasons">
                        <div className="recommendation-stack-card__reason">
                          <span className="recommendation-stack-card__reason-icon">🎯</span>
                          <div>
                            <strong>流派匹配</strong>
                            <p>
                              {song.genre}
                              {currentPlaylistGenres.length > 0 && (
                                <span> · 你的列表中包含 {currentPlaylistGenres.join('、')}</span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="recommendation-stack-card__reason">
                          <span className="recommendation-stack-card__reason-icon">💿</span>
                          <div>
                            <strong>专辑信息</strong>
                            <p>{song.album}</p>
                          </div>
                        </div>
                        <div className="recommendation-stack-card__reason">
                          <span className="recommendation-stack-card__reason-icon">⭐</span>
                          <div>
                            <strong>相似度评分</strong>
                            <p>{Math.floor(75 + Math.random() * 20)}% 匹配度</p>
                          </div>
                        </div>
                      </div>
                      <button
                        className={`recommendation-stack-card__accept-btn ${acceptedSongs.has(song.id) ? 'recommendation-stack-card__accept-btn--accepted' : ''}`}
                        onClick={(e) => handleAccept(e, song, index)}
                        disabled={acceptedSongs.has(song.id)}
                      >
                        {acceptedSongs.has(song.id) ? '✓ 已添加' : '加入播放列表'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {recommendations.length > 0 && (
          <div className="recommendations__stack-hint">
            <span className="recommendations__stack-hint-dot" />
            点击卡片翻转查看详情 · 共 {recommendations.length} 首推荐
          </div>
        )}
      </div>
    </div>
  );
};

export default Recommendations;
