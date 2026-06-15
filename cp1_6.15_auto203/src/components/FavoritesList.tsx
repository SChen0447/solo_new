import React from 'react';
import { useFontStore } from '../store';
import './FavoritesList.css';

const FavoritesList: React.FC = () => {
  const { favorites, removeFavorite, applyFavorite } = useFontStore();

  return (
    <div className="favorites-list">
      <h3 className="favorites-list__title">我的收藏</h3>
      {favorites.length === 0 ? (
        <p className="favorites-list__empty">暂无收藏，快去添加吧~</p>
      ) : (
        <div className="favorites-list__items">
          {favorites.map((item) => (
            <div
              key={item.id}
              className="favorite-card"
              onClick={() => applyFavorite(item.id)}
            >
              <div className="favorite-card__thumbnail">
                <img src={item.thumbnail} alt={item.titleFontName} />
              </div>
              <div className="favorite-card__info">
                <div className="favorite-card__names">
                  <span className="favorite-card__title-font">{item.titleFontName}</span>
                  <span className="favorite-card__divider">×</span>
                  <span className="favorite-card__body-font">{item.bodyFontName}</span>
                </div>
              </div>
              <button
                className="favorite-card__delete"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFavorite(item.id);
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FavoritesList;
