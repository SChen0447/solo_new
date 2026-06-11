import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Task, Sprint, hasDependencyConflict } from '../utils/taskData';

interface GanttChartProps {
  tasks: Task[];
  sprint: Sprint;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
}

const ROW_HEIGHT = 44;
const TASK_BAR_HEIGHT = 28;
const DAY_WIDTH = 40;
const SIDEBAR_WIDTH = 280;
const TIMELINE_HEADER_HEIGHT = 40;

const priorityColors: Record<string, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#10b981',
};

const GanttChart: React.FC<GanttChartProps> = ({ tasks, sprint, onTaskUpdate }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const gridCanvasRef = useRef<HTMLCanvasElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [draggingTask, setDraggingTask] = useState<string | null>(null);
  const [dragType, setDragType] = useState<'move' | 'resize-start' | 'resize-end' | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragOriginalStart, setDragOriginalStart] = useState('');
  const [dragOriginalEnd, setDragOriginalEnd] = useState('');
  const [hoveredTask, setHoveredTask] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [conflictTask, setConflictTask] = useState<string | null>(null);

  const { totalDays, startDate } = useMemo(() => {
    const start = new Date(sprint.startDate);
    const end = new Date(sprint.endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return { totalDays: days, startDate: start };
  }, [sprint]);

  const timelineWidth = useMemo(() => totalDays * DAY_WIDTH, [totalDays]);

  const getDateOffset = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    const diff = date.getTime() - startDate.getTime();
    return Math.round(diff / (1000 * 60 * 60 * 24)) * DAY_WIDTH;
  }, [startDate]);

  const getTaskDuration = useCallback((task: Task) => {
    const start = new Date(task.startDate);
    const end = new Date(task.endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, days) * DAY_WIDTH;
  }, []);

  const visibleTaskRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 2);
    const visibleCount = Math.ceil(containerHeight / ROW_HEIGHT) + 4;
    const endIndex = Math.min(tasks.length, startIndex + visibleCount);
    return { startIndex, endIndex };
  }, [scrollTop, containerHeight, tasks.length]);

  const visibleTasks = useMemo(() => {
    return tasks.slice(visibleTaskRange.startIndex, visibleTaskRange.endIndex);
  }, [tasks, visibleTaskRange]);

  const drawGrid = useCallback(() => {
    const canvas = gridCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = timelineWidth;
    const height = tasks.length * ROW_HEIGHT;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(58, 58, 82, 0.3)';
    ctx.lineWidth = 1;

    for (let i = 0; i <= totalDays; i++) {
      const x = i * DAY_WIDTH + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let i = 0; i <= tasks.length; i++) {
      const y = i * ROW_HEIGHT + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
    const today = new Date();
    const todayOffset = Math.round((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) * DAY_WIDTH;
    if (todayOffset >= 0 && todayOffset <= width) {
      ctx.fillRect(todayOffset, 0, 2, height);
    }
  }, [totalDays, tasks.length, timelineWidth, startDate]);

  useEffect(() => {
    drawGrid();
  }, [drawGrid]);

  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight - TIMELINE_HEADER_HEIGHT);
      }
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    setScrollTop(target.scrollTop);
    setScrollLeft(target.scrollLeft);
    
    if (sidebarRef.current) {
      sidebarRef.current.scrollTop = target.scrollTop;
    }
  }, []);

  const addDays = (dateStr: string, days: number): string => {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  };

  const handleTaskMouseDown = useCallback((e: React.MouseEvent, taskId: string, type: 'move' | 'resize-start' | 'resize-end') => {
    e.preventDefault();
    e.stopPropagation();
    
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    setDraggingTask(taskId);
    setDragType(type);
    setDragStartX(e.clientX);
    setDragOriginalStart(task.startDate);
    setDragOriginalEnd(task.endDate);
  }, [tasks]);

  useEffect(() => {
    if (!draggingTask || !dragType) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartX;
      const deltaDays = Math.round(deltaX / DAY_WIDTH);

      const task = tasks.find(t => t.id === draggingTask);
      if (!task) return;

      let newStart = dragOriginalStart;
      let newEnd = dragOriginalEnd;

      if (dragType === 'move') {
        if (deltaDays !== 0) {
          newStart = addDays(dragOriginalStart, deltaDays);
          newEnd = addDays(dragOriginalEnd, deltaDays);
        }
      } else if (dragType === 'resize-start') {
        if (deltaDays !== 0) {
          newStart = addDays(dragOriginalStart, deltaDays);
          if (new Date(newStart) >= new Date(newEnd)) {
            newStart = addDays(newEnd, -1);
          }
        }
      } else if (dragType === 'resize-end') {
        if (deltaDays !== 0) {
          newEnd = addDays(dragOriginalEnd, deltaDays);
          if (new Date(newEnd) <= new Date(newStart)) {
            newEnd = addDays(newStart, 1);
          }
        }
      }

      const updatedTask = { ...task, startDate: newStart, endDate: newEnd };
      const hasConflict = hasDependencyConflict(updatedTask, tasks);

      if (hasConflict) {
        setConflictTask(draggingTask);
      } else {
        setConflictTask(null);
        onTaskUpdate(draggingTask, { startDate: newStart, endDate: newEnd });
      }
    };

    const handleMouseUp = () => {
      setDraggingTask(null);
      setDragType(null);
      setConflictTask(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingTask, dragType, dragStartX, dragOriginalStart, dragOriginalEnd, tasks, onTaskUpdate]);

  const handleTaskHover = useCallback((e: React.MouseEvent, taskId: string | null) => {
    if (taskId) {
      setHoveredTask(taskId);
      setTooltipPos({ x: e.clientX, y: e.clientY });
    } else {
      setHoveredTask(null);
    }
  }, []);

  const hoveredTaskData = useMemo(() => {
    if (!hoveredTask) return null;
    return tasks.find(t => t.id === hoveredTask);
  }, [hoveredTask, tasks]);

  const renderTimelineHeader = () => {
    const days = [];
    for (let i = 0; i < totalDays; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      days.push(
        <div
          key={i}
          style={{
            position: 'absolute',
            left: i * DAY_WIDTH,
            width: DAY_WIDTH,
            height: TIMELINE_HEADER_HEIGHT,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            color: isWeekend ? 'var(--text-muted)' : 'var(--text-secondary)',
            borderRight: '1px solid rgba(58, 58, 82, 0.3)',
            background: isWeekend ? 'rgba(0,0,0,0.1)' : 'transparent',
          }}
        >
          <span style={{ fontWeight: 500 }}>{date.getMonth() + 1}/{date.getDate()}</span>
          <span style={{ fontSize: '10px', opacity: 0.7 }}>
            {['日', '一', '二', '三', '四', '五', '六'][date.getDay()]}
          </span>
        </div>
      );
    }
    return days;
  };

  return (
    <div className="gantt-container" ref={containerRef}>
      <div className="gantt-header">
        <div className="gantt-sidebar-header">任务名称</div>
        <div 
          className="gantt-timeline-header"
          style={{ 
            overflow: 'hidden',
            position: 'relative',
            height: TIMELINE_HEADER_HEIGHT,
          }}
        >
          <div 
            style={{ 
              position: 'absolute', 
              left: -scrollLeft, 
              width: timelineWidth,
              height: '100%',
            }}
          >
            {renderTimelineHeader()}
          </div>
        </div>
      </div>

      <div className="gantt-body">
        <div 
          className="gantt-sidebar"
          ref={sidebarRef}
          style={{ overflow: 'hidden' }}
        >
          <div style={{ height: tasks.length * ROW_HEIGHT, position: 'relative' }}>
            {visibleTasks.map((task, idx) => (
              <div
                key={task.id}
                className="gantt-row-label"
                style={{
                  position: 'absolute',
                  top: (visibleTaskRange.startIndex + idx) * ROW_HEIGHT,
                  width: '100%',
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: priorityColors[task.priority],
                    flexShrink: 0,
                  }}
                />
                <span className="task-name" title={task.title}>{task.title}</span>
              </div>
            ))}
          </div>
        </div>

        <div 
          className="gantt-timeline"
          ref={timelineRef}
          onScroll={handleScroll}
        >
          <div 
            className="gantt-canvas"
            style={{ width: timelineWidth, height: tasks.length * ROW_HEIGHT }}
          >
            <canvas
              ref={gridCanvasRef}
              className="timeline-grid"
            />

            {visibleTasks.map((task, idx) => {
              const taskTop = (visibleTaskRange.startIndex + idx) * ROW_HEIGHT;
              const taskLeft = getDateOffset(task.startDate);
              const taskWidth = getTaskDuration(task);
              const isDragging = draggingTask === task.id;
              const hasConflict = conflictTask === task.id;

              return (
                <div
                  key={task.id}
                  className={`gantt-task-bar ${isDragging ? 'dragging' : ''} ${hasConflict ? 'conflict' : ''}`}
                  style={{
                    top: taskTop + (ROW_HEIGHT - TASK_BAR_HEIGHT) / 2,
                    left: taskLeft,
                    width: taskWidth,
                    background: `linear-gradient(135deg, ${priorityColors[task.priority]}, ${priorityColors[task.priority]}dd)`,
                    minWidth: '40px',
                    userSelect: 'none',
                  }}
                  onMouseDown={(e) => handleTaskMouseDown(e, task.id, 'move')}
                  onMouseEnter={(e) => handleTaskHover(e, task.id)}
                  onMouseLeave={(e) => handleTaskHover(e, null)}
                  onMouseMove={(e) => {
                    if (hoveredTask === task.id) {
                      setTooltipPos({ x: e.clientX, y: e.clientY });
                    }
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: '6px',
                      cursor: 'w-resize',
                      borderRadius: '6px 0 0 6px',
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      handleTaskMouseDown(e, task.id, 'resize-start');
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: '6px',
                      cursor: 'e-resize',
                      borderRadius: '0 6px 6px 0',
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      handleTaskMouseDown(e, task.id, 'resize-end');
                    }}
                  />
                  <span style={{ 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    paddingLeft: '4px',
                    paddingRight: '4px',
                  }}>
                    {task.assignee}
                  </span>
                </div>
              );
            })}

            {visibleTasks.map((task, idx) => {
              const taskTop = (visibleTaskRange.startIndex + idx) * ROW_HEIGHT;
              const taskLeft = getDateOffset(task.startDate);
              
              return task.dependencies.map(depId => {
                const depTask = tasks.find(t => t.id === depId);
                if (!depTask) return null;
                
                const depIndex = tasks.findIndex(t => t.id === depId);
                if (depIndex < visibleTaskRange.startIndex - 2 || depIndex > visibleTaskRange.endIndex + 2) {
                  return null;
                }
                
                const depTop = depIndex * ROW_HEIGHT;
                const depRight = getDateOffset(depTask.endDate) + DAY_WIDTH;
                
                const startX = depRight;
                const startY = depTop + ROW_HEIGHT / 2;
                const endX = taskLeft;
                const endY = taskTop + ROW_HEIGHT / 2;
                const midX = (startX + endX) / 2;

                return (
                  <svg
                    key={`dep-${task.id}-${depId}`}
                    className="dependency-line"
                    style={{
                      left: Math.min(startX, endX) - 10,
                      top: Math.min(startY, endY) - 10,
                      width: Math.abs(endX - startX) + 20,
                      height: Math.abs(endY - startY) + 20,
                    }}
                  >
                    <path
                      d={`M ${startX - Math.min(startX, endX) + 10} ${startY - Math.min(startY, endY) + 10} 
                          C ${midX - Math.min(startX, endX) + 10} ${startY - Math.min(startY, endY) + 10},
                            ${midX - Math.min(startX, endX) + 10} ${endY - Math.min(startY, endY) + 10},
                            ${endX - Math.min(startX, endX) + 10} ${endY - Math.min(startY, endY) + 10}`}
                      stroke="rgba(99, 102, 241, 0.6)"
                      strokeWidth="1.5"
                      fill="none"
                      markerEnd="url(#arrowhead)"
                    />
                    <defs>
                      <marker
                        id="arrowhead"
                        markerWidth="10"
                        markerHeight="7"
                        refX="9"
                        refY="3.5"
                        orient="auto"
                      >
                        <polygon
                          points="0 0, 10 3.5, 0 7"
                          fill="rgba(99, 102, 241, 0.6)"
                        />
                      </marker>
                    </defs>
                  </svg>
                );
              });
            })}
          </div>
        </div>
      </div>

      {hoveredTaskData && (
        <div 
          className="gantt-tooltip"
          style={{
            left: tooltipPos.x + 15,
            top: tooltipPos.y + 15,
          }}
        >
          <div className="gantt-tooltip-title">{hoveredTaskData.title}</div>
          <div className="gantt-tooltip-info">
            <div>负责人：{hoveredTaskData.assignee}</div>
            <div>开始：{hoveredTaskData.startDate}</div>
            <div>结束：{hoveredTaskData.endDate}</div>
            <div>优先级：{
              { high: '高', medium: '中', low: '低' }[hoveredTaskData.priority]
            }</div>
            <div>状态：{
              { 'todo': '待办', 'in-progress': '进行中', 'done': '完成' }[hoveredTaskData.status]
            }</div>
            {hoveredTaskData.dependencies.length > 0 && (
              <div>依赖：{hoveredTaskData.dependencies.length} 个任务</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GanttChart;
