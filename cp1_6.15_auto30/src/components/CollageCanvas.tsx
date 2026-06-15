import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useAppStore, CollageImage } from '../stores/appStore';
import { applyLayout, lerpImages } from '../utils/layoutEngine';

interface ContextMenuState {
  x: number;
  y: number;
  imageId: string;
}

const CollageCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const animationRef = useRef<number | null>(null);
  const animatingImagesRef = useRef<CollageImage[] | null>(null);
  const animStartTimeRef = useRef<number>(0);
  const animFromImagesRef = useRef<CollageImage[]>([]);
  const animToImagesRef = useRef<CollageImage[]>([]);

  const {
    images,
    setImages,
    selectedImageId,
    setSelectedImageId,
    updateImagePosition,
    updateImageRotation,
    updateImageScale,
    moveImageLayerUp,
    moveImageLayerDown,
    canvasWidth,
    canvasHeight,
    filter,
    frame,
    layoutStyle,
  } = useAppStore();

  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const loadImage = useCallback((url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const cached = imageCacheRef.current.get(url);
      if (cached && cached.complete) {
        resolve(cached);
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imageCacheRef.current.set(url, img);
        resolve(img);
      };
      img.onerror = reject;
      img.src = url;
    });
  }, []);

  const getCanvasCoords = useCallback((e: React.MouseEvent | MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const hitTestImage = useCallback(
    (x: number, y: number, img: CollageImage): boolean => {
      const centerX = img.x + (img.width * img.scale) / 2;
      const centerY = img.y + (img.height * img.scale) / 2;

      const rad = (-img.rotation * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      const localX = cos * (x - centerX) + sin * (y - centerY);
      const localY = -sin * (x - centerX) + cos * (y - centerY);

      const halfW = (img.width * img.scale) / 2;
      const halfH = (img.height * img.scale) / 2;

      return Math.abs(localX) <= halfW && Math.abs(localY) <= halfH;
    },
    []
  );

  const getTopImageAtPoint = useCallback(
    (x: number, y: number): CollageImage | null => {
      const sorted = [...images].sort((a, b) => b.zIndex - a.zIndex);
      for (const img of sorted) {
        if (hitTestImage(x, y, img)) {
          return img;
        }
      }
      return null;
    },
    [images, hitTestImage]
  );

  const drawCanvas = useCallback(
    (renderImages: CollageImage[]) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const sortedImages = [...renderImages].sort((a, b) => a.zIndex - b.zIndex);

      for (const img of sortedImages) {
        const cachedImg = imageCacheRef.current.get(img.url);
        if (!cachedImg) {
          loadImage(img.url).then(() => {
            drawCanvas(renderImages);
          });
          continue;
        }

        ctx.save();

        const scaledWidth = img.width * img.scale;
        const scaledHeight = img.height * img.scale;
        const centerX = img.x + scaledWidth / 2;
        const centerY = img.y + scaledHeight / 2;

        ctx.translate(centerX, centerY);
        ctx.rotate((img.rotation * Math.PI) / 180);

        ctx.drawImage(
          cachedImg,
          -scaledWidth / 2,
          -scaledHeight / 2,
          scaledWidth,
          scaledHeight
        );

        if (selectedImageId === img.id) {
          ctx.setLineDash([8, 4]);
          ctx.strokeStyle = '#d4a574';
          ctx.lineWidth = 2;
          ctx.strokeRect(
            -scaledWidth / 2 - 4,
            -scaledHeight / 2 - 4,
            scaledWidth + 8,
            scaledHeight + 8
          );
          ctx.setLineDash([]);
        }

        ctx.restore();
      }

      applyFilter(ctx, canvas.width, canvas.height, filter);
      drawFrame(ctx, canvas.width, canvas.height, frame);
    },
    [selectedImageId, filter, frame, loadImage]
  );

  const applyFilter = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    filterType: string
  ) => {
    if (filterType === 'none') return;

    ctx.save();
    ctx.globalCompositeOperation = 'overlay';

    switch (filterType) {
      case 'vintage':
        const gradient1 = ctx.createRadialGradient(
          width / 2, height / 2, 0,
          width / 2, height / 2, Math.max(width, height) / 2
        );
        gradient1.addColorStop(0, 'rgba(255, 230, 180, 0.15)');
        gradient1.addColorStop(1, 'rgba(180, 140, 80, 0.25)');
        ctx.fillStyle = gradient1;
        ctx.fillRect(0, 0, width, height);
        break;

      case 'cool':
        const gradient2 = ctx.createRadialGradient(
          width / 2, height / 2, 0,
          width / 2, height / 2, Math.max(width, height) / 2
        );
        gradient2.addColorStop(0, 'rgba(200, 220, 240, 0.12)');
        gradient2.addColorStop(1, 'rgba(120, 140, 180, 0.2)');
        ctx.fillStyle = gradient2;
        ctx.fillRect(0, 0, width, height);
        break;

      case 'soft':
        const gradient3 = ctx.createRadialGradient(
          width / 2, height / 2, 0,
          width / 2, height / 2, Math.max(width, height) / 2
        );
        gradient3.addColorStop(0, 'rgba(255, 220, 230, 0.18)');
        gradient3.addColorStop(1, 'rgba(230, 180, 200, 0.15)');
        ctx.fillStyle = gradient3;
        ctx.fillRect(0, 0, width, height);
        break;
    }

    ctx.restore();
  };

  const drawFrame = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    frameType: string
  ) => {
    if (frameType === 'none') return;

    ctx.save();

    switch (frameType) {
      case 'white':
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 10;
        ctx.strokeRect(5, 5, width - 10, height - 10);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 1;
        ctx.strokeRect(10, 10, width - 20, height - 20);
        break;

      case 'doubleBlack':
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 6;
        ctx.strokeRect(3, 3, width - 6, height - 6);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(12, 12, width - 24, height - 24);
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 12;
        ctx.strokeRect(18, 18, width - 36, height - 36);
        break;

      case 'felt':
        const feltGradient = ctx.createLinearGradient(0, 0, width, height);
        feltGradient.addColorStop(0, '#3d5c3a');
        feltGradient.addColorStop(0.5, '#4a6b47');
        feltGradient.addColorStop(1, '#355232');
        ctx.strokeStyle = feltGradient;
        ctx.lineWidth = 20;
        ctx.strokeRect(10, 10, width - 20, height - 20);
        break;

      case 'goldEmboss':
        const goldGradient = ctx.createLinearGradient(0, 0, width, 0);
        goldGradient.addColorStop(0, '#b8860b');
        goldGradient.addColorStop(0.3, '#ffd700');
        goldGradient.addColorStop(0.5, '#fff8dc');
        goldGradient.addColorStop(0.7, '#ffd700');
        goldGradient.addColorStop(1, '#b8860b');
        ctx.strokeStyle = goldGradient;
        ctx.lineWidth = 16;
        ctx.strokeRect(8, 8, width - 16, height - 16);
        ctx.strokeStyle = 'rgba(139, 90, 0, 0.4)';
        ctx.lineWidth = 2;
        ctx.strokeRect(16, 16, width - 32, height - 32);
        break;

      case 'matteWood':
        const woodGradient = ctx.createLinearGradient(0, 0, 0, height);
        woodGradient.addColorStop(0, '#8B6914');
        woodGradient.addColorStop(0.25, '#A07C2A');
        woodGradient.addColorStop(0.5, '#8B6914');
        woodGradient.addColorStop(0.75, '#6B4F0E');
        woodGradient.addColorStop(1, '#8B6914');
        ctx.strokeStyle = woodGradient;
        ctx.lineWidth = 24;
        ctx.strokeRect(12, 12, width - 24, height - 24);
        break;
    }

    ctx.restore();
  };

  useEffect(() => {
    const draw = () => {
      if (animatingImagesRef.current) {
        drawCanvas(animatingImagesRef.current);
      } else {
        drawCanvas(images);
      }
      animationRef.current = requestAnimationFrame(draw);
    };

    animationRef.current = requestAnimationFrame(draw);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [images, drawCanvas]);

  useEffect(() => {
    if (images.length === 0) return;

    setIsAnimating(true);
    const config = { canvasWidth, canvasHeight };
    const targetImages = applyLayout(images.map(img => ({...img})), layoutStyle, config);

    animFromImagesRef.current = [...images];
    animToImagesRef.current = targetImages;
    animStartTimeRef.current = performance.now();

    const duration = 500;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - animStartTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      const lerped = lerpImages(
        animFromImagesRef.current,
        animToImagesRef.current,
        progress
      );

      animatingImagesRef.current = lerped;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        animatingImagesRef.current = null;
        setImages(targetImages);
        setIsAnimating(false);
      }
    };

    requestAnimationFrame(animate);
  }, [layoutStyle]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;

    const coords = getCanvasCoords(e);
    const hitImage = getTopImageAtPoint(coords.x, coords.y);

    if (hitImage) {
      setSelectedImageId(hitImage.id);
      setIsDragging(true);

      const scaledWidth = hitImage.width * hitImage.scale;
      const scaledHeight = hitImage.height * hitImage.scale;
      const centerX = hitImage.x + scaledWidth / 2;
      const centerY = hitImage.y + scaledHeight / 2;

      setDragOffset({
        x: coords.x - hitImage.x,
        y: coords.y - hitImage.y,
      });
    } else {
      setSelectedImageId(null);
    }

    setContextMenu(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedImageId) return;

    const coords = getCanvasCoords(e);
    const newX = coords.x - dragOffset.x;
    const newY = coords.y - dragOffset.y;

    updateImagePosition(selectedImageId, newX, newY);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!selectedImageId) return;

    e.preventDefault();

    if (e.ctrlKey || e.metaKey) {
      e.stopPropagation();
      const img = images.find((i) => i.id === selectedImageId);
      if (img) {
        const delta = e.deltaY > 0 ? 15 : -15;
        updateImageRotation(selectedImageId, img.rotation + delta);
      }
    } else {
      e.stopPropagation();
      const img = images.find((i) => i.id === selectedImageId);
      if (img) {
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        updateImageScale(selectedImageId, img.scale + delta);
      }
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();

    const coords = getCanvasCoords(e);
    const hitImage = getTopImageAtPoint(coords.x, coords.y);

    if (hitImage) {
      setSelectedImageId(hitImage.id);
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        imageId: hitImage.id,
      });
    } else {
      setContextMenu(null);
    }
  };

  const handleLayerUp = () => {
    if (contextMenu) {
      moveImageLayerUp(contextMenu.imageId);
    }
    setContextMenu(null);
  };

  const handleLayerDown = () => {
    if (contextMenu) {
      moveImageLayerDown(contextMenu.imageId);
    }
    setContextMenu(null);
  };

  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null);
    };

    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu]);

  return (
    <div className="canvas-container" ref={containerRef}>
      <div className="canvas-wrapper">
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          className="collage-canvas"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onContextMenu={handleContextMenu}
        />
      </div>

      {contextMenu && (
        <div
          className="context-menu"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="context-item" onClick={handleLayerUp}>
            上移一层
          </button>
          <button className="context-item" onClick={handleLayerDown}>
            下移一层
          </button>
        </div>
      )}

      <style>{`
        .canvas-container {
          display: flex;
          flex-direction: column;
          width: 100%;
          height: 100%;
        }

        .canvas-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          flex: 1;
          padding: 20px;
          overflow: auto;
        }

        .collage-canvas {
          max-width: 100%;
          max-height: 100%;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          cursor: default;
          background: white;
        }

        .collage-canvas:active {
          cursor: grabbing;
        }

        .context-menu {
          position: fixed;
          z-index: 1000;
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          padding: 6px;
          min-width: 120px;
        }

        .context-item {
          display: block;
          width: 100%;
          padding: 8px 12px;
          border: none;
          background: transparent;
          text-align: left;
          font-size: 14px;
          color: #3a5a7a;
          border-radius: 4px;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .context-item:hover {
          background: rgba(212, 165, 116, 0.15);
          color: #d4a574;
        }
      `}</style>
    </div>
  );
};

export default CollageCanvas;
