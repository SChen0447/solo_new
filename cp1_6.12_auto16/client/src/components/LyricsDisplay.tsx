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
  const listRef = useRef<HTMLDivElement>(null);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (lines.length === 0) {
      setActiveIndex(-1);
      return;
    }

    const index = lines.findIndex((line, i) => {
      const nextLine = lines[i + 1];
      return currentTime >= line.time && (!nextLine || currentTime < nextLine.time);
    });

    if (index !== activeIndex) {
      setActiveIndex(index >= 0 ? index : lines.length - 1);
    }
  }, [currentTime, lines, activeIndex]);

  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
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
  }, [activeIndex]);

  const handleLineClick = useCallback((e: React.MouseEvent, time: number) => {
    if (draggingLineId) return;
    e.preventDefault();
    onSeek(time);
  }, [draggingLineId, onSeek]);

  const handleDragStart = useCallback((e: React.MouseEvent, line: LyricLine) => {
    e.preventDefault();
    setDraggingLineId(line.id);
    setDragStartY(e.clientY);
    setDragStartTime(line.time);
  }, []);

  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!draggingLineId) return;
    
    const deltaY = e.clientY - dragStartY;
    const timeDelta = deltaY * 0.05;
    const newTime = Math.max(0, dragStartTime + timeDelta);
    onLineTimeChange(draggingLineId, newTime);
  }, [draggingLineId, dragStartY, dragStartTime, onLineTimeChange]);

  const handleDragEnd = useCallback(() => {
    setDraggingLineId(null);
  }, []);

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
              onMouseDown={(e) => handleDragStart(e, line)}
            >
              <span className="drag-handle">⋮⋮</span>
              <div>{line.text}</div>
              <div className="lyric-time">{formatTime(line.time)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
