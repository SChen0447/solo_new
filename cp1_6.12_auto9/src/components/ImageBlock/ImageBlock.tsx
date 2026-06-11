import React, { memo, useRef, useState, useEffect, useCallback } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { ImageBlockData } from '../../utils/constants';
import { useCanvasStore } from '../../stores/canvasStore';
import { useDragRotation } from '../../hooks/useDragRotation';
import { cropImage } from '../../utils/canvasUtils';
import { Trash2, X, Check, Square, RectangleHorizontal, RectangleVertical, Maximize } from 'lucide-react';

interface ImageBlockProps {
  block: ImageBlockData;
  scale: number;
  viewportX: number;
  viewportY: number;
}

type AspectRatio = 'free' | '1:1' | '4:3' | '16:9' | '3:4';

const ASPECT_RATIOS: { key: AspectRatio; label: string; icon?: React.ReactNode; value?: number }[] = [
  { key: 'free', label: '自由', icon: <Maximize size={14} /> },
  { key: '1:1', label: '1:1', icon: <Square size={14} />, value: 1 },
  { key: '4:3', label: '4:3', icon: <RectangleHorizontal size={14} />, value: 4 / 3 },
  { key: '16:9', label: '16:9', value: 16 / 9 },
  { key: '3:4', label: '3:4', icon: <RectangleVertical size={14} />, value: 3 / 4 },
];

interface CropDialogProps {
  src: string;
  originalWidth: number;
  originalHeight: number;
  onConfirm: (croppedSrc: string, w: number, h: number) => void;
  onCancel: () => void;
}

