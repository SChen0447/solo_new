import React, { useRef, useCallback } from 'react';
import { ASCII_CHARS, ASCIIBrushConfig, Point } from './types';

interface ASCIIBrushProps {
  isActive: boolean;
  selectedChar: string;
  fontSize: number;
  color: string;
  onToggle: (active: boolean) => void;
  onCharChange: (char: string) => void;
  onFontSizeChange: (size: number) => void;
  onColorChange: (color: string) => void;
}

export const ASCIIBrush: React.FC<ASCIIBrushProps> = ({
  isActive,
  selectedChar,
  fontSize,
  color,
  onToggle,
  onCharChange,
  onFontSizeChange,
  onColorChange
}) => {
  return (
    <div className="ascii-brush-panel">
      <h3 className="panel-title">ASCII 笔刷</h3>
      
      <button
        className={`brush-toggle-btn ${isActive ? 'active' : ''}`}
        onClick={() => onToggle(!isActive)}
      >
        {isActive ? '✏️ 绘制中' : '✏️ 开始绘制'}
      </button>

      <div className="brush-settings">
        <label className="setting-label">选择字符</label>
        <div className="char-grid">
          {ASCII_CHARS.map((char) => (
            <button
              key={char}
              className={`char-btn ${selectedChar === char ? 'active' : ''}`}
              onClick={() => onCharChange(char)}
            >
              {char}
            </button>
          ))}
        </div>

        <label className="setting-label">字体大小: {fontSize}px</label>
        <input
          type="range"
          min="8"
          max="32"
          value={fontSize}
          onChange={(e) => onFontSizeChange(Number(e.target.value))}
          className="slider"
        />

        <label className="setting-label">颜色</label>
        <div className="color-picker-wrapper">
          <input
            type="color"
            value={color}
            onChange={(e) => onColorChange(e.target.value)}
            className="color-picker"
          />
          <span className="color-value">{color}</span>
        </div>
      </div>

      {isActive && (
        <div className="brush-hint">
          💡 在画布上拖动鼠标绘制 {selectedChar} 字符
        </div>
      )}
    </div>
  );
};

export const useASCIIBrushHandlers = (
  isActive: boolean,
  onDraw: (position: Point, config: ASCIIBrushConfig) => void,
  config: ASCIIBrushConfig
) => {
  const lastDrawPos = useRef<Point | null>(null);
  const totalDistance = useRef(0);

  const calculateDistance = (p1: Point, p2: Point): number => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  };

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isActive) return;

    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const currentPos: Point = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };

    if (lastDrawPos.current === null) {
      onDraw(currentPos, config);
      lastDrawPos.current = currentPos;
      totalDistance.current = 0;
    } else {
      const distance = calculateDistance(lastDrawPos.current, currentPos);
      totalDistance.current += distance;

      while (totalDistance.current >= config.spacing) {
        const ratio = config.spacing / totalDistance.current;
        const interpolatedPos: Point = {
          x: lastDrawPos.current.x + (currentPos.x - lastDrawPos.current.x) * ratio,
          y: lastDrawPos.current.y + (currentPos.y - lastDrawPos.current.y) * ratio
        };
        onDraw(interpolatedPos, config);
        lastDrawPos.current = interpolatedPos;
        totalDistance.current -= config.spacing;
      }
    }
  }, [isActive, onDraw, config]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isActive) return;
    e.preventDefault();
    lastDrawPos.current = null;
    totalDistance.current = 0;
    handleMouseMove(e);
  }, [isActive, handleMouseMove]);

  const handleMouseUp = useCallback(() => {
    lastDrawPos.current = null;
    totalDistance.current = 0;
  }, []);

  const handleMouseLeave = useCallback(() => {
    lastDrawPos.current = null;
    totalDistance.current = 0;
  }, []);

  React.useEffect(() => {
    if (!isActive) {
      lastDrawPos.current = null;
      totalDistance.current = 0;
    }
  }, [isActive]);

  return {
    handleMouseMove,
    handleMouseDown,
    handleMouseUp,
    handleMouseLeave
  };
};
