import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { ColorStop, Star } from './types';

interface ColorPaletteProps {
  colors: string[];
  colorStops: ColorStop[];
  starIntensity: number;
  onFavorite: () => void;
}

const starColors = ['#ffd700', '#00d4aa', '#ff6b6b'];

export const ColorPalette: React.FC<ColorPaletteProps> = ({
  colors,
  colorStops,
  starIntensity,
  onFavorite
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const animationRef = useRef<number>();
  const [isFlipped, setIsFlipped] = useState(false);

  const generateStars = useCallback((intensity: number, width: number, height: number) => {
    const baseCount = 3 + Math.floor(intensity / 20) * 2;
    const starCount = Math.min(5, Math.max(3, baseCount));
    const stars: Star[] = [];
    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 2 + Math.random() * 4,
        color: starColors[Math.floor(Math.random() * starColors.length)],
        brightness: 0.6 + (intensity / 100) * 0.4,
        twinkleSpeed: 0.8 + Math.random() * 1.5
      });
    }
    starsRef.current = stars;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = 0;
    const targetFPS = 30;
    const frameInterval = 1000 / targetFPS;

    const animate = (currentTime: number) => {
      animationRef.current = requestAnimationFrame(animate);
      
      if (currentTime - lastTime < frameInterval) return;
      lastTime = currentTime;

      const startTime = performance.now();

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      const width = rect.width;
      const height = rect.height;

      if (starsRef.current.length === 0) {
        generateStars(starIntensity, width, height);
      }

      ctx.clearRect(0, 0, width, height);

      if (colorStops.length > 0) {
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        colorStops.forEach(stop => {
          gradient.addColorStop(stop.position, stop.color);
        });
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      }

      const time = currentTime / 1000;
      starsRef.current.forEach(star => {
        const twinkle = Math.sin(time * star.twinkleSpeed) * 0.4 + 0.6;
        const brightness = star.brightness * twinkle;
        const glowSize = star.size * (1 + starIntensity / 200);
        
        const glow = ctx.createRadialGradient(
          star.x, star.y, 0,
          star.x, star.y, glowSize * 2
        );
        glow.addColorStop(0, star.color + Math.floor(brightness * 200).toString(16).padStart(2, '0'));
        glow.addColorStop(0.5, star.color + Math.floor(brightness * 100).toString(16).padStart(2, '0'));
        glow.addColorStop(1, 'transparent');
        
        ctx.beginPath();
        ctx.arc(star.x, star.y, glowSize * 2, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size * brightness, 0, Math.PI * 2);
        ctx.fillStyle = star.color;
        ctx.fill();
      });

      const drawTime = performance.now() - startTime;
      if (drawTime > 12) {
        console.warn(`Canvas render took ${drawTime.toFixed(2)}ms, target is <12ms`);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [colorStops, starIntensity, generateStars]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      generateStars(starIntensity, rect.width, rect.height);
    }
  }, [starIntensity, generateStars]);

  const handleFavoriteClick = () => {
    setIsFlipped(true);
    onFavorite();
    setTimeout(() => setIsFlipped(false), 1500);
  };

  return (
    <div className="color-palette-container">
      <div className={`palette-card ${isFlipped ? 'flipped' : ''}`}>
        <div className="palette-card-inner">
          <div className="palette-card-front">
            <canvas ref={canvasRef} className="palette-canvas" />
            <div className="palette-overlay">
              <div className="palette-colors">
                {colors.map((color, index) => (
                  <div
                    key={index}
                    className="color-dot"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="palette-card-back">
            <div className="back-content">
              <div className="back-title">✦ 光谱已记录 ✦</div>
              <div className="back-colors">
                {colors.map((color, index) => (
                  <div key={index} className="back-color-item">
                    <div className="back-color-swatch" style={{ backgroundColor: color }} />
                    <span className="back-color-hex">{color.toUpperCase()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <button
        className="favorite-button"
        onClick={handleFavoriteClick}
      >
        <span className="star-icon">★</span>
        记录光谱
      </button>

      <style>{`
        .color-palette-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }

        .palette-card {
          width: 100%;
          max-width: 500px;
          aspect-ratio: 16 / 10;
          perspective: 1000px;
          cursor: pointer;
        }

        .palette-card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
          transform-style: preserve-3d;
        }

        .palette-card.flipped .palette-card-inner {
          transform: rotateY(180deg);
        }

        .palette-card-front,
        .palette-card-back {
          position: absolute;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5),
                      0 0 60px rgba(74, 74, 255, 0.2);
          border: 1px solid rgba(74, 74, 255, 0.4);
        }

        .palette-card-front {
          background: #0a0a23;
        }

        .palette-card-back {
          background: linear-gradient(135deg, #1a1a3e 0%, #2a1a4a 100%);
          transform: rotateY(180deg);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .back-content {
          text-align: center;
          padding: 24px;
        }

        .back-title {
          font-size: 20px;
          font-weight: 700;
          color: #ffd700;
          text-shadow: 0 0 20px rgba(255, 215, 0, 0.6);
          margin-bottom: 20px;
          letter-spacing: 2px;
        }

        .back-colors {
          display: flex;
          gap: 16px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .back-color-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .back-color-swatch {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
          border: 2px solid rgba(255, 255, 255, 0.3);
        }

        .back-color-hex {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          color: rgba(224, 224, 255, 0.8);
          letter-spacing: 1px;
        }

        .palette-canvas {
          width: 100%;
          height: 100%;
          display: block;
        }

        .palette-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 16px;
          background: linear-gradient(transparent, rgba(10, 10, 35, 0.8));
        }

        .palette-colors {
          display: flex;
          gap: 8px;
          justify-content: center;
        }

        .color-dot {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.6);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
          transition: transform 0.2s ease;
        }

        .color-dot:hover {
          transform: scale(1.2);
        }

        .favorite-button {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 32px;
          font-size: 16px;
          font-weight: 600;
          color: #fff;
          background: linear-gradient(135deg, #4a4aff 0%, #6b4aff 100%);
          border: none;
          border-radius: 12px;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(74, 74, 255, 0.4),
                      0 0 40px rgba(74, 74, 255, 0.2);
          transition: all 0.3s ease;
        }

        .favorite-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 30px rgba(74, 74, 255, 0.6),
                      0 0 60px rgba(74, 74, 255, 0.3);
        }

        .favorite-button:active {
          transform: translateY(0);
        }

        .star-icon {
          font-size: 20px;
          color: #ffd700;
          text-shadow: 0 0 10px rgba(255, 215, 0, 0.8);
        }

        @media (max-width: 768px) {
          .palette-card {
            max-width: 300px;
          }

          .palette-colors {
            gap: 6px;
          }

          .color-dot {
            width: 18px;
            height: 18px;
          }

          .favorite-button {
            padding: 12px 24px;
            font-size: 14px;
          }

          .back-title {
            font-size: 16px;
          }

          .back-color-swatch {
            width: 32px;
            height: 32px;
          }

          .back-color-hex {
            font-size: 10px;
          }
        }
      `}</style>
    </div>
  );
};
