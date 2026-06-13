import React, { useState, useEffect, useRef } from 'react';
import { Song } from '../types';

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
  const [flippedIndex, setFlippedIndex] = useState<number>(-1);
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const animatingRef = useRef(false);

  useEffect(() => {
    setFlippedIndex(-1);
    setAcceptedIds(new Set());
    setIsRefreshing(false);
  }, [recommendations]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCardClick = (index: number) => {
    if (animatingRef.current) return;
    if (acceptedIds.has(recommendations[index]?.id)) return;

    animatingRef.current = true;
    setFlippedIndex(prev => prev === index ? -1 : index);
    setTimeout(() => {
      animatingRef.current = false;
    }, 700);
  };

  const handleAccept = (e: React.MouseEvent, song: Song) => {
    e.stopPropagation();
    if (acceptedIds.has(song.id)) return;

    setAcceptedIds(prev => new Set(prev).add(song.id));
    setTimeout(() => {
      onAccept(song);
    }, 350);
  };

  const handleRefresh = () => {
    if (isLoading || isRefreshing) return;
    setIsRefreshing(true);
    setTimeout(() => {
      onRefresh();
    }, 300);
  };

  const getCardStyle = (index: number): React.CSSProperties => {
    const total = recommendations.length;
    const isFlipped = flippedIndex === index;
    const isAccepted = acceptedIds.has(recommendations[index]?.id);

    let offsetY = 0;
    let offsetX = 0;
    let scale = 1;
    let rotate = 0;
    let opacity = 1;
    let zIndex = total - index;

    if (!isFlipped || flippedIndex === -1) {
      offsetY = index * 14;
      scale = 1 - index * 0.04;
      rotate = (index - (total - 1) / 2) * 1.5;
      opacity = 1 - index * 0.06;
    } else if (isFlipped) {
      offsetY = -10;
      offsetX = 0;
      scale = 1.08;
      rotate = 0;
      opacity = 1;
      zIndex = 100;
    } else if (flippedIndex !== -1) {
      if (index < flippedIndex) {
        offsetX = -30;
        offsetY = index * 14 + 10;
        rotate = -8;
        scale = 0.9 - (flippedIndex - index - 1) * 0.05;
        opacity = 0.5 - (flippedIndex - index - 1) * 0.1;
      } else {
        offsetX = 30;
        offsetY = index * 14 + 30;
        rotate = 8;
        scale = 0.9 - (index - flippedIndex - 1) * 0.05;
        opacity = 0.5 - (index - flippedIndex - 1) * 0.1;
      }
      zIndex = total - Math.abs(index - flippedIndex);
    }

    if (isAccepted) {
      scale = 0.3;
      opacity = 0;
      offsetX = -150;
      rotate = -20;
    }

    return {
      zIndex,
      opacity,
      transform: `perspective(1000px) 
        translate3d(${offsetX}px, ${offsetY}px, 0) 
        scale(${scale})
        rotateY(${isFlipped ? 180 : 0}deg)
        rotate(${rotate}deg)`,
      transition: isAccepted
        ? 'all 0.35s cubic-bezier(0.55, 0.055, 0.675, 0.19)'
        : 'all 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
      transformStyle: 'preserve-3d',
    };
  };

  return (
    <div className="recommendations">
      <div className="recommendations__header">
        <div className="recommendations__header-left">
          <h3 className="recommendations__title">为你推荐</h3>
          <span className="recommendations__subtitle">基于你的听歌喜好智能发现</span>
        </div>
        <button
          className={`recommendations__refresh ${isLoading || isRefreshing ? 'is-spinning' : ''}`}
          onClick={handleRefresh}
          disabled={isLoading}
          aria-label="换一批推荐"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-3-6.7" />
            <polyline points="21 3 21 9 15 9" />
          </svg>
          <span>换一批</span>
        </button>
      </div>

      <div className="recommendations__stack-wrapper">
        {recommendations.length === 0 ? (
          <div className="recommendations__empty">
            <div className="recommendations__empty-icon">🎧</div>
            <p>添加歌曲到播放列表</p>
            <p className="recommendations__empty-hint">系统会根据你的喜好推荐更多音乐</p>
            <button
              className="recommendations__main-btn"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              {isLoading ? '生成中...' : '开始发现'}
            </button>
          </div>
        ) : (
          <div className={`recommendations__stack ${isRefreshing ? 'is-refreshing' : ''}`}>
            {recommendations.map((song, index) => (
              <div
                key={song.id}
                className={`rec-card 
                  ${flippedIndex === index ? 'rec-card--flipped' : ''}
                  ${acceptedIds.has(song.id) ? 'rec-card--accepted' : ''}
                `}
                style={getCardStyle(index)}
                onClick={() => handleCardClick(index)}
              >
                <div className="rec-card__inner">
                  <div className="rec-card__front">
                    <div className="rec-card__cover">
                      <span className="rec-card__cover-emoji">{song.cover}</span>
                    </div>
                    <div className="rec-card__info">
                      <h4 className="rec-card__title">{song.title}</h4>
                      <p className="rec-card__artist">{song.artist}</p>
                      <div className="rec-card__meta">
                        <span className="rec-card__genre">{song.genre}</span>
                        <span className="rec-card__duration">{formatDuration(song.duration)}</span>
                      </div>
                    </div>
                    <div className="rec-card__flip-hint">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 2v6h-6" />
                        <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                      </svg>
                      点我翻转
                    </div>
                  </div>

                  <div className="rec-card__back">
                    <div className="rec-card__back-header">
                      <span className="rec-card__back-cover">{song.cover}</span>
                      <div className="rec-card__back-titlewrap">
                        <h4>{song.title}</h4>
                        <p>{song.artist}</p>
                      </div>
                    </div>

                    <div className="rec-card__reasons">
                      <div className="rec-card__reason">
                        <span className="rec-card__reason-icon">🎯</span>
                        <div>
                          <strong>为什么推荐</strong>
                          <p>{song.genre} · 你的音乐口味匹配</p>
                        </div>
                      </div>
                      <div className="rec-card__reason">
                        <span className="rec-card__reason-icon">💿</span>
                        <div>
                          <strong>专辑</strong>
                          <p>{song.album}</p>
                        </div>
                      </div>
                      <div className="rec-card__reason">
                        <span className="rec-card__reason-icon">⭐</span>
                        <div>
                          <strong>匹配度</strong>
                          <p>{85 + Math.floor((index * 13) % 15)}%</p>
                        </div>
                      </div>
                    </div>

                    <button
                      className={`rec-card__add-btn ${acceptedIds.has(song.id) ? 'is-added' : ''}`}
                      onClick={(e) => handleAccept(e, song)}
                      disabled={acceptedIds.has(song.id)}
                    >
                      {acceptedIds.has(song.id) ? (
                        <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>已添加</>
                      ) : (
                        <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>加入播放列表</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {recommendations.length > 0 && (
          <div className="recommendations__stack-info">
            <div className="recommendations__stack-dots">
              {recommendations.map((_, i) => (
                <span
                  key={i}
                  className={`recommendations__stack-dot ${flippedIndex === i ? 'active' : ''}`}
                />
              ))}
            </div>
            <p className="recommendations__stack-hint">
              点击卡片翻转查看 · 共 {recommendations.length} 首推荐
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Recommendations;
