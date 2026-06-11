import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addWeeks,
  addMonths,
  subWeeks,
  subMonths,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  format,
  setHours,
  setMinutes,
  getHours,
  getMinutes,
  isToday,
  addDays,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { ScheduleEvent, TeamMember, addBusyEvent } from '../data/mockData';
import EventBlock from './EventBlock';

interface CalendarViewProps {
  events: ScheduleEvent[];
  members: TeamMember[];
  onEventsChange: (events: ScheduleEvent[]) => void;
}

type ViewMode = 'week' | 'month';

const HOUR_HEIGHT = 60;
const START_HOUR = 7;
const END_HOUR = 22;
const TOTAL_HOURS = END_HOUR - START_HOUR;

const CalendarView: React.FC<CalendarViewProps> = ({ events, members, onEventsChange }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ day: Date; hour: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ day: Date; hour: number } | null>(null);
  const [animating, setAnimating] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
  const calendarGridRef = useRef<HTMLDivElement>(null);

  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
  const weekEnd = useMemo(() => endOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
  const weekDays = useMemo(() => eachDayOfInterval({ start: weekStart, end: weekEnd }), [weekStart, weekEnd]);

  const monthStart = useMemo(() => startOfMonth(currentDate), [currentDate]);
  const monthEnd = useMemo(() => endOfMonth(currentDate), [currentDate]);
  const monthDays = useMemo(() => {
    const start = startOfWeek(monthStart, { weekStartsOn: 1 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [monthStart, monthEnd]);

  const getMemberById = useCallback((id: string) => members.find(m => m.id === id), [members]);

  const getEventsForDay = useCallback((day: Date) => {
    return events.filter(event => isSameDay(event.startTime, day));
  }, [events]);

  const calculateEventPosition = useCallback((event: ScheduleEvent) => {
    const startHour = getHours(event.startTime) + getMinutes(event.startTime) / 60;
    const endHour = getHours(event.endTime) + getMinutes(event.endTime) / 60;
    const top = (startHour - START_HOUR) * HOUR_HEIGHT;
    const height = (endHour - startHour) * HOUR_HEIGHT;
    return { top: Math.max(0, top), height: Math.max(20, height) };
  }, []);

  const handlePrev = () => {
    setSlideDirection('left');
    setAnimating(true);
    setTimeout(() => {
      if (viewMode === 'week') {
        setCurrentDate(subWeeks(currentDate, 1));
      } else {
        setCurrentDate(subMonths(currentDate, 1));
      }
      setAnimating(false);
    }, 200);
  };

  const handleNext = () => {
    setSlideDirection('right');
    setAnimating(true);
    setTimeout(() => {
      if (viewMode === 'week') {
        setCurrentDate(addWeeks(currentDate, 1));
      } else {
        setCurrentDate(addMonths(currentDate, 1));
      }
      setAnimating(false);
    }, 200);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getDayAndHourFromEvent = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!calendarGridRef.current) return null;
    const rect = calendarGridRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const dayIndex = Math.floor(x / (rect.width / 7));
    const hour = START_HOUR + y / HOUR_HEIGHT;

    if (dayIndex < 0 || dayIndex >= 7 || hour < START_HOUR || hour > END_HOUR) return null;

    const day = addDays(weekStart, dayIndex);
    return { day, hour: Math.max(START_HOUR, Math.min(END_HOUR, hour)) };
  }, [weekStart]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (viewMode !== 'week') return;
    const pos = getDayAndHourFromEvent(e);
    if (!pos) return;

    setIsDragging(true);
    const roundedHour = Math.floor(pos.hour * 2) / 2;
    setDragStart({ day: pos.day, hour: roundedHour });
    setDragEnd({ day: pos.day, hour: roundedHour + 0.5 });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !dragStart) return;
    const pos = getDayAndHourFromEvent(e);
    if (!pos) return;

    const roundedHour = Math.floor(pos.hour * 2) / 2;
    if (!dragStart.day) return;

    setDragEnd({ day: pos.day, hour: Math.max(dragStart.hour + 0.5, roundedHour + 0.5) });
  }, [isDragging, dragStart, getDayAndHourFromEvent]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging || !dragStart || !dragEnd) {
      setIsDragging(false);
      return;
    }

    const startTime = setMinutes(setHours(dragStart.day, Math.floor(dragStart.hour)), (dragStart.hour % 1) * 60);
    const endTime = setMinutes(setHours(dragEnd.day, Math.floor(dragEnd.hour)), (dragEnd.hour % 1) * 60);

    const newEvent = addBusyEvent(startTime, endTime, 'current');
    onEventsChange([...events, newEvent]);

    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  }, [isDragging, dragStart, dragEnd, events, onEventsChange]);

  const handleDeleteEvent = (eventId: string) => {
    onEventsChange(events.filter(e => e.id !== eventId));
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const checkOverlap = useCallback((startTime: Date, endTime: Date) => {
    return events.some(event => event.startTime < endTime && event.endTime > startTime);
  }, [events]);

  const renderWeekView = () => {
    const dragSelection = isDragging && dragStart && dragEnd ? (
      <div
        className={`drag-selection ${checkOverlap(
          setMinutes(setHours(dragStart.day, Math.floor(dragStart.hour)), (dragStart.hour % 1) * 60),
          setMinutes(setHours(dragEnd.day, Math.floor(dragEnd.hour)), (dragEnd.hour % 1) * 60)
        ) ? 'has-conflict' : ''}`}
        style={{
          left: `${(weekDays.findIndex(d => isSameDay(d, dragStart.day)) / 7) * 100}%`,
          width: `${((weekDays.findIndex(d => isSameDay(d, dragEnd.day)) + 1 - weekDays.findIndex(d => isSameDay(d, dragStart.day))) / 7) * 100}%`,
          top: `${(dragStart.hour - START_HOUR) * HOUR_HEIGHT}px`,
          height: `${(dragEnd.hour - dragStart.hour) * HOUR_HEIGHT}px`,
        }}
      />
    ) : null;

    return (
      <div className="calendar-week-view">
        <div className="calendar-header-row">
          <div className="time-gutter-header"></div>
          {weekDays.map((day, index) => (
            <div key={index} className={`day-header ${isToday(day) ? 'today' : ''}`}>
              <div className="day-name">{format(day, 'EEE', { locale: zhCN })}</div>
              <div className={`day-number ${isToday(day) ? 'today-circle' : ''}`}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>
        <div
          className="calendar-grid"
          ref={calendarGridRef}
          onMouseDown={handleMouseDown}
        >
          <div className="time-gutter">
            {Array.from({ length: TOTAL_HOURS + 1 }).map((_, i) => (
              <div key={i} className="time-label">
                {START_HOUR + i}:00
              </div>
            ))}
          </div>
          <div className="days-container">
            {weekDays.map((day, dayIndex) => (
              <div
                key={dayIndex}
                className={`day-column ${isToday(day) ? 'today' : ''}`}
              >
                {Array.from({ length: TOTAL_HOURS }).map((_, hourIndex) => (
                  <div key={hourIndex} className="hour-cell" />
                ))}
                {getEventsForDay(day).map((event) => {
                  const { top, height } = calculateEventPosition(event);
                  const member = getMemberById(event.memberId);
                  const leftOffset = (dayIndex / 7) * 100;
                  return (
                    <div
                      key={event.id}
                      className="event-wrapper"
                      style={{
                        left: `${leftOffset}%`,
                        width: `${100 / 7}%`,
                        top: `${top}px`,
                        height: `${height}px`,
                      }}
                    >
                      <div className="event-inner">
                        <EventBlock
                          event={event}
                          member={member}
                          top={0}
                          height={height}
                          onDelete={event.category === 'busy' ? handleDeleteEvent : undefined}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          {dragSelection}
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    return (
      <div className="calendar-month-view">
        <div className="month-header-row">
          {['周一', '周二', '周三', '周四', '周五', '周六', '周日'].map((day, i) => (
            <div key={i} className="month-day-header">{day}</div>
          ))}
        </div>
        <div className="month-grid">
          {monthDays.map((day, index) => {
            const dayEvents = getEventsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            return (
              <div
                key={index}
                className={`month-day-cell ${!isCurrentMonth ? 'other-month' : ''} ${isToday(day) ? 'today' : ''}`}
              >
                <div className={`month-day-number ${isToday(day) ? 'today-circle' : ''}`}>
                  {format(day, 'd')}
                </div>
                <div className="month-events">
                  {dayEvents.slice(0, 3).map(event => (
                    <div
                      key={event.id}
                      className="month-event-dot"
                      style={{ backgroundColor: event.color }}
                      title={event.title}
                    />
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="month-event-more">+{dayEvents.length - 3}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="calendar-container glass-effect">
      <div className="calendar-toolbar">
        <div className="view-switcher">
          <button
            className={`view-btn ${viewMode === 'week' ? 'active' : ''}`}
            onClick={() => setViewMode('week')}
          >
            周视图
          </button>
          <button
            className={`view-btn ${viewMode === 'month' ? 'active' : ''}`}
            onClick={() => setViewMode('month')}
          >
            月视图
          </button>
        </div>
        <div className="calendar-nav">
          <button className="nav-btn" onClick={handlePrev}>‹</button>
          <span className="current-title">
            {viewMode === 'week'
              ? `${format(weekStart, 'M月d日', { locale: zhCN })} - ${format(weekEnd, 'M月d日', { locale: zhCN })}`
              : format(currentDate, 'yyyy年M月', { locale: zhCN })
            }
          </span>
          <button className="nav-btn" onClick={handleNext}>›</button>
        </div>
        <button className="today-btn" onClick={goToToday}>
          今天
        </button>
      </div>
      <div
        className={`calendar-content ${animating ? `slide-${slideDirection}` : ''}`}
      >
        {viewMode === 'week' ? renderWeekView() : renderMonthView()}
      </div>
    </div>
  );
};

export default CalendarView;
