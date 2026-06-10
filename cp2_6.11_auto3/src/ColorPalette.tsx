import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { ColorStop, Star } from './types';

interface ColorPaletteProps {
  colors: string[];
  colorStops: ColorStop[];
  density: number;
  starIntensity: number;
  darkMatter: number;
  onFavorite: () => void;
}

const starColors = ['#ffd700', '#00d4aa', '#ff6b6b'];

const TARGET_FRAME_BUDGET = 12;
const ADAPTIVE_COOLDOWN = 500;

export const ColorPalette: React.FC<ColorPaletteProps> = ({
  colors,
  colorStops,
  density,
  starIntensity,
  darkMatter,
  onFavorite
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const animationRef = useRef<number>();
  const qualityRef = useRef({ dprScale: 1, maxStars: 60 });
  const lastAdaptTimeRef = useRef(0);
  const frameTimeHistoryRef = useRef<number[]>([]);
  const [isFlipped, setIsFlipped] = useState(false);

  const generateStars = useCallback((densityVal: number, width: number, height: number) => {
    const starCount = Math.floor(10 + densityVal * 0.5);
    const clampedCount = Math.min(starCount, qualityRef.current.maxStars);
    const stars: Star[] = [];
    for (let i = 0; i < clampedCount; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 2 + Math.random() * 4,
        color: starColors[Math.floor(Math.random() * starColors.length)],
        brightness: 0.6 + (starIntensity / 100) * 0.4,
        twinkleSpeed: 0.8 + Math.random() * 1.5
      });
    }
    starsRef.current = stars;
  }, [starIntensity]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    generateStars(density, rect.width, rect.height);
  }, [density, generateStars]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = 0;
    const targetFPS = 30;
    const frameInterval = 1000 / targetFPS;

    const adaptQuality = (frameTime: number) => {
      const now = performance.now();
      if (now - lastAdaptTimeRef.current < ADAPTIVE_COOLDOWN) return;

      frameTimeHistoryRef.current.push(frameTime);
      if (frameTimeHistoryRef.current.length > 10) {
        frameTimeHistoryRef.current.shift();
      }

      const avgFrameTime = frameTimeHistoryRef.current.reduce((a, b) => a + b, 0) / frameTimeHistoryRef.current.length;

      if (avgFrameTime > TARGET_FRAME_BUDGET && frameTimeHistoryRef.current.length >= 3) {
        lastAdaptTimeRef.current = now;
        const q = qualityRef.current;

        if (q.maxStars > 10) {
          q.maxStars = Math.max(10, Math.floor(q.maxStars * 0.7));
        } else if (q.dprScale > 0.5) {
          q.dprScale = Math.max(0.5, q.dprScale - 0.1);
        }

        const rect = canvas.getBoundingClientRect();
        generateStars(density, rect.width, rect.height);
      } else if (avgFrameTime < TARGET_FRAME_BUDGET * 0.5 && frameTimeHistoryRef.current.length >= 5) {
        lastAdaptTimeRef.current = now;
        const q = qualityRef.current;
        const needsRegen = q.maxStars < 60 || q.dprScale < 1;

        q.maxStars = Math.min(60, Math.floor(q.maxStars * 1.3));
        q.dprScale = Math.min(1, q.dprScale + 0.05);

        if (needsRegen) {
          const rect = canvas.getBoundingClientRect();
          generateStars(density, rect.width, rect.height);
        }
      }
    };

    const animate = (currentTime: number) => {
      animationRef.current = requestAnimationFrame(animate);

      if (currentTime - lastTime < frameInterval) return;
      lastTime = currentTime;

      const renderStart = performance.now();

      const baseDpr = window.devicePixelRatio || 1;
      const dpr = baseDpr * qualityRef.current.dprScale;
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);

      ctx.clearRect(0, 0, width, height);

      const darkRatio = darkMatter / 100;
      const bgGrad = ctx.createRadialGradient(
        width * 0.5, height * 0.5, 0,
        width * 0.5, height * 0.5, Math.max(width, height) * 0.7
      );
      bgGrad.addColorStop(0, '#1a1a3e');
      bgGrad.addColorStop(Math.min(darkRatio * 0.6, 0.95), '#0d0d28');
      bgGrad.addColorStop(1, '#050510');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      if (colorStops.length > 0) {
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        colorStops.forEach(stop => {
          gradient.addColorStop(stop.position, stop.color);
        });
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        ctx.globalAlpha = 1;
      }

      const time = currentTime / 1000;
      starsRef.current.forEach(star => {
        const twinkle = Math.sin(time * star.twinkleSpeed) * 0.4 + 0.6;
        const brightness = star.brightness * twinkle;
        const glowSize = star.size * (1 + starIntensity / 200);

        const glow = ctx.createRadialGradient(
          star.x, star.y, 0,
          star.x, star.y, glowSize * 2.5
        );
        glow.addColorStop(0, star.color + Math.floor(brightness * 220).toString(16).padStart(2, '0'));
        glow.addColorStop(0.4, star.color + Math.floor(brightness * 120).toString(16).padStart(2, '0'));
        glow.addColorStop(1, star.color + '00');

        ctx.beginPath();
        ctx.arc(star.x, star.y, glowSize * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size * brightness, 0, Math.PI * 2);
        ctx.fillStyle = star.color;
        ctx.fill();
      });

      const frameTime = performance.now() - renderStart;
      adaptQuality(frameTime);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [colorStops, density, starIntensity, darkMatter, generateStars]);

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
