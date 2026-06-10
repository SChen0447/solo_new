import React, { useEffect, useRef, useCallback } from 'react';
import type { SliderValues, Star } from './types';

interface ColorSliderProps {
  values: SliderValues;
  onChange: (values: SliderValues) => void;
}

const sliderConfig = [
  { label: '恒星温度', min: 0, max: 100, color: '#ff6b6b' },
  { label: '星云密度', min: 0, max: 100, color: '#00d4aa' },
  { label: '星爆强度', min: 0, max: 100, color: '#ffd700' },
  { label: '暗物质比例', min: 0, max: 100, color: '#9b59b6' }
];

const starColors = ['#ffd700', '#00d4aa', '#ff6b6b'];

export const ColorSlider: React.FC<ColorSliderProps> = ({ values, onChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const animationRef = useRef<number>();

  const generateStars = useCallback((density: number) => {
    const starCount = Math.floor(10 + density * 0.5);
    const stars: Star[] = [];
    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 1 + Math.random() * 2,
        color: starColors[Math.floor(Math.random() * starColors.length)],
        brightness: 0.5 + Math.random() * 0.5,
        twinkleSpeed: 0.5 + Math.random() * 2
      });
    }
    starsRef.current = stars;
  }, []);

  useEffect(() => {
    generateStars(values[1]);
  }, [values[1], generateStars]);

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

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      const width = rect.width;
      const height = rect.height;

      ctx.clearRect(0, 0, width, height);

      const darkMatterRatio = values[3] / 100;
      const bgGradient = ctx.createRadialGradient(
        width / 2, height / 2, 0,
        width / 2, height / 2, Math.max(width, height) / 2
      );
      bgGradient.addColorStop(0, '#1a1a3e');
      bgGradient.addColorStop(darkMatterRatio * 0.6, '#12122a');
      bgGradient.addColorStop(1, '#0a0a1a');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      const time = currentTime / 1000;
      starsRef.current.forEach(star => {
        const twinkle = Math.sin(time * star.twinkleSpeed) * 0.3 + 0.7;
        const alpha = star.brightness * twinkle;
        ctx.beginPath();
        ctx.arc(
          (star.x / 100) * width,
          (star.y / 100) * height,
          star.size,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = star.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
        ctx.fill();
      });
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [values]);

  const handleSliderChange = (index: number, value: number) => {
    const newValues = [...values] as SliderValues;
    newValues[index] = value;
    onChange(newValues);
  };

  return (
    <div className="color-slider-container">
      <div className="slider-background">
        <canvas ref={canvasRef} className="slider-canvas" />
      </div>
      <div className="sliders-wrapper">
        {sliderConfig.map((config, index) => (
          <div key={config.label} className="slider-item">
            <div className="slider-label-row">
              <span className="slider-label" style={{ color: config.color }}>
                {config.label}
              </span>
              <span className="slider-value">{values[index]}</span>
            </div>
            <div className="slider-track-wrapper">
              <div 
                className="slider-track"
                style={{
                  background: `linear-gradient(to right, ${config.color}40, ${config.color}80)`,
                  boxShadow: `0 0 10px ${config.color}40`
                }}
              >
                <input
                  type="range"
                  min={config.min}
                  max={config.max}
                  value={values[index]}
                  onChange={(e) => handleSliderChange(index, Number(e.target.value))}
                  className="slider-input"
                  style={{
                    '--slider-color': config.color,
                    '--slider-progress': `${values[index]}%`
                  } as React.CSSProperties}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .color-slider-container {
          position: relative;
          border-radius: 16px;
          overflow: hidden;
          background: rgba(10, 10, 35, 0.6);
          border: 1px solid rgba(74, 74, 255, 0.3);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }

        .slider-background {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 0;
        }

        .slider-canvas {
          width: 100%;
          height: 100%;
          display: block;
        }

        .sliders-wrapper {
          position: relative;
          z-index: 1;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .slider-item {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .slider-label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .slider-label {
          font-size: 14px;
          font-weight: 600;
          text-shadow: 0 0 8px currentColor;
        }

        .slider-value {
          font-size: 13px;
          color: rgba(224, 224, 255, 0.7);
          font-family: 'Courier New', monospace;
          background: rgba(0, 0, 0, 0.3);
          padding: 2px 8px;
          border-radius: 4px;
        }

        .slider-track-wrapper {
          width: 100%;
        }

        .slider-track {
          position: relative;
          height: 6px;
          border-radius: 3px;
          overflow: visible;
        }

        .slider-input {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 6px;
          background: transparent;
          cursor: pointer;
          position: absolute;
          top: 0;
          left: 0;
          margin: 0;
        }

        .slider-input::-webkit-slider-runnable-track {
          width: 100%;
          height: 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }

        .slider-input::-moz-range-track {
          width: 100%;
          height: 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
          border: none;
        }

        .slider-input::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--slider-color);
          cursor: grab;
          margin-top: -6px;
          box-shadow: 0 0 12px var(--slider-color), 0 0 24px var(--slider-color);
          border: 2px solid rgba(255, 255, 255, 0.8);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .slider-input::-webkit-slider-thumb:hover {
          transform: scale(1.15);
          box-shadow: 0 0 16px var(--slider-color), 0 0 32px var(--slider-color);
        }

        .slider-input::-webkit-slider-thumb:active {
          cursor: grabbing;
          transform: scale(1.2);
        }

        .slider-input::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--slider-color);
          cursor: grab;
          border: 2px solid rgba(255, 255, 255, 0.8);
          box-shadow: 0 0 12px var(--slider-color), 0 0 24px var(--slider-color);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .slider-input::-moz-range-thumb:hover {
          transform: scale(1.15);
          box-shadow: 0 0 16px var(--slider-color), 0 0 32px var(--slider-color);
        }

        .slider-input::-moz-range-thumb:active {
          cursor: grabbing;
        }

        @media (max-width: 768px) {
          .sliders-wrapper {
            flex-direction: row;
            gap: 12px;
            padding: 16px;
            overflow-x: auto;
          }

          .slider-item {
            flex: 0 0 80px;
            flex-direction: column-reverse;
            align-items: center;
          }

          .slider-label-row {
            flex-direction: column;
            gap: 4px;
          }

          .slider-track-wrapper {
            height: 120px;
          }

          .slider-input {
            writing-mode: bt-lr;
            -webkit-appearance: slider-vertical;
            width: 6px;
            height: 100%;
          }

          .slider-track {
            width: 6px;
            height: 100%;
            background: linear-gradient(to top, var(--slider-color)40, var(--slider-color)80);
          }

          .slider-input::-webkit-slider-runnable-track {
            width: 6px;
            height: 100%;
          }

          .slider-label {
            font-size: 12px;
          }

          .slider-value {
            font-size: 11px;
          }
        }
      `}</style>
    </div>
  );
};
