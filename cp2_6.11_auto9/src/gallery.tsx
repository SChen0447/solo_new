import React from 'react';
import photos from './data';
import PhotoCard from './photoCard';

const Gallery: React.FC = () => {
  return (
    <div className="gallery">
      <header className="gallery__header">
        <h1 className="gallery__title">Polaroid Gallery</h1>
        <div className="gallery__divider" />
      </header>
      <div className="gallery__grid">
        {photos.map((photo, index) => (
          <PhotoCard key={photo.id} photo={photo} delay={index * 50} />
        ))}
      </div>
    </div>
  );
};

export default Gallery;
