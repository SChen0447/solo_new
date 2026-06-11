import { useState, useRef, useEffect, useCallback } from 'react';
import type { LyricLine } from '../types';

interface LyricsDisplayProps {
  lines: LyricLine[];
  currentTime: number;
  onSeek: (time: number) => void;
  onLineTimeChange: (lineId: string, newTime: number) => void;
}

export default function LyricsDisplay({ lines, currentTime, onSeek, onLineTimeChange }: LyricsDisplayProps) {
  const [activeIndex, setActiveIndex] = useState(-1);
  const [draggingLineId, setDraggingLineId] = useState<string | null>(null);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartTime, setDragStartTime] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const activeIndexRef = useRef(-1);
  const currentTimeRef = useRef(currentTime);
  const rafRef = useRef<number | null>(null);
  const pendingTimeChangeRef = useRef<{ id: string; time: number } | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);

  currentTimeRef.current = currentTime;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const updateActiveIndex = useCallback(() => {
    if (lines.length === 0) {
      activeIndexRef.current = -1;
      setActiveIndex(-1);
      return;
    }

    const ct = currentTimeRef.current;
    let newIndex = -1;
    
    for (let i = lines.length - 1; i >= 0; i--) {
      if (ct >= lines[i].time) {
        newIndex = i;
        break;
      }
    }

    if (newIndex !== activeIndexRef.current) {
      activeIndexRef.current = newIndex;
      setActiveIndex(newIndex);
    }

    rafRef.current = requestAnimationFrame(updateActiveIndex);
  }, [lines]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(updateActiveIndex);
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [updateActiveIndex]);

  useEffect(() => {
    if (activeIndex >= 0 && listRef.current && !isDragging) {
      const activeElement = listRef.current.children[activeIndex] as HTMLElement;
      if (activeElement) {
        const container = listRef.current.parentElement;
        if (container) {
          const containerHeight = container.clientHeight;
          const elementTop = activeElement.offsetTop;
          const elementHeight = activeElement.clientHeight;
          const scrollTop = elementTop - containerHeight / 2 + elementHeight / 2;
          container.scrollTo({ top: scrollTop, behavior: 'smooth' });
        }
      }
    }
  }, [activeIndex, isDragging]);

  const handleLineClick = useCallback((e: React.MouseEvent, time: number) => {
    if (isDragging) return;
    e.preventDefault();
    onSeek(time);
  }, [isDragging, onSeek]);

  const debouncedSave = useCallback((lineId: string, newTime: number) => {
    pendingTimeChangeRef.current = { id: lineId, time: newTime };
    
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = window.setTimeout(() => {
      if (pendingTimeChangeRef.current) {
        onLineTimeChange(pendingTimeChangeRef.current.id, pendingTimeChangeRef.current.time);
        pendingTimeChangeRef.current = null;
      }
    }, 100);
  }, [onLineTimeChange]);

  const handleDragStart = useCallback((e: React.MouseEvent, line: LyricLine) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingLineId(line.id);
    setDragStartY(e.clientY);
    setDragStartTime(line.time);
    setIsDragging(true);
  }, []);

  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!draggingLineId) return;
    
    e.preventDefault();
    const deltaY = e.clientY - dragStartY;
    const timeDelta = deltaY * 0.03;
    const newTime = Math.max(0, dragStartTime + timeDelta);
    
    debouncedSave(draggingLineId, newTime);
  }, [draggingLineId, dragStartY, dragStartTime, debouncedSave]);

  const handleDragEnd = useCallback(() => {
    if (pendingTimeChangeRef.current && saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
      onLineTimeChange(pendingTimeChangeRef.current.id, pendingTimeChangeRef.current.time);
      pendingTimeChangeRef.current = null;
    }
    setDraggingLineId(null);
    setIsDragging(false);
  }, [onLineTimeChange]);

  useEffect(() => {
    if (draggingLineId) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [draggingLineId, handleDragMove, handleDragEnd]);

  if (lines.length === 0) {
    return (
      <div className="lyrics-container">
        <div className="empty-state">
          <div className="empty-icon">🎵</div>
          <p>暂无歌词</p>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
            切换到编辑器添加或导入歌词
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="lyrics-container">
      <div className="lyrics-wrapper">
        <div ref={listRef} className="lyrics-list">
          {lines.map((line, index) => (
            <div
              key={line.id}
              className={`lyric-line ${index === activeIndex ? 'active' : ''} ${draggingLineId === line.id ? 'dragging' : ''}`}
              onClick={(e) => handleLineClick(e, line.time)}
            >
              <span
                className="drag-handle"
                onMouseDown={(e) => handleDragStart(e, line)}
                title="拖拽调整时间"
              >
                ⋮⋮
              </span>
              <div className="lyric-text">{line.text}</div>
              <div className="lyric-time">{formatTime(line.time)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
