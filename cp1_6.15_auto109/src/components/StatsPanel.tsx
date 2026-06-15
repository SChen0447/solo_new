import { useEffect, useRef, useState, useCallback } from 'react';
import type { ColorResult, CompositionResult } from '../types';
import { generateColorAdvice } from '../analyzer/ColorAnalyzer';

const HISTOGRAM_WIDTH = 640;
const HISTOGRAM_HEIGHT = 200;
const BIN_WIDTH = 2;
const PALETTE_SIZE = 40;

interface Props {
  color: ColorResult | null;
  composition: CompositionResult | null;
}

function interpolateColor(t: number): string {
  const r = Math.round(t * 255);
  const g = Math.round((1 - Math.abs(t - 0.5) * 2) * 123);
  const b = Math.round((1 - t) * 255);
  return `rgb(${r}, ${g}, ${b})`;
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function StatsPanel({ color, composition }: Props) {
  const histogramCanvasRef = useRef<HTMLCanvasElement>(null);
  const [displayScore, setDisplayScore] = useState(0);
  const animationRef = useRef<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const drawHistogram = useCallback((histogram: number[]) => {
    const canvas = histogramCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const displayWidth = Math.min(HISTOGRAM_WIDTH, panelRef.current?.clientWidth || HISTOGRAM_WIDTH);
    const actualBinWidth = displayWidth / 256;
    
    canvas.width = displayWidth;
    canvas.height = HISTOGRAM_HEIGHT;

    ctx.fillStyle = '#16213e';
    ctx.fillRect(0, 0, displayWidth, HISTOGRAM_HEIGHT);

    for (let i = 0; i < 256; i++) {
      const value = histogram[i] || 0;
      const barHeight = value * HISTOGRAM_HEIGHT;
      const x = i * actualBinWidth;
      const y = HISTOGRAM_HEIGHT - barHeight;
      
      const color = interpolateColor(i / 255);
      ctx.fillStyle = color;
      ctx.fillRect(x, y, actualBinWidth, barHeight);
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = (HISTOGRAM_HEIGHT / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(displayWidth, y);
      ctx.stroke();
    }
  }, []);

  const animateScore = useCallback((targetScore: number) => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const startTime = performance.now();
    const startValue = displayScore;
    const duration = 1000;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOut(progress);
      const currentValue = Math.round(startValue + (targetScore - startValue) * easedProgress);
      
      setDisplayScore(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [displayScore]);

  useEffect(() => {
    if (color?.histogram) {
      let frameCount = 0;
      const startFrame = performance.now();
      
      const renderFrame = () => {
        drawHistogram(color.histogram);
        frameCount++;
        
        if (frameCount < 2) {
          requestAnimationFrame(renderFrame);
        } else {
          const endFrame = performance.now();
          const fps = (frameCount / (endFrame - startFrame)) * 1000;
          console.log(`直方图渲染帧率: ${fps.toFixed(1)}fps`);
        }
      };
      
      requestAnimationFrame(renderFrame);
    }
  }, [color, drawHistogram]);

  useEffect(() => {
    if (composition) {
      animateScore(composition.score);
    } else {
      setDisplayScore(0);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [composition, animateScore]);

  const fullAdvice = composition && color
    ? `${composition.advice}。${generateColorAdvice(color.palette, composition.score)}`
    : '';

  return (
    <div className="stats-panel" ref={panelRef}>
      <div className="stats-section">
        <h3 className="stats-title">亮度直方图</h3>
        <div className="histogram-container">
          <canvas
            ref={histogramCanvasRef}
            width={HISTOGRAM_WIDTH}
            height={HISTOGRAM_HEIGHT}
            className="histogram-canvas"
          />
          <div className="histogram-labels">
            <span>暗</span>
            <span>亮</span>
          </div>
        </div>
      </div>

      <div className="stats-section">
        <h3 className="stats-title">主导色彩</h3>
        <div className="palette-container">
          {color?.palette.map((colorHex, index) => (
            <div key={index} className="palette-item">
              <div
                className="palette-color"
                style={{
                  width: `${PALETTE_SIZE}px`,
                  height: `${PALETTE_SIZE}px`,
                  backgroundColor: colorHex,
                  borderRadius: '8px',
                }}
              />
              <span className="palette-hex">{colorHex}</span>
            </div>
          ))}
          {!color?.palette && (
            <div className="palette-placeholder">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="palette-skeleton"
                  style={{
                    width: `${PALETTE_SIZE}px`,
                    height: `${PALETTE_SIZE}px`,
                    borderRadius: '8px',
                    backgroundColor: '#2a2a4a',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="stats-section">
        <h3 className="stats-title">构图评分</h3>
        <div className="score-container">
          <span className="score-number">{displayScore}</span>
          <span className="score-max">/100</span>
        </div>
      </div>

      <div className="stats-section">
        <h3 className="stats-title">调整建议</h3>
        <p className="advice-text">
          {composition && color ? (
            fullAdvice
          ) : (
            <span className="advice-placeholder">上传照片后自动生成建议...</span>
          )}
        </p>
      </div>
    </div>
  );
}