const CropDialog: React.FC<CropDialogProps> = ({
  src,
  originalWidth,
  originalHeight,
  onConfirm,
  onCancel,
}) => {
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('free');
  const [displayW, setDisplayW] = useState(0);
  const [displayH, setDisplayH] = useState(0);
  const [crop, setCrop] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [dragMode, setDragMode] = useState<null | 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w'>(null);
  const dragStartRef = useRef({ x: 0, y: 0, cropX: 0, cropY: 0, cropW: 0, cropH: 0 });

  useEffect(() => {
    const maxW = Math.min(680, window.innerWidth - 120);
    const maxH = Math.min(440, window.innerHeight - 240);
    const ratio = Math.min(maxW / originalWidth, maxH / originalHeight);
    const dw = Math.round(originalWidth * ratio);
    const dh = Math.round(originalHeight * ratio);
    setDisplayW(dw);
    setDisplayH(dh);
    const cw = dw * 0.7;
    const ch = dh * 0.7;
    setCrop({
      x: (dw - cw) / 2,
      y: (dh - ch) / 2,
      w: cw,
      h: ch,
    });
  }, [originalWidth, originalHeight]);

  useEffect(() => {
    if (aspectRatio === 'free' || displayW === 0) return;
    const ratioObj = ASPECT_RATIOS.find((r) => r.key === aspectRatio);
    if (!ratioObj?.value) return;
    const r = ratioObj.value;
    let { w, h, x, y } = crop;
    if (w / h > r) {
      w = h * r;
    } else {
      h = w / r;
    }
    if (w > displayW) {
      w = displayW;
      h = w / r;
    }
    if (h > displayH) {
      h = displayH;
      w = h * r;
    }
    x = Math.min(Math.max(x, 0), displayW - w);
    y = Math.min(Math.max(y, 0), displayH - h);
    setCrop({ x, y, w, h });
  }, [aspectRatio]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, mode: typeof dragMode) => {
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setDragMode(mode);
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        cropX: crop.x,
        cropY: crop.y,
        cropW: crop.w,
        cropH: crop.h,
      };
    },
    [crop]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragMode) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      const ratioObj = ASPECT_RATIOS.find((r) => r.key === aspectRatio);
      const fixedRatio = ratioObj?.value;
      const { cropX, cropY, cropW, cropH } = dragStartRef.current;
      let { x, y, w, h } = { x: cropX, y: cropY, w: cropW, h: cropH };

      if (dragMode === 'move') {
        x = Math.min(Math.max(cropX + dx, 0), displayW - cropW);
        y = Math.min(Math.max(cropY + dy, 0), displayH - cropH);
      } else if (dragMode === 'se') {
        w = Math.max(40, cropW + dx);
        h = fixedRatio ? w / fixedRatio : Math.max(40, cropH + dy);
        if (x + w > displayW) {
          w = displayW - x;
          if (fixedRatio) h = w / fixedRatio;
        }
        if (y + h > displayH) {
          h = displayH - y;
          if (fixedRatio) w = h * fixedRatio;
        }
      } else if (dragMode === 'sw') {
        let newW = Math.max(40, cropW - dx);
        let newH = fixedRatio ? newW / fixedRatio : Math.max(40, cropH + dy);
        let newX = cropX + (cropW - newW);
        if (newX < 0) {
          newW = cropW + cropX;
          if (fixedRatio) newH = newW / fixedRatio;
          newX = 0;
        }
        if (y + newH > displayH) {
          newH = displayH - y;
          if (fixedRatio) newW = newH * fixedRatio;
          newX = cropX + (cropW - newW);
        }
        x = newX;
        w = newW;
        h = newH;
      } else if (dragMode === 'ne') {
        let newW = Math.max(40, cropW + dx);
        let newH = fixedRatio ? newW / fixedRatio : Math.max(40, cropH - dy);
        let newY = cropY + (cropH - newH);
        if (x + newW > displayW) {
          newW = displayW - x;
          if (fixedRatio) newH = newW / fixedRatio;
        }
        if (newY < 0) {
          newH = cropH + cropY;
          if (fixedRatio) newW = newH * fixedRatio;
          newY = 0;
        }
        y = newY;
        w = newW;
        h = newH;
      } else if (dragMode === 'nw') {
        let newW = Math.max(40, cropW - dx);
        let newH = fixedRatio ? newW / fixedRatio : Math.max(40, cropH - dy);
        let newX = cropX + (cropW - newW);
        let newY = cropY + (cropH - newH);
        if (newX < 0) {
          newW = cropW + cropX;
          if (fixedRatio) newH = newW / fixedRatio;
          newX = 0;
        }
        if (newY < 0) {
          newH = cropH + cropY;
          if (fixedRatio) newW = newH * fixedRatio;
          newY = 0;
        }
        x = newX;
        y = newY;
        w = newW;
        h = newH;
      } else if (dragMode === 'n') {
        let newH = Math.max(40, cropH - dy);
        let newY = cropY + (cropH - newH);
        if (fixedRatio) {
          const centerX = cropX + cropW / 2;
          const newW = newH * fixedRatio;
          w = newW;
          x = centerX - newW / 2;
          x = Math.min(Math.max(x, 0), displayW - newW);
          if (x + w > displayW) w = displayW - x;
        }
        if (newY < 0) {
          newH = cropH + cropY;
          if (fixedRatio) {
            const centerX = cropX + cropW / 2;
            w = newH * fixedRatio;
            x = centerX - w / 2;
            x = Math.min(Math.max(x, 0), displayW - w);
          }
          newY = 0;
        }
        y = newY;
        h = newH;
      } else if (dragMode === 's') {
        h = Math.max(40, cropH + dy);
        if (fixedRatio) {
          const centerX = cropX + cropW / 2;
          w = h * fixedRatio;
          x = centerX - w / 2;
          x = Math.min(Math.max(x, 0), displayW - w);
          if (x + w > displayW) w = displayW - x;
        }
        if (y + h > displayH) {
          h = displayH - y;
          if (fixedRatio) {
            const centerX = cropX + cropW / 2;
            w = h * fixedRatio;
            x = centerX - w / 2;
            x = Math.min(Math.max(x, 0), displayW - w);
          }
        }
      } else if (dragMode === 'e') {
        w = Math.max(40, cropW + dx);
        if (fixedRatio) {
          const centerY = cropY + cropH / 2;
          h = w / fixedRatio;
          y = centerY - h / 2;
          y = Math.min(Math.max(y, 0), displayH - h);
          if (y + h > displayH) h = displayH - y;
        }
        if (x + w > displayW) {
          w = displayW - x;
          if (fixedRatio) {
            const centerY = cropY + cropH / 2;
            h = w / fixedRatio;
            y = centerY - h / 2;
            y = Math.min(Math.max(y, 0), displayH - h);
          }
        }
      } else if (dragMode === 'w') {
        let newW = Math.max(40, cropW - dx);
        let newX = cropX + (cropW - newW);
        let newH = fixedRatio ? newW / fixedRatio : h;
        let newY = fixedRatio ? cropY + cropH / 2 - newH / 2 : y;
        if (newX < 0) {
          newW = cropW + cropX;
          newH = fixedRatio ? newW / fixedRatio : h;
          newY = fixedRatio ? cropY + cropH / 2 - newH / 2 : y;
          newX = 0;
        }
        if (fixedRatio) {
          newY = Math.min(Math.max(newY, 0), displayH - newH);
        }
        x = newX;
        y = newY;
        w = newW;
        h = newH;
      }
      setCrop({ x, y, w, h });
    },
    [dragMode, aspectRatio, displayW, displayH]
  );

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragMode) return;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    setDragMode(null);
  }, [dragMode]);

  const handleConfirm = async () => {
    const scale = originalWidth / displayW;
    const cx = Math.round(crop.x * scale);
    const cy = Math.round(crop.y * scale);
    const cw = Math.round(crop.w * scale);
    const ch = Math.round(crop.h * scale);
    try {
      const newSrc = await cropImage(src, cx, cy, cw, ch);
      onConfirm(newSrc, cw, ch);
    } catch (e) {
      console.error('Crop failed:', e);
    }
  };

  return (
    <div
      className="crop-modal-overlay"
      onClick={onCancel}
    >
      <div
        className="crop-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--color-deep-brown)',
            }}
          >
            裁剪图片
          </h3>
          <button
            className="btn-glass"
            onClick={onCancel}
            style={{ width: 32, height: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={16} />
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 6,
            flexWrap: 'wrap',
          }}
        >
          {ASPECT_RATIOS.map((ratio) => (
            <button
              key={ratio.key}
              className={`btn-glass ${aspectRatio === ratio.key ? 'active' : ''}`}
              onClick={() => setAspectRatio(ratio.key)}
              style={{
                padding: '6px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 12,
                fontFamily: 'var(--font-body)',
              }}
            >
              {ratio.icon}
              <span>{ratio.label}</span>
            </button>
          ))}
        </div>

        <div
          className="crop-canvas-wrap"
          style={{
            width: displayW,
            height: displayH,
            position: 'relative',
            alignSelf: 'center',
          }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <img
            src={src}
            alt=""
            draggable={false}
            style={{
              width: displayW,
              height: displayH,
              display: 'block',
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          />
          <div
            className="crop-box"
            style={{
              left: crop.x,
              top: crop.y,
              width: crop.w,
              height: crop.h,
            }}
            onPointerDown={(e) => handlePointerDown(e, 'move')}
          >
            <div
              className="crop-handle"
              style={{ left: -7, top: -7, cursor: 'nw-resize' }}
              onPointerDown={(e) => handlePointerDown(e, 'nw')}
            />
            <div
              className="crop-handle"
              style={{ right: -7, top: -7, cursor: 'ne-resize' }}
              onPointerDown={(e) => handlePointerDown(e, 'ne')}
            />
            <div
              className="crop-handle"
              style={{ left: -7, bottom: -7, cursor: 'sw-resize' }}
              onPointerDown={(e) => handlePointerDown(e, 'sw')}
            />
            <div
              className="crop-handle"
              style={{ right: -7, bottom: -7, cursor: 'se-resize' }}
              onPointerDown={(e) => handlePointerDown(e, 'se')}
            />
            <div
              style={{
                position: 'absolute',
                top: -5,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 30,
                height: 8,
                cursor: 'n-resize',
                background: 'transparent',
              }}
              onPointerDown={(e) => handlePointerDown(e, 'n')}
            />
            <div
              style={{
                position: 'absolute',
                bottom: -5,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 30,
                height: 8,
                cursor: 's-resize',
                background: 'transparent',
              }}
              onPointerDown={(e) => handlePointerDown(e, 's')}
            />
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: -5,
                transform: 'translateY(-50%)',
                width: 8,
                height: 30,
                cursor: 'w-resize',
                background: 'transparent',
              }}
              onPointerDown={(e) => handlePointerDown(e, 'w')}
            />
            <div
              style={{
                position: 'absolute',
                top: '50%',
                right: -5,
                transform: 'translateY(-50%)',
                width: 8,
                height: 30,
                cursor: 'e-resize',
                background: 'transparent',
              }}
              onPointerDown={(e) => handlePointerDown(e, 'e')}
            />
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 10,
            justifyContent: 'flex-end',
          }}
        >
          <button
            className="btn-glass"
            onClick={onCancel}
            style={{
              padding: '10px 20px',
              fontSize: 13,
              fontFamily: 'var(--font-body)',
              fontWeight: 600,
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <X size={14} /> 取消
            </span>
          </button>
          <button
            onClick={handleConfirm}
            style={{
              padding: '10px 20px',
              fontSize: 13,
              fontFamily: 'var(--font-body)',
              fontWeight: 600,
              background: 'var(--color-caramel-orange)',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
              transition: 'all 200ms var(--ease-out-cubic)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(224, 122, 95, 0.4)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
            }}
          >
            <Check size={14} /> 确认裁剪
          </button>
        </div>
      </div>
    </div>
  );
};

