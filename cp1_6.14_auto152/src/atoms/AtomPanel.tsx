import React, { useState } from 'react';
import { ELEMENT_COLORS, DEFAULT_ELEMENTS } from '@utils/elementColors';

interface AtomPanelProps {
  onDragStart: (element: string) => void;
  onDragEnd: () => void;
  isPanelOpen?: boolean;
  onTogglePanel?: () => void;
}

export const AtomPanel: React.FC<AtomPanelProps> = ({
  onDragStart,
  onDragEnd,
  isPanelOpen = true,
  onTogglePanel,
}) => {
  const [draggedElement, setDraggedElement] = useState<string | null>(null);

  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    element: string
  ) => {
    setDraggedElement(element);
    onDragStart(element);
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', element);
    const img = document.createElement('div');
    img.style.width = '1px';
    img.style.height = '1px';
    document.body.appendChild(img);
    e.dataTransfer.setDragImage(img, 0, 0);
    document.body.removeChild(img);
  };

  const handleDragEnd = () => {
    setDraggedElement(null);
    onDragEnd();
  };

  return (
    <div
      className={`atom-panel ${isPanelOpen ? 'open' : 'collapsed'}`}
      style={{
        width: isPanelOpen ? '220px' : '48px',
        minWidth: isPanelOpen ? '220px' : '48px',
      }}
    >
      <div className="panel-header">
        {isPanelOpen && <span className="panel-title">元素库</span>}
        {onTogglePanel && (
          <button
            className="panel-toggle-btn"
            onClick={onTogglePanel}
            title={isPanelOpen ? '收起面板' : '展开面板'}
          >
            {isPanelOpen ? '◀' : '▶'}
          </button>
        )}
      </div>
      <div className="panel-content">
        <div className="atom-grid">
          {DEFAULT_ELEMENTS.map((symbol) => {
            const elem = ELEMENT_COLORS[symbol];
            const isDragging = draggedElement === symbol;
            return (
              <div
                key={symbol}
                className={`atom-item ${isDragging ? 'dragging' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, symbol)}
                onDragEnd={handleDragEnd}
              >
                <div
                  className="atom-icon"
                  style={{
                    backgroundColor: elem.color,
                    boxShadow:
                      elem.color === '#FFFFFF'
                        ? 'inset 0 0 0 2px #555'
                        : 'inset 0 -2px 6px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.2)',
                  }}
                >
                  <span
                    className="atom-symbol"
                    style={{
                      color:
                        elem.color === '#FFFFFF' ||
                        elem.color === '#FFFF30'
                          ? '#222'
                          : '#fff',
                    }}
                  >
                    {elem.symbol}
                  </span>
                </div>
                {isPanelOpen && (
                  <span className="atom-name">{elem.name}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AtomPanel;
