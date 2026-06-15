import { useEffect, useRef, useState, useCallback } from 'react';
import { useColorStore } from './store/colorStore';
import { SvgManager } from './SvgManager';
import { getLayerAdjacencyWarnings, SVG_LAYERS } from './utils/colorUtils';
import type { SvgLayerId } from './types';

export const ColorPreview: React.FC = () => {
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const svgManagerRef = useRef<SvgManager | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  const colorMapping = useColorStore((state) => state.colorMapping);
  const selectedLayer = useColorStore((state) => state.selectedLayer);
  const selectedColor = useColorStore((state) => state.selectedColor);
  const setSelectedLayer = useColorStore((state) => state.setSelectedLayer);
  const applyColorToLayer = useColorStore((state) => state.applyColorToLayer);

  useEffect(() => {
    if (!svgContainerRef.current) return;

    const manager = new SvgManager();
    svgManagerRef.current = manager;
    manager.mount(svgContainerRef.current);

    manager.setOnLayerClick((layerId: SvgLayerId) => {
      setSelectedLayer(layerId);
      if (selectedColor) {
        applyColorToLayer(selectedColor, layerId);
      }
    });

    manager.applyColorMapping(colorMapping);
    manager.setSelectedLayer(selectedLayer);

    const warnings = getLayerAdjacencyWarnings(colorMapping);
    manager.updateContrastWarnings(warnings);

    return () => {
      manager.unmount();
      svgManagerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (svgManagerRef.current) {
      svgManagerRef.current.applyColorMapping(colorMapping);
    }
  }, [colorMapping]);

  useEffect(() => {
    if (svgManagerRef.current) {
      svgManagerRef.current.setSelectedLayer(selectedLayer);
    }
  }, [selectedLayer]);

  useEffect(() => {
    if (svgManagerRef.current) {
      const warnings = getLayerAdjacencyWarnings(colorMapping);
      svgManagerRef.current.updateContrastWarnings(warnings);
    }
  }, [colorMapping]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setScale((prev) => {
        const next = Math.max(0.5, Math.min(2, prev + delta));
        return next;
      });
    },
    []
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('.svg-layer, [data-warning-layer]')) return;

    isPanning.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    setTranslate((prev) => ({
      x: prev.x + dx,
      y: prev.y + dy
    }));
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isPanning.current = false;
  };

  const handleMouseLeave = () => {
    isPanning.current = false;
  };

  const handleDoubleClick = () => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  };

  const currentLayerName = selectedLayer
    ? SVG_LAYERS.find((l) => l.id === selectedLayer)?.name
    : null;
  const currentLayerColor = selectedLayer ? colorMapping[selectedLayer] : null;

  return (
    <main className="canvas-panel">
      <div
        className="canvas-wrapper"
        ref={wrapperRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
      >
        <div
          className="canvas-svg-container"
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`
          }}
        >
          <div
            ref={svgContainerRef}
            style={{
              width: 400,
              height: 500,
              filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.15))'
            }}
          />
        </div>
      </div>

      {currentLayerName && (
        <div className="layer-info-panel">
          <span className="layer-info-label">
            当前图层：{currentLayerName}
          </span>
          {currentLayerColor && (
            <span>
              <span
                className="layer-info-color"
                style={{ backgroundColor: currentLayerColor }}
              />
              {currentLayerColor.toUpperCase()}
            </span>
          )}
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          right: '20px',
          bottom: '20px',
          background: 'rgba(255,255,255,0.95)',
          padding: '8px 14px',
          borderRadius: '8px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
          fontSize: '12px',
          color: '#666'
        }}
      >
        缩放：{(scale * 100).toFixed(0)}% | 双击重置
      </div>

      <div
        style={{
          position: 'absolute',
          left: '20px',
          top: '76px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}
      >
        <button
          className="btn-secondary"
          style={{ padding: '6px 12px', fontSize: '12px' }}
          onClick={() => {
            setScale((prev) => Math.min(2, prev + 0.1));
          }}
        >
          放大 +
        </button>
        <button
          className="btn-secondary"
          style={{ padding: '6px 12px', fontSize: '12px' }}
          onClick={() => {
            setScale((prev) => Math.max(0.5, prev - 0.1));
          }}
        >
          缩小 -
        </button>
        <button
          className="btn-secondary"
          style={{ padding: '6px 12px', fontSize: '12px' }}
          onClick={() => {
            setScale(1);
            setTranslate({ x: 0, y: 0 });
          }}
        >
          重置
        </button>
      </div>
    </main>
  );
};
