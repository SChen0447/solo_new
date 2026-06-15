import { useState, useRef } from 'react';
import type { Color } from '../colorExtractor';

interface ColorPaletteProps {
  colors: Color[];
  variant?: 'circles' | 'bars';
  showRatio?: boolean;
  onColorClick?: (color: Color) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
  draggable?: boolean;
}

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

export const ColorPalette = ({
  colors,
  variant = 'circles',
  showRatio = false,
  onColorClick,
  onReorder,
  draggable = false
}: ColorPaletteProps) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleColorClick = async (color: Color, index: number) => {
    if (onColorClick) {
      onColorClick(color);
    }

    const success = await copyToClipboard(color.hex);
    if (success) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setCopiedIndex(index);
      timeoutRef.current = setTimeout(() => {
        setCopiedIndex(null);
      }, 1200);
    }
  };

  const handleDragStart = (index: number) => {
    if (!draggable) return;
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (!draggable || dragIndex === null || dragIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDrop = (index: number) => {
    if (!draggable || dragIndex === null || dragIndex === index) return;
    if (onReorder) {
      onReorder(dragIndex, index);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  if (variant === 'bars') {
    return (
      <div className="color-palette-bars">
        {colors.map((color, index) => (
          <div
            key={index}
            className="color-bar-item"
            style={{
              animationDelay: `${index * 0.1}s`,
              opacity: dragIndex === index ? 0.5 : 1
            }}
            onClick={() => handleColorClick(color, index)}
            draggable={draggable}
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={() => handleDrop(index)}
            onDragEnd={handleDragEnd}
          >
            <div
              className={`color-bar ${dragOverIndex === index ? 'drag-over' : ''}`}
              style={{ backgroundColor: color.hex }}
            />
            <span className="color-hex">{color.hex.toUpperCase()}</span>
            {copiedIndex === index && (
              <span className="copy-tooltip">已复制</span>
            )}
          </div>
        ))}
        <style>{`
          .color-palette-bars {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
          }
          .color-bar-item {
            position: relative;
            flex: 1;
            min-width: 60px;
            cursor: pointer;
            animation: fadeInUp 0.5s ease forwards;
            opacity: 0;
          }
          .color-bar {
            height: 20px;
            width: 100%;
            border-radius: 4px;
            transition: transform 0.2s, box-shadow 0.2s;
            border: 1px solid #555;
          }
          .color-bar:hover {
            transform: scaleY(1.2);
            box-shadow: 0 2px 8px rgba(100, 181, 246, 0.3);
          }
          .color-bar.drag-over {
            outline: 2px solid #64b5f6;
            outline-offset: 2px;
          }
          .color-hex {
            display: block;
            text-align: center;
            font-size: 10px;
            color: #e0e0e0;
            margin-top: 4px;
            font-family: monospace;
          }
          .copy-tooltip {
            position: absolute;
            top: -24px;
            left: 50%;
            transform: translateX(-50%);
            background: #64b5f6;
            color: #fff;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 10px;
            white-space: nowrap;
            animation: fadeIn 0.2s ease;
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateX(-50%) translateY(4px); }
            to { opacity: 1; transform: translateX(-50%) translateY(0); }
          }
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateX(-10px); }
            to { opacity: 1; transform: translateX(0); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="color-palette-circles">
      {colors.map((color, index) => (
        <div
          key={index}
          className="color-circle-item"
          style={{
            animationDelay: `${index * 0.1}s`,
            opacity: dragIndex === index ? 0.3 : 1
          }}
          draggable={draggable}
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDrop={() => handleDrop(index)}
          onDragEnd={handleDragEnd}
        >
          <div
            className={`color-circle ${dragOverIndex === index ? 'drag-over' : ''} ${draggable ? 'draggable' : ''}`}
            style={{ backgroundColor: color.hex }}
            onClick={() => handleColorClick(color, index)}
          >
            {copiedIndex === index && (
              <span className="copy-tooltip">已复制</span>
            )}
          </div>
          <div className="color-info">
            <span className="color-hex">{color.hex.toUpperCase()}</span>
            {showRatio && (
              <span className="color-ratio">{(color.ratio * 100).toFixed(1)}%</span>
            )}
          </div>
        </div>
      ))}
      <style>{`
        .color-palette-circles {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
          justify-content: flex-start;
        }
        .color-circle-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          animation: fadeInLeft 0.5s ease forwards;
          opacity: 0;
        }
        .color-circle {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 2px solid #ddd;
          cursor: pointer;
          position: relative;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .color-circle:hover {
          transform: scale(1.1);
          box-shadow: 0 2px 12px rgba(100, 181, 246, 0.4);
        }
        .color-circle.draggable {
          cursor: grab;
        }
        .color-circle.draggable:active {
          cursor: grabbing;
        }
        .color-circle.drag-over {
          outline: 2px dashed #64b5f6;
          outline-offset: 4px;
        }
        .color-info {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }
        .color-hex {
          font-size: 11px;
          color: #e0e0e0;
          font-family: monospace;
        }
        .color-ratio {
          font-size: 10px;
          color: #888;
        }
        .copy-tooltip {
          position: absolute;
          top: -28px;
          left: 50%;
          transform: translateX(-50%);
          background: #64b5f6;
          color: #fff;
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 11px;
          white-space: nowrap;
          animation: fadeIn 0.2s ease;
          pointer-events: none;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(4px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes fadeInLeft {
          from { opacity: 0; transform: translateX(-15px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};
