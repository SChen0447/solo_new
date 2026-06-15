import { useRef, useEffect, useState } from 'react';
import type { TimelineEvent } from '../utils/storage';

interface TimelineProps {
  events: TimelineEvent[];
}

export default function Timeline({ events }: TimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  useEffect(() => {
    if (scrollRef.current && events.length > 0) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [events.length]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.pageX - (scrollRef.current?.offsetLeft || 0));
    setScrollLeft(scrollRef.current?.scrollLeft || 0);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - (scrollRef.current?.offsetLeft || 0);
    const walk = (x - startX) * 2;
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollLeft - walk;
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartX(e.touches[0].pageX - (scrollRef.current?.offsetLeft || 0));
    setScrollLeft(scrollRef.current?.scrollLeft || 0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const x = e.touches[0].pageX - (scrollRef.current?.offsetLeft || 0);
    const walk = (x - startX) * 2;
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollLeft - walk;
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatEventText = (event: TimelineEvent) => {
    if (event.type === 'submit') {
      return `${event.user}提交了点子"${event.ideaTitle}"`;
    }
    return `${event.user}为"${event.ideaTitle}"的"${event.dimension}"打了${event.score}星`;
  };

  const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp);

  return (
    <div className="timeline-container">
      <div className="timeline-header">
        <h3 className="timeline-title">操作时间线</h3>
        <span className="timeline-count">{events.length} 条记录</span>
      </div>
      
      <div
        ref={scrollRef}
        className={`timeline-scroll ${isDragging ? 'dragging' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {sortedEvents.length === 0 ? (
          <div className="timeline-empty">暂无操作记录</div>
        ) : (
          <div className="timeline-track">
            {sortedEvents.map((event, index) => (
              <div key={event.id} className="timeline-item">
                <div
                  className={`timeline-dot ${event.type}`}
                  style={{
                    backgroundColor: event.type === 'submit' ? '#4A90D9' : '#5CB85C',
                  }}
                />
                <div className="timeline-line" />
                <div className="timeline-content">
                  <span className="timeline-time">{formatTime(event.timestamp)}</span>
                  <p className="timeline-text">{formatEventText(event)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
