import React, { useState } from 'react';
import type { Photo } from './data';

interface PhotoCardProps {
  photo: Photo;
  delay: number;
}

const PhotoCard: React.FC<PhotoCardProps> = ({ photo, delay }) => {
  const [loaded, setLoaded] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={`photo-card ${loaded ? 'photo-card--loaded' : ''}`}
      style={{ animationDelay: `${delay}ms` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <img
        src={photo.url}
        alt={photo.title}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className="photo-card__img"
      />
      <div className={`photo-card__overlay ${hovered ? 'photo-card__overlay--visible' : ''}`}>
        <h3 className="photo-card__title">{photo.title}</h3>
        <p className="photo-card__desc">{photo.description}</p>
      </div>
    </div>
  );
};

export default PhotoCard;
