import React, { useState, useRef } from 'react';
import { CanvasState } from './types';
import { CanvasEngine } from './CanvasEngine';

interface LayerPanelProps {
  state: CanvasState;
  engine: CanvasEngine | null;
  onLayerReorder: (fromIndex: number, toIndex: number) => void;
  onOpacityChange: (layerId: string, opacity: number) => void;
  onVisibilityToggle: (layerId: string) => void;
  onActiveLayerChange: (layerId: string) => void;
}

export const LayerPanel: React.FC<LayerPanelProps> = ({
  state,
  engine,
  onLayerReorder,
  onOpacityChange,
  onVisibilityToggle,
  onActiveLayerChange
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [thumbnails, setThumbnails] = useState<Map<string, string>>(new Map());
  const dragItemRef = useRef<number | null>(null);

  React.useEffect(() => {
    if (!engine) return;
    const newThumbnails = new Map<string, string>();
    for (const layer of state.layers) {
      const thumb = engine.renderLayerThumbnail(layer.id, 96, 60);
      newThumbnails.set(layer.id, thumb);
    }
    setThumbnails(newThumbnails);
  }, [engine, state.layers]);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    dragItemRef.current = index;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    const fromIndex = dragItemRef.current;
    if (fromIndex !== null && fromIndex !== toIndex) {
      onLayerReorder(fromIndex, toIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
    dragItemRef.current = null;
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    dragItemRef.current = null;
  };

  const getLayerIcon = (type: string) => {
    switch (type) {
      case 'emoji':
        return '😊';
      case 'ascii':
        return '✏️';
      case 'background':
        return '🎨';
      default:
        return '📄';
    }
  };

  return (
    <div className="layer-panel">
      <h3 className="panel-title">图层管理</h3>
      
      <div className="layer-list">
        {[...state.layers].reverse().map((layer, displayIndex) => {
          const actualIndex = state.layers.length - 1 - displayIndex;
          const isActive = state.activeLayerId === layer.id;
          const isDragging = draggedIndex === actualIndex;
          const isDragOver = dragOverIndex === actualIndex;

          return (
            <div
              key={layer.id}
              className={`layer-item ${isActive ? 'active' : ''} ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''}`}
              draggable
              onDragStart={(e) => handleDragStart(e, actualIndex)}
              onDragOver={(e) => handleDragOver(e, actualIndex)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, actualIndex)}
              onDragEnd={handleDragEnd}
              onClick={() => onActiveLayerChange(layer.id)}
            >
              <div className="layer-drag-handle">⋮⋮</div>
              
              <div className="layer-thumbnail">
                {thumbnails.get(layer.id) ? (
                  <img src={thumbnails.get(layer.id)!} alt={layer.name} />
                ) : (
                  <div className="thumbnail-placeholder">
                    {getLayerIcon(layer.type)}
                  </div>
                )}
              </div>

              <div className="layer-info">
                <div className="layer-name">
                  <span className="layer-type-icon">{getLayerIcon(layer.type)}</span>
                  {layer.name}
                </div>
                <div className="layer-controls">
                  <button
                    className={`visibility-btn ${layer.visible ? 'visible' : 'hidden'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onVisibilityToggle(layer.id);
                    }}
                    title={layer.visible ? '隐藏图层' : '显示图层'}
                  >
                    {layer.visible ? '👁️' : '👁️‍🗨️'}
                  </button>
                  
                  <div className="opacity-control">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={layer.opacity}
                      onChange={(e) => {
                        e.stopPropagation();
                        onOpacityChange(layer.id, Number(e.target.value));
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="opacity-slider"
                    />
                    <span className="opacity-value">{layer.opacity}%</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="layer-actions">
        <button
          className="add-layer-btn"
          onClick={() => {
            if (engine && state.layers.length < 5) {
              const types: ('emoji' | 'ascii' | 'background')[] = ['emoji', 'ascii', 'background'];
              const randomType = types[Math.floor(Math.random() * types.length)];
              try {
                engine.addLayer(randomType);
              } catch (e) {
                console.warn(e);
              }
            }
          }}
          disabled={state.layers.length >= 5}
        >
          ➕ 添加图层 ({state.layers.length}/5)
        </button>
      </div>
    </div>
  );
};