export const ImageBlock = memo(function ImageBlock({
  block,
  scale,
  viewportX,
  viewportY,
}: ImageBlockProps) {
  const [showCrop, setShowCrop] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{ startX: number; startY: number; startW: number; startH: number; ratio: number } | null>(null);

  const selectedBlockId = useCanvasStore((s) => s.selectedBlockId);
  const setSelectedBlock = useCanvasStore((s) => s.setSelectedBlock);
  const updateBlock = useCanvasStore((s) => s.updateBlock);
  const updateBlockPosition = useCanvasStore((s) => s.updateBlockPosition);
  const updateBlockRotation = useCanvasStore((s) => s.updateBlockRotation);
  const updateBlockSize = useCanvasStore((s) => s.updateBlockSize);
  const deleteBlock = useCanvasStore((s) => s.deleteBlock);
  const bringToFront = useCanvasStore((s) => s.bringToFront);

  const isSelected = selectedBlockId === block.id;
  const ratio = block.originalWidth / block.originalHeight;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: block.id,
    disabled: isResizing || showCrop,
    data: { type: 'image', block },
  });

  const {
    isRotating,
    displayAngle,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  } = useDragRotation({
    initialRotation: block.rotation,
    blockWidth: block.width,
    blockHeight: block.height,
    blockX: block.x,
    blockY: block.y,
    onRotate: (r) => updateBlockRotation(block.id, r),
  });

  const screenX = viewportX + block.x * scale;
  const screenY = viewportY + block.y * scale;

  const handleTransform = transform
    ? { x: transform.x * scale, y: transform.y * scale }
    : null;

  const transformStyle = handleTransform
    ? `translate(${screenX + handleTransform.x}px, ${screenY + handleTransform.y}px) rotate(${block.rotation}deg) scale(${scale})`
    : `translate(${screenX}px, ${screenY}px) rotate(${block.rotation}deg) scale(${scale})`;

  const handleSelect = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isSelected) {
        setSelectedBlock(block.id);
        bringToFront(block.id);
      }
    },
    [block.id, isSelected, setSelectedBlock, bringToFront]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      handleSelect(e);
      setShowCrop(true);
    },
    [handleSelect]
  );

  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setIsResizing(true);
      resizeRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startW: block.width,
        startH: block.height,
        ratio,
      };
    },
    [block.width, block.height, ratio]
  );

  const handleResizePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isResizing || !resizeRef.current) return;
      const r = resizeRef.current;
      const dx = (e.clientX - r.startX) / scale;
      const newW = Math.max(60, r.startW + dx);
      const newH = newW / r.ratio;
      updateBlockSize(block.id, Math.round(newW), Math.round(newH));
    },
    [isResizing, block.id, scale, updateBlockSize]
  );

  const handleResizePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isResizing) return;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      setIsResizing(false);
      resizeRef.current = null;
    },
    [isResizing]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      deleteBlock(block.id);
    },
    [block.id, deleteBlock]
  );

  const handleCropConfirm = useCallback(
    (newSrc: string, w: number, h: number) => {
      const targetMaxW = Math.max(200, block.width);
      const newRatio = w / h;
      let displayW = targetMaxW;
      let displayH = displayW / newRatio;
      if (displayH > 400) {
        displayH = 400;
        displayW = displayH * newRatio;
      }
      updateBlock(block.id, {
        src: newSrc,
        originalWidth: w,
        originalHeight: h,
        width: Math.round(displayW),
        height: Math.round(displayH),
      });
      setShowCrop(false);
    },
    [block.id, block.width, updateBlock]
  );

  return (
    <>
      <div
        ref={setNodeRef}
        className={`image-block block-enter ${isSelected ? 'selected' : ''} ${
          isDragging ? 'dragging' : ''
        }`}
        style={{
          width: block.width,
          height: block.height,
          transform: transformStyle,
          transformOrigin: '0 0',
          zIndex: isDragging || isRotating ? 99999 : block.zIndex,
          left: 0,
          top: 0,
          padding: 4,
          willChange: isDragging || isRotating || isResizing ? 'transform' : undefined,
        }}
        onClick={handleSelect}
        onDoubleClick={handleDoubleClick}
        onPointerMove={handleResizePointerMove}
        onPointerUp={handleResizePointerUp}
        onPointerCancel={handleResizePointerUp}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            position: 'relative',
            cursor: isDragging ? 'grabbing' : 'grab',
            borderRadius: 8,
            overflow: 'hidden',
          }}
          {...(!showCrop && !isResizing && !isRotating ? attributes : {})}
          {...(!showCrop && !isResizing && !isRotating ? listeners : {})}
        >
          <img
            src={block.src}
            alt=""
            draggable={false}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          />

          {isSelected && (
            <button
              onClick={handleDelete}
              className="btn-glass"
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                width: 28,
                height: 28,
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#c53030',
                zIndex: 15,
              }}
              title="删除"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>

        {isSelected && !isDragging && !showCrop && (
          <>
            <div
              className="resize-handle se"
              onPointerDown={handleResizePointerDown}
            />
            <div
              className="rotate-handle"
              style={{
                left: block.width / 2 - 11,
                top: block.height + 22,
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            />
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: block.height + 8,
                width: 1,
                height: 16,
                background: '#E07A5F',
                transform: 'translateX(-50%)',
                opacity: 0.6,
              }}
            />
          </>
        )}

        {displayAngle !== null && (
          <div
            className="angle-indicator"
            style={{
              left: block.width / 2,
              top: block.height + 56,
              transform: 'translateX(-50%)',
            }}
          >
            {Math.round(displayAngle)}°
          </div>
        )}
      </div>

      {showCrop && (
        <CropDialog
          src={block.src}
          originalWidth={block.originalWidth}
          originalHeight={block.originalHeight}
          onConfirm={handleCropConfirm}
          onCancel={() => setShowCrop(false)}
        />
      )}
    </>
  );
});

export default ImageBlock;
