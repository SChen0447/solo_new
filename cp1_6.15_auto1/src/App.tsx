import { useEffect, useRef, useCallback } from 'react';
import { Toolbar } from './components/Toolbar';
import { PalettePreview } from './components/PalettePreview';
import { useStore } from './store/useStore';
import { CanvasEngine } from './core/CanvasEngine';
import { generatePalettes } from './core/ColorPaletteEngine';
import type { Shape } from './types';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<CanvasEngine | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    shapes,
    currentTool,
    currentColor,
    lineWidth,
    zoom,
    offset,
    isSpacePressed,
    toast,
    isPanelCollapsed,
    isMobile,
    setTool,
    setColor,
    setLineWidth,
    addShape,
    updateShapes,
    undo,
    redo,
    setZoom,
    setOffset,
    setSpacePressed,
    setPalettes,
    setSelectedPaletteIndex,
    setIsMobile,
    setIsDrawing,
    setPreviewShape,
    showToast,
  } = useStore();

  const updatePalettes = useCallback(() => {
    const palettes = generatePalettes(currentColor, shapes);
    setPalettes(palettes);
  }, [currentColor, shapes, setPalettes]);

  useEffect(() => {
    updatePalettes();
  }, [updatePalettes]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new CanvasEngine();
    engine.init(canvasRef.current);
    engineRef.current = engine;

    engine.setOnShapeAdd((shape: Shape) => {
      addShape(shape);
    });

    engine.setOnStateChange(() => {
      if (engineRef.current) {
        setZoom(engineRef.current.getZoom());
        setOffset(engineRef.current.getOffset());
        setPreviewShape(engineRef.current.getPreviewShape());
      }
    });

    engine.setOnColorPick((color: string) => {
      setColor(color);
      setTool('rectangle');
      showToast('已拾取颜色', 'success');
    });

    engine.setShapes(shapes);
    engine.setTool(currentTool);
    engine.setColor(currentColor);
    engine.setLineWidth(lineWidth);
    engine.setZoom(zoom);
    engine.setOffset(offset);
    engine.setSpacePressed(isSpacePressed);

    const handleResize = () => {
      if (engineRef.current) {
        engineRef.current.resize();
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setShapes(shapes);
    }
  }, [shapes]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setTool(currentTool);
    }
  }, [currentTool]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setColor(currentColor);
    }
  }, [currentColor]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setLineWidth(lineWidth);
    }
  }, [lineWidth]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setSpacePressed(isSpacePressed);
    }
  }, [isSpacePressed]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isSpacePressed) {
        e.preventDefault();
        setSpacePressed(true);
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' || e.key === 'Z') {
          e.preventDefault();
          if (e.shiftKey) {
            redo();
          } else {
            undo();
          }
        }
        if (e.key === 'y' || e.key === 'Y') {
          e.preventDefault();
          redo();
        }
      }

      if (e.key === 'r' || e.key === 'R') {
        if (!e.ctrlKey && !e.metaKey) {
          setTool('rectangle');
        }
      }
      if (e.key === 'c' || e.key === 'C') {
        if (!e.ctrlKey && !e.metaKey) {
          setTool('circle');
        }
      }
      if (e.key === 'p' || e.key === 'P') {
        if (!e.ctrlKey && !e.metaKey) {
          setTool('polygon');
        }
      }
      if (e.key === 'f' || e.key === 'F') {
        if (!e.ctrlKey && !e.metaKey) {
          setTool('freehand');
        }
      }
      if (e.key === 'i' || e.key === 'I') {
        if (!e.ctrlKey && !e.metaKey) {
          setTool('eyedropper');
        }
      }

      if (e.key === 'Escape') {
        if (currentTool === 'polygon' && engineRef.current) {
          engineRef.current.resetPolygon();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isSpacePressed, setSpacePressed, undo, redo, setTool, currentTool, showToast]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, [setIsMobile]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (engineRef.current) {
      engineRef.current.handleMouseDown(e);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (engineRef.current) {
      engineRef.current.handleMouseMove(e);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (engineRef.current) {
      engineRef.current.handleMouseUp(e);
    }
  };

  const handleMouseLeave = () => {
    if (engineRef.current) {
      engineRef.current.handleMouseLeave();
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (engineRef.current) {
      engineRef.current.handleWheel(e);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (engineRef.current) {
      engineRef.current.handleDoubleClick(e);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        backgroundColor: '#1a1a1a',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      <Toolbar />

      <div
        style={{
          flex: 1,
          position: 'relative',
          backgroundColor: '#f5f5f5',
          overflow: 'hidden',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            cursor: isSpacePressed ? 'grab' : 'crosshair',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onWheel={handleWheel}
          onDoubleClick={handleDoubleClick}
        />

        {toast.visible && (
          <div
            style={{
              position: 'fixed',
              top: toast.visible ? '20px' : '-50px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: toast.type === 'success' ? '#22c55e' : toast.type === 'error' ? '#ef4444' : '#3b82f6',
              color: '#fff',
              padding: '10px 20px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              zIndex: 1000,
              opacity: toast.visible ? 1 : 0,
              transition: 'top 0.3s ease, opacity 0.3s ease',
              pointerEvents: 'none',
            }}
          >
            {toast.message}
          </div>
        )}

        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            backgroundColor: 'rgba(44, 44, 44, 0.9)',
            color: '#e0e0e0',
            padding: '6px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            pointerEvents: 'none',
            backdropFilter: 'blur(4px)',
          }}
        >
          缩放: {Math.round(zoom * 100)}%
        </div>
      </div>

      <PalettePreview />
    </div>
  );
}

export default App;
