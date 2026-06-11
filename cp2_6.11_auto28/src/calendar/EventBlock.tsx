import React, { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { ScheduleEvent, TeamMember } from '../data/mockData';

interface EventBlockProps {
  event: ScheduleEvent;
  member: TeamMember | undefined;
  top: number;
  height: number;
  isDragging?: boolean;
  onDelete?: (eventId: string) => void;
  onDragStart?: (e: React.MouseEvent, event: ScheduleEvent) => void;
  onDragMove?: (e: MouseEvent) => void;
  onDragEnd?: () => void;
}

const EventBlock: React.FC<EventBlockProps> = ({
  event,
  member,
  top,
  height,
  isDragging = false,
  onDelete,
  onDragStart,
  onDragMove,
  onDragEnd,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const blockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isDragging) {
      const handleMouseMove = (e: MouseEvent) => {
        onDragMove?.(e);
      };
      const handleMouseUp = () => {
        onDragEnd?.();
      };
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, onDragMove, onDragEnd]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (onDragStart) {
      e.preventDefault();
      onDragStart(e, event);
    }
  };

  return (
    <div
      ref={blockRef}
      className={`event-block ${isDragging ? 'dragging' : ''} ${event.category}`}
      style={{
        top: `${top}px`,
        height: `${height}px`,
        backgroundColor: event.color,
      }}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="event-header">
        <span className="event-title">{event.title}</span>
        {event.category === 'busy' && onDelete && (
          <button
            className="event-delete-btn"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(event.id);
            }}
          >
            ×
          </button>
        )}
      </div>
      <div className="event-time">
        {format(event.startTime, 'HH:mm')} - {format(event.endTime, 'HH:mm')}
      </div>
      {member && (
        <div className="event-avatar" style={{ backgroundColor: member.color }}>
          {member.avatar}
        </div>
      )}
      {showTooltip && (
        <div className="event-tooltip">
          <div className="tooltip-title">{event.title}</div>
          <div className="tooltip-time">
            {format(event.startTime, 'MM月dd日 HH:mm')} - {format(event.endTime, 'HH:mm')}
          </div>
          {member && <div className="tooltip-member">参会人：{member.name}</div>}
          <div className="tooltip-category">
            类型：{event.category === 'personal' ? '个人' : event.category === 'projectA' ? '项目A' : event.category === 'projectB' ? '项目B' : '忙碌'}
          </div>
        </div>
      )}
    </div>
  );
};

export default EventBlock;
