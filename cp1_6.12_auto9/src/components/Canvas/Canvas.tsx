import React, { useCallback, useRef, useEffect, useState } from 'react';
import { DndContext, DragEndEvent, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useCanvasStore } from '../../stores/canvasStore';
import { useVirtualization } from '../../hooks/useVirtualization';
import { StickyNote } from '../StickyNote/StickyNote';
import { ImageBlock } from '../ImageBlock/ImageBlock';
import { SNAP_THRESHOLD, HAZE_BLUE } from '../../utils/constants';
import { springAnimation } from '../../utils/animationUtils';
import { fileToDataURL, getImageDimensions, resizeImage } from '../../utils/canvasUtils';
import type { Block } from '../../utils/constants';

export default function Canvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const [snapLines, setSnapLines] = useState<{ x1: number; y1: number; x2: number; y2: number }[]>([]);
  const rafRef = useRef<number | null>(null);
  const pendingPosRef = useRef<{ id: string; x: number; y: number } | null>(null);
  const springAnimRef = useRef<((p: number) => number) | null>(null);
  const springStartRef = useRef<number>(0);
  const springTargetRef = useRef<{ x: number; y: number } | null>(null);
  const springBlockIdRef = useRef<string>('');

  const blocks = useCanvasStore((s) => s.blocks);
  const viewport = useCanvasStore((s) => s.viewport);
  const selectedBlockId = useCanvasStore((s) => s.selectedBlockId);
  const createStickyNote = useCanvasStore((s) => s.createStickyNote);
  const createImageBlock = useCanvasStore((s) => s.createImageBlock);
  const updateBlockPosition = useCanvasStore((s) => s.updateBlockPosition);
  const setViewport = useCanvasStore((s) => s.setViewport);
  const zoomAt = useCanvasStore((s) => s.zoomAt);
  const setSelectedBlock = useCanvasStore((s) => s.setSelectedBlock);
  const bringToFront = useCanvasStore((s) => s.bringToFront);
  const getFilteredBlocks = useCanvasStore((s) => s.getFilteredBlocks);

  const filteredBlocks = getFilteredBlocks();
  const visibleBlocks = useVirtualization(
    filteredBlocks,
    viewport,
    containerSize.w,
    containerSize.h,
    300
  );

  const sensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 5 },
  });
  const sensors = useSensors(sensor);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({
          w: entry.contentRect.width,
          h: entry.contentRect.height,
        });
      }
    });
    observer.observe(el);
    setContainerSize({ w: el.clientWidth, h: el.clientHeight });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const deltaScale = e.deltaY > 0 ? 0.92 : 1.08;
        zoomAt(x, y, deltaScale);
      } else {
        const dx = e.deltaX !== 0 ? e.deltaX : e.deltaY;
        const dy = e.deltaX !== 0 ? e.deltaY : 0;
        setViewport({
          offsetX: viewport.offsetX - dx,
          offsetY: viewport.offsetY - dy,
        });
      }
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [viewport, zoomAt, setViewport]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target !== containerRef.current) return;
      const rect = containerRef.current!.getBoundingClientRect();
      const x = (e.clientX - rect.left - viewport.offsetX) / viewport.scale;
      const y = (e.clientY - rect.top - viewport.offsetY) / viewport.scale;
      createStickyNote(x - 120, y - 100);
    },
    [viewport, createStickyNote]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.target !== containerRef.current) return;
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        e.preventDefault();
        setIsPanning(true);
        panStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          ox: viewport.offsetX,
          oy: viewport.offsetY,
        };
        return;
      }
      if (e.button === 0 && selectedBlockId) {
        setSelectedBlock(null);
      }
    },
    [selectedBlockId, setSelectedBlock, viewport]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) return;
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setViewport({
        offsetX: panStartRef.current.ox + dx,
        offsetY: panStartRef.current.oy + dy,
      });
    },
    [isPanning, setViewport]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const computeSnap = useCallback(
    (dragBlock: Block, newX: number, newY: number) => {
      const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
      let snapX: number | null = null;
      let snapY: number | null = null;
      const t = SNAP_THRESHOLD;
      const dragCX = newX + dragBlock.width / 2;
      const dragCY = newY + dragBlock.height / 2;
      const dragR = newX + dragBlock.width;
      const dragB = newY + dragBlock.height;

      for (const other of blocks) {
        if (other.id === dragBlock.id) continue;
        const oL = other.x;
        const oT = other.y;
        const oR = other.x + other.width;
        const oB = other.y + other.height;
        const oCX = other.x + other.width / 2;
        const oCY = other.y + other.height / 2;

        if (Math.abs(newX - oL) < t && snapX === null) { snapX = oL; lines.push({ x1: oL, y1: Math.min(newY, oT) - 30, x2: oL, y2: Math.max(dragB, oB) + 30 }); }
        if (Math.abs(newX - oR) < t && snapX === null) { snapX = oR; lines.push({ x1: oR, y1: Math.min(newY, oT) - 30, x2: oR, y2: Math.max(dragB, oB) + 30 }); }
        if (Math.abs(dragR - oL) < t && snapX === null) { snapX = oL - dragBlock.width; lines.push({ x1: oL, y1: Math.min(newY, oT) - 30, x2: oL, y2: Math.max(dragB, oB) + 30 }); }
        if (Math.abs(dragR - oR) < t && snapX === null) { snapX = oR - dragBlock.width; lines.push({ x1: oR, y1: Math.min(newY, oT) - 30, x2: oR, y2: Math.max(dragB, oB) + 30 }); }
        if (Math.abs(dragCX - oCX) < t && snapX === null) { snapX = oCX - dragBlock.width / 2; lines.push({ x1: oCX, y1: Math.min(newY, oT) - 30, x2: oCX, y2: Math.max(dragB, oB) + 30 }); }

        if (Math.abs(newY - oT) < t && snapY === null) { snapY = oT; lines.push({ y1: oT, x1: Math.min(newX, oL) - 30, y2: oT, x2: Math.max(dragR, oR) + 30 }); }
        if (Math.abs(newY - oB) < t && snapY === null) { snapY = oB; lines.push({ y1: oB, x1: Math.min(newX, oL) - 30, y2: oB, x2: Math.max(dragR, oR) + 30 }); }
        if (Math.abs(dragB - oT) < t && snapY === null) { snapY = oT - dragBlock.height; lines.push({ y1: oT, x1: Math.min(newX, oL) - 30, y2: oT, x2: Math.max(dragR, oR) + 30 }); }
        if (Math.abs(dragB - oB) < t && snapY === null) { snapY = oB - dragBlock.height; lines.push({ y1: oB, x1: Math.min(newX, oL) - 30, y2: oB, x2: Math.max(dragR, oR) + 30 }); }
        if (Math.abs(dragCY - oCY) < t && snapY === null) { snapY = oCY - dragBlock.height / 2; lines.push({ y1: oCY, x1: Math.min(newX, oL) - 30, y2: oCY, x2: Math.max(dragR, oR) + 30 }); }
      }

      return { snapX, snapY, lines };
    },
    [blocks]
  );

  const runSpringAnimation = useCallback(
    (blockId: string, fromX: number, fromY: number, toX: number, toY: number) => {
      springAnimRef.current = springAnimation(fromX, toX, 350, 150, 12);
      springStartRef.current = performance.now();
      springTargetRef.current = { x: toX, y: toY };
      springBlockIdRef.current = blockId;

      const animate = (now: number) => {
        const elapsed = now - springStartRef.current;
        const progress = Math.min(elapsed / 350, 1);
        const animFnX = springAnimRef.current;
        if (!animFnX || !springTargetRef.current) return;

        const currentX = animFnX(progress);
        const ratio = (currentX - fromX) / (toX - fromX || 1);
        const currentY = fromY + (springTargetRef.current.y - fromY) * ratio;

        updateBlockPosition(blockId, currentX, currentY);

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate);
        } else {
          updateBlockPosition(blockId, springTargetRef.current.x, springTargetRef.current.y);
          springAnimRef.current = null;
          springTargetRef.current = null;
          rafRef.current = null;
        }
      };

      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(animate);
    },
    [updateBlockPosition]
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const block = event.active.data.current?.block as Block | undefined;
      if (block) {
        bringToFront(block.id);
      }
    },
    [bringToFront]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, delta } = event;
      const block = active.data.current?.block as Block | undefined;
      if (!block) return;

      const newX = block.x + delta.x;
      const newY = block.y + delta.y;

      const { snapX, snapY, lines } = computeSnap(block, newX, newY);
      setSnapLines(lines);
      setTimeout(() => setSnapLines([]), 400);

      const finalX = snapX !== null ? snapX : newX;
      const finalY = snapY !== null ? snapY : newY;

      if (snapX !== null || snapY !== null) {
        runSpringAnimation(block.id, newX, newY, finalX, finalY);
      } else {
        updateBlockPosition(block.id, finalX, finalY);
      }
    },
    [computeSnap, updateBlockPosition, runSpringAnimation]
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith('image/')
      );
      if (files.length === 0) return;

      const rect = containerRef.current!.getBoundingClientRect();
      const dropX = (e.clientX - rect.left - viewport.offsetX) / viewport.scale;
      const dropY = (e.clientY - rect.top - viewport.offsetY) / viewport.scale;

      for (const file of files) {
        try {
          const dataUrl = await fileToDataURL(file);
          const dims = await getImageDimensions(dataUrl);
          const resized = await resizeImage(dataUrl, 1600, 1200);
          createImageBlock(
            dropX - 160,
            dropY - 120,
            resized.src,
            dims.width,
            dims.height,
            resized.width,
            resized.height
          );
        } catch (err) {
          console.error('Failed to load image:', err);
        }
      }
    },
    [viewport, createImageBlock]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const vpX = viewport.offsetX;
  const vpY = viewport.offsetY;

  return (
    <div
      ref={containerRef}
      className="canvas-viewport canvas-bg"
      style={{
        flex: 1,
        overflow: 'hidden',
        position: 'relative',
        cursor: isPanning ? 'grabbing' : 'default',
      }}
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {visibleBlocks.map((block) => {
          if (block.type === 'sticky') {
            return (
              <StickyNote
                key={block.id}
                block={block}
                scale={viewport.scale}
                viewportX={vpX}
                viewportY={vpY}
              />
            );
          }
          return (
            <ImageBlock
              key={block.id}
              block={block}
              scale={viewport.scale}
              viewportX={vpX}
              viewportY={vpY}
            />
          );
        })}
      </DndContext>

      {snapLines.map((line, i) => {
        const isHorizontal = line.x1 !== line.x2;
        return (
          <div
            key={i}
            className="snap-indicator"
            style={{
              left: isHorizontal ? Math.min(line.x1, line.x2) * viewport.scale + vpX : line.x1 * viewport.scale + vpX - 0.5,
              top: isHorizontal ? line.y1 * viewport.scale + vpY - 0.5 : Math.min(line.y1, line.y2) * viewport.scale + vpY,
              width: isHorizontal ? (Math.abs(line.x2 - line.x1)) * viewport.scale : 1,
              height: isHorizontal ? 1 : (Math.abs(line.y2 - line.y1)) * viewport.scale,
              background: HAZE_BLUE,
            }}
          />
        );
      })}

      <div
        style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          padding: '6px 14px',
          background: 'var(--color-glass-bg)',
          backdropFilter: 'blur(12px)',
          borderRadius: 12,
          boxShadow: 'var(--shadow-sm)',
          fontSize: 12,
          fontFamily: 'var(--font-body)',
          color: 'var(--color-warm-gray)',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        <span>{Math.round(viewport.scale * 100)}%</span>
        <span style={{ opacity: 0.3 }}>|</span>
        <span>{blocks.length} 个内容块</span>
        <span style={{ opacity: 0.3 }}>|</span>
        <span>双击创建便签 · 拖入图片 · Alt+拖拽平移 · 滚轮缩放</span>
      </div>
    </div>
  );
}
