import React, { useState } from 'react';
import { Song } from '../types';
import SongCard from './SongCard';

interface RecommendationsProps {
  recommendations: Song[];
  onAccept: (song: Song) => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

const Recommendations: React.FC<RecommendationsProps> = ({
  recommendations,
  onAccept,
  onRefresh,
  isLoading = false,
}) => {
  const [flippedIndex, setFlippedIndex] = useState<number | null>(null);

  const handleCardClick = (index: number) => {
    setFlippedIndex(flippedIndex === index ? null : index);
  };

  return (
    <div className="recommendations">
      <div className="recommendations__header">
        <h3 className="recommendations__title">为你推荐</h3>
        <button
          className="recommendations__refresh-btn"
          onClick={onRefresh}
          disabled={isLoading}
        >
          {isLoading ? '加载中...' : '换一批'}
        </button>
      </div>

      <div className="recommendations__cards">
        {recommendations.length === 0 ? (
          <div className="recommendations__empty">
            <p>添加一些歌曲来获取推荐</p>
          </div>
        ) : (
          recommendations.map((song, index) => (
            <div
              key={song.id}
              className={`recommendation-card ${flippedIndex === index ? 'recommendation-card--flipped' : ''}`}
              style={{
                zIndex: recommendations.length - index,
                transform: `translateY(${index * 8}px) scale(${1 - index * 0.03})`,
              }}
              onClick={() => handleCardClick(index)}
            >
              <div className="recommendation-card__inner">
                <div className="recommendation-card__front">
                  <SongCard
                    song={song}
                    draggable={false}
                    onClick={() => {}}
                  />
                </div>
                <div className="recommendation-card__back">
                  <div className="recommendation-card__back-content">
                    <p className="recommendation-card__reason">
                      基于你喜欢的{song.genre}音乐推荐
                    </p>
                    <button
                      className="recommendation-card__accept-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAccept(song);
                      }}
                    >
                      加入列表
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <button
        className="recommendations__main-btn"
        onClick={onRefresh}
        disabled={isLoading}
      >
        {isLoading ? '生成推荐中...' : '为我推荐'}
      </button>
    </div>
  );
};

export default Recommendations;
