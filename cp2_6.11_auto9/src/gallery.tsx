import React, { useState, useEffect, useRef, useMemo } from 'react';
import photos from './data';
import PhotoCard from './photoCard';

const GAP = 12;

const getColumnCount = (width: number): number => {
  if (width >= 1024) return 4;
  if (width >= 768) return 3;
  return 2;
};

interface CardPosition {
  top: number;
  left: number;
  width: number;
  height: number;
}

const Gallery: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const { positions, gridHeight } = useMemo(() => {
    if (containerWidth === 0) {
      return { positions: [] as CardPosition[], gridHeight: 0 };
    }

    const cols = getColumnCount(containerWidth);
    const cardWidth = (containerWidth - GAP * (cols - 1)) / cols;
    const columnHeights = new Array(cols).fill(0);
    const positions: CardPosition[] = [];

    for (const photo of photos) {
      const shortestCol = columnHeights.indexOf(Math.min(...columnHeights));
      const scaledHeight = cardWidth * (photo.height / 400);

      positions.push({
        top: columnHeights[shortestCol],
        left: shortestCol * (cardWidth + GAP),
        width: cardWidth,
        height: scaledHeight,
      });

      columnHeights[shortestCol] += scaledHeight + GAP;
    }

    return {
      positions,
      gridHeight: Math.max(...columnHeights) - GAP,
    };
  }, [containerWidth]);

  return (
    <div className="gallery">
      <header className="gallery__header">
        <h1 className="gallery__title">Polaroid Gallery</h1>
        <div className="gallery__divider" />
      </header>
      <div
        ref={containerRef}
        className="gallery__grid"
        style={{
          height: gridHeight,
          position: 'relative',
        }}
      >
        {positions.map((pos, index) => (
          <PhotoCard
            key={photos[index].id}
            photo={photos[index]}
            delay={index * 50}
            style={{
              position: 'absolute',
              top: pos.top,
              left: pos.left,
              width: pos.width,
              height: pos.height,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default Gallery;
