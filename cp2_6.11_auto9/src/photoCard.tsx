import React, { useState, memo } from 'react';
import type { Photo } from './data';

interface PhotoCardProps {
  photo: Photo;
  delay: number;
  style?: React.CSSProperties;
}

const PhotoCard: React.FC<PhotoCardProps> = memo(({ photo, delay, style }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="photo-card"
      style={{
        ...style,
        animationDelay: `${delay}ms`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <img
        src={photo.url}
        alt={photo.title}
        loading="lazy"
        className="photo-card__img"
      />
      <div className={`photo-card__overlay ${hovered ? 'photo-card__overlay--visible' : ''}`}>
        <h3 className="photo-card__title">{photo.title}</h3>
        <p className="photo-card__desc">{photo.description}</p>
      </div>
    </div>
  );
});

PhotoCard.displayName = 'PhotoCard';

export default PhotoCard;
