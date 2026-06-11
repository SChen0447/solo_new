import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { Task, hasDependencyConflict } from '../utils/taskData';
import { useTaskContext } from '../App';

const ROW_HEIGHT = 44;
const TASK_BAR_HEIGHT = 28;
const DAY_WIDTH = 40;
const TIMELINE_HEADER_HEIGHT = 40;

const PRIORITY_COLORS: Record<string, [string, string]> = {
  high: ['#ef4444', '#dc2626'],
  medium: ['#f59e0b', '#d97706'],
  low: ['#10b981', '#059669'],
};

interface TaskLayout {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  colorStart: string;
  colorEnd: string;
  priority: string;
  assignee: string;
  title: string;
  startDate: string;
  endDate: string;
  status: string;
  dependencies: string[];
}

const GanttChart: React.FC = () => {
  const { state, updateTask, filteredTasks: tasks } = useTaskContext();
  const sprint = state.sprint;

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const timelineHeaderRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const scrollTopRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const containerSizeRef = useRef({ width: 0, height: 0 });
  const taskLayoutsRef = useRef<Map<string, TaskLayout>>(new Map());
  const draggingRef = useRef<{
    taskId: string;
    type: 'move' | 'resize-start' | 'resize-end';
    startX: number;
    origStart: string;
    origEnd: string;
    currentStart: string;
    currentEnd: string;
  } | null>(null);
  const hoveredTaskRef = useRef<string | null>(null);
  const conflictRef = useRef<string | null>(null);
  const lastRenderedScrollRef = useRef({ top: -1, left: -1 });

  const [tooltipData, setTooltipData] = useState<{
    task: Task;
    x: number;
    y: number;
  } | null>(null);
  const [sidebarTasks, setSidebarTasks] = useState<{ tasks: Task[]; offset: number }>({
    tasks: [],
    offset: 0,
  });

  const { totalDays, startDate } = useMemo(() => {
    const start = new Date(sprint.startDate);
    const end = new Date(sprint.endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return { totalDays: days, startDate: start };
  }, [sprint]);

  const timelineWidth = useMemo(() => totalDays * DAY_WIDTH, [totalDays]);
  const totalHeight = useMemo(() => tasks.length * ROW_HEIGHT, [tasks.length]);

  const getDateOffset = useCallback(
    (dateStr: string) => {
      const date = new Date(dateStr);
      const diff = date.getTime() - startDate.getTime();
      return Math.round(diff / (1000 * 60 * 60 * 24)) * DAY_WIDTH;
    },
    [startDate]
  );

  const getTaskWidth = useCallback((task: Task) => {
    const s = new Date(task.startDate);
    const e = new Date(task.endDate);
    const days = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, days) * DAY_WIDTH;
  }, []);

  const addDays = useCallback((dateStr: string, days: number): string => {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }, []);

  const computeTaskLayouts = useCallback(
    (offsetX: number = 0) => {
      const layouts = new Map<string, TaskLayout>();
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        const x = getDateOffset(task.startDate) + offsetX;
        const y = i * ROW_HEIGHT + (ROW_HEIGHT - TASK_BAR_HEIGHT) / 2;
        const w = getTaskWidth(task);
        const colors = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium;
        layouts.set(task.id, {
          id: task.id,
          x,
          y,
          width: w,
          height: TASK_BAR_HEIGHT,
          colorStart: colors[0],
          colorEnd: colors[1],
          priority: task.priority,
          assignee: task.assignee,
          title: task.title,
          startDate: task.startDate,
          endDate: task.endDate,
          status: task.status,
          dependencies: task.dependencies,
        });
      }
      taskLayoutsRef.current = layouts;
      return layouts;
    },
    [tasks, getDateOffset, getTaskWidth]
  );

  const renderCanvas = useCallback(
    (force = false) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const st = scrollTopRef.current;
      const sl = scrollLeftRef.current;

      if (
        !force &&
        st === lastRenderedScrollRef.current.top &&
        sl === lastRenderedScrollRef.current.left
      ) {
        return;
      }

      lastRenderedScrollRef.current = { top: st, left: sl };

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const cw = containerSizeRef.current.width;
      const ch = containerSizeRef.current.height - TIMELINE_HEADER_HEIGHT;

      if (canvas.width !== cw * dpr || canvas.height !== ch * dpr) {
        canvas.width = cw * dpr;
        canvas.height = ch * dpr;
        canvas.style.width = `${cw}px`;
        canvas.style.height = `${ch}px`;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cw, ch);

      ctx.save();
      ctx.translate(-sl, -st);

      ctx.strokeStyle = 'rgba(58, 58, 82, 0.25)';
      ctx.lineWidth = 1;

      const startDay = Math.max(0, Math.floor(sl / DAY_WIDTH));
      const endDay = Math.min(totalDays, Math.ceil((sl + cw) / DAY_WIDTH) + 1);
      for (let i = startDay; i <= endDay; i++) {
        const x = i * DAY_WIDTH + 0.5;
        ctx.beginPath();
        ctx.moveTo(x, Math.max(0, st));
        ctx.lineTo(x, Math.min(totalHeight, st + ch));
        ctx.stroke();
      }

      const startRow = Math.max(0, Math.floor(st / ROW_HEIGHT));
      const endRow = Math.min(tasks.length, Math.ceil((st + ch) / ROW_HEIGHT) + 1);
      for (let i = startRow; i <= endRow; i++) {
        const y = i * ROW_HEIGHT + 0.5;
        ctx.beginPath();
        ctx.moveTo(Math.max(0, sl), y);
        ctx.lineTo(Math.min(timelineWidth, sl + cw), y);
        ctx.stroke();
      }

      const today = new Date();
      const todayOffset =
        Math.round((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) * DAY_WIDTH;
      if (todayOffset >= 0 && todayOffset <= timelineWidth) {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(todayOffset, Math.max(0, st));
        ctx.lineTo(todayOffset, Math.min(totalHeight, st + ch));
        ctx.stroke();

        ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
        ctx.font = '10px sans-serif';
        ctx.fillText('今天', todayOffset + 4, Math.max(14, st + 14));
      }

      const layouts = taskLayoutsRef.current;
      const drag = draggingRef.current;
      const conflictId = conflictRef.current;
      const hoveredId = hoveredTaskRef.current;

      for (let i = startRow; i < endRow; i++) {
        const task = tasks[i];
        if (!task) continue;
        const layout = layouts.get(task.id);
        if (!layout) continue;

        let lx = layout.x;
        let lw = layout.width;

        if (drag && drag.taskId === task.id) {
          const dx = drag.currentStart !== drag.origStart || drag.currentEnd !== drag.origEnd;
          if (dx) {
            lx = getDateOffset(drag.currentStart);
            const sw = new Date(drag.currentStart).getTime();
            const ew = new Date(drag.currentEnd).getTime();
            lw = Math.max(DAY_WIDTH, (Math.ceil((ew - sw) / (1000 * 60 * 60 * 24)) + 1) * DAY_WIDTH);
          }
        }

        if (lx + lw < sl || lx > sl + cw) continue;

        const ly = layout.y;

        if (hoveredId === task.id && !(drag && drag.taskId === task.id)) {
          ctx.shadowColor = 'rgba(0,0,0,0.5)';
          ctx.shadowBlur = 12;
          ctx.shadowOffsetY = 2;
        }

        const grad = ctx.createLinearGradient(lx, ly, lx + lw, ly + layout.height);
        grad.addColorStop(0, layout.colorStart);
        grad.addColorStop(1, layout.colorEnd);

        ctx.beginPath();
        ctx.roundRect(lx, ly, lw, layout.height, 6);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        if (conflictId === task.id) {
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(lx - 1, ly - 1, lw + 2, layout.height + 2, 7);
          ctx.stroke();
        }

        if (hoveredId === task.id || (drag && drag.taskId === task.id)) {
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.beginPath();
          ctx.roundRect(lx, ly, lw, layout.height, 6);
          ctx.fill();
        }

        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = '11px -apple-system, sans-serif';
        const textMaxW = lw - 12;
        if (textMaxW > 20) {
          let displayText = layout.assignee;
          const measured = ctx.measureText(displayText).width;
          if (measured > textMaxW) {
            while (displayText.length > 1 && ctx.measureText(displayText + '…').width > textMaxW) {
              displayText = displayText.slice(0, -1);
            }
            displayText += '…';
          }
          ctx.fillText(displayText, lx + 8, ly + layout.height / 2 + 4);
        }

        if (hoveredId === task.id || (drag && drag.taskId === task.id)) {
          ctx.fillStyle = 'rgba(255,255,255,0.3)';
          ctx.fillRect(lx, ly, 5, layout.height);
          ctx.fillRect(lx + lw - 5, ly, 5, layout.height);
        }
      }

      ctx.strokeStyle = 'rgba(99, 102, 241, 0.5)';
      ctx.lineWidth = 1.5;
      for (let i = startRow; i < endRow; i++) {
        const task = tasks[i];
        if (!task || !task.dependencies.length) continue;

        let taskStartX = getDateOffset(task.startDate);
        const drag = draggingRef.current;
        if (drag && drag.taskId === task.id) {
          taskStartX = getDateOffset(drag.currentStart);
        }
        const taskCenterY = i * ROW_HEIGHT + ROW_HEIGHT / 2;

        for (const depId of task.dependencies) {
          const depIndex = tasks.findIndex(t => t.id === depId);
          if (depIndex < 0) continue;
          if (depIndex < startRow - 5 || depIndex > endRow + 5) continue;

          const depTask = tasks[depIndex];
          let depEndX = getDateOffset(depTask.endDate) + DAY_WIDTH;
          if (drag && drag.taskId === depId) {
            depEndX = getDateOffset(drag.currentEnd) + DAY_WIDTH;
          }
          const depCenterY = depIndex * ROW_HEIGHT + ROW_HEIGHT / 2;

          const midX = (depEndX + taskStartX) / 2;

          ctx.beginPath();
          ctx.moveTo(depEndX, depCenterY);
          ctx.bezierCurveTo(midX, depCenterY, midX, taskCenterY, taskStartX, taskCenterY);
          ctx.stroke();

          const angle = Math.atan2(taskCenterY - depCenterY, taskStartX - midX);
          const arrowLen = 8;
          ctx.beginPath();
          ctx.moveTo(taskStartX, taskCenterY);
          ctx.lineTo(
            taskStartX - arrowLen * Math.cos(angle - Math.PI / 6),
            taskCenterY - arrowLen * Math.sin(angle - Math.PI / 6)
          );
          ctx.moveTo(taskStartX, taskCenterY);
          ctx.lineTo(
            taskStartX - arrowLen * Math.cos(angle + Math.PI / 6),
            taskCenterY - arrowLen * Math.sin(angle + Math.PI / 6)
          );
          ctx.stroke();
        }
      }

      ctx.restore();
    },
    [tasks, totalDays, totalHeight, timelineWidth, startDate, getDateOffset]
  );

  useEffect(() => {
    computeTaskLayouts();
    renderCanvas(true);
  }, [tasks, computeTaskLayouts, renderCanvas]);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const sidebarEl = containerRef.current.querySelector('.gantt-sidebar');
        const sidebarW = sidebarEl ? sidebarEl.getBoundingClientRect().width : 280;
        containerSizeRef.current = {
          width: rect.width - sidebarW,
          height: rect.height,
        };
        renderCanvas(true);
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [renderCanvas]);

  useEffect(() => {
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  const scheduleRender = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    animFrameRef.current = requestAnimationFrame(() => renderCanvas());
  }, [renderCanvas]);

  const hitTest = useCallback(
    (clientX: number, clientY: number): { taskId: string; type: 'move' | 'resize-start' | 'resize-end' } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left + scrollLeftRef.current;
      const y = clientY - rect.top + scrollTopRef.current;

      const layouts = taskLayoutsRef.current;
      for (const [id, layout] of layouts) {
        if (y >= layout.y && y <= layout.y + layout.height) {
          if (x >= layout.x && x <= layout.x + layout.width) {
            let type: 'move' | 'resize-start' | 'resize-end' = 'move';
            if (x - layout.x <= 6) {
              type = 'resize-start';
            } else if (layout.x + layout.width - x <= 6) {
              type = 'resize-end';
            }
            return { taskId: id, type };
          }
        }
      }
      return null;
    },
    []
  );

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const hit = hitTest(e.clientX, e.clientY);
      if (!hit) return;

      const task = tasks.find(t => t.id === hit.taskId);
      if (!task) return;

      draggingRef.current = {
        taskId: hit.taskId,
        type: hit.type,
        startX: e.clientX,
        origStart: task.startDate,
        origEnd: task.endDate,
        currentStart: task.startDate,
        currentEnd: task.endDate,
      };

      hoveredTaskRef.current = hit.taskId;
      setTooltipData(null);
      scheduleRender();
    },
    [tasks, hitTest, scheduleRender]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const drag = draggingRef.current;
      if (drag) {
        const deltaX = e.clientX - drag.startX;
        const deltaDays = Math.round(deltaX / DAY_WIDTH);

        let newStart = drag.origStart;
        let newEnd = drag.origEnd;

        if (drag.type === 'move' && deltaDays !== 0) {
          newStart = addDays(drag.origStart, deltaDays);
          newEnd = addDays(drag.origEnd, deltaDays);
        } else if (drag.type === 'resize-start' && deltaDays !== 0) {
          newStart = addDays(drag.origStart, deltaDays);
          if (new Date(newStart) >= new Date(newEnd)) {
            newStart = addDays(newEnd, -1);
          }
        } else if (drag.type === 'resize-end' && deltaDays !== 0) {
          newEnd = addDays(drag.origEnd, deltaDays);
          if (new Date(newEnd) <= new Date(newStart)) {
            newEnd = addDays(newStart, 1);
          }
        }

        drag.currentStart = newStart;
        drag.currentEnd = newEnd;

        const task = tasks.find(t => t.id === drag.taskId);
        if (task) {
          const updated = { ...task, startDate: newStart, endDate: newEnd };
          if (hasDependencyConflict(updated, tasks)) {
            conflictRef.current = drag.taskId;
          } else {
            conflictRef.current = null;
          }
        }

        computeTaskLayouts();
        scheduleRender();
        return;
      }

      const hit = hitTest(e.clientX, e.clientY);
      const prevHovered = hoveredTaskRef.current;
      hoveredTaskRef.current = hit ? hit.taskId : null;

      if (hit) {
        const task = tasks.find(t => t.id === hit.taskId);
        if (task) {
          setTooltipData({ task, x: e.clientX, y: e.clientY });
        }
      } else {
        setTooltipData(null);
      }

      if (prevHovered !== hoveredTaskRef.current) {
        scheduleRender();
      }

      const canvas = canvasRef.current;
      if (canvas) {
        if (hit) {
          canvas.style.cursor = hit.type === 'move' ? 'grab' : hit.type === 'resize-start' ? 'w-resize' : 'e-resize';
        } else {
          canvas.style.cursor = 'default';
        }
      }
    };

    const handleMouseUp = () => {
      const drag = draggingRef.current;
      if (drag) {
        if (drag.currentStart !== drag.origStart || drag.currentEnd !== drag.origEnd) {
          if (!conflictRef.current) {
            updateTask(drag.taskId, {
              startDate: drag.currentStart,
              endDate: drag.currentEnd,
            });
          }
        }
        draggingRef.current = null;
        conflictRef.current = null;
        hoveredTaskRef.current = null;
        computeTaskLayouts();
        scheduleRender();
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [tasks, hitTest, scheduleRender, computeTaskLayouts, addDays, updateTask]);

  const handleTimelineScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      scrollTopRef.current = target.scrollTop;
      scrollLeftRef.current = target.scrollLeft;

      if (sidebarRef.current) {
        sidebarRef.current.scrollTop = target.scrollTop;
      }

      const startRow = Math.max(0, Math.floor(target.scrollTop / ROW_HEIGHT) - 2);
      const visibleCount = Math.ceil(containerSizeRef.current.height / ROW_HEIGHT) + 4;
      const endRow = Math.min(tasks.length, startRow + visibleCount);
      setSidebarTasks({ tasks: tasks.slice(startRow, endRow), offset: startRow });

      if (timelineHeaderRef.current) {
        timelineHeaderRef.current.scrollLeft = target.scrollLeft;
      }

      scheduleRender();
    },
    [tasks, scheduleRender]
  );

  const renderTimelineHeader = useMemo(() => {
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
            color: isWeekend ? '#6b6b8a' : '#a0a0b8',
            borderRight: '1px solid rgba(58, 58, 82, 0.3)',
            background: isWeekend ? 'rgba(0,0,0,0.1)' : 'transparent',
            flexShrink: 0,
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
  }, [totalDays, startDate]);

  return (
    <div className="gantt-container" ref={containerRef}>
      <div className="gantt-header">
        <div className="gantt-sidebar-header">任务名称</div>
        <div
          ref={timelineHeaderRef}
          className="gantt-timeline-header"
          style={{
            overflow: 'hidden',
            position: 'relative',
            height: TIMELINE_HEADER_HEIGHT,
          }}
        >
          <div style={{ position: 'relative', width: timelineWidth, height: '100%' }}>
            {renderTimelineHeader}
          </div>
        </div>
      </div>

      <div className="gantt-body">
        <div
          className="gantt-sidebar"
          ref={sidebarRef}
          style={{ overflow: 'hidden' }}
        >
          <div style={{ height: totalHeight, position: 'relative' }}>
            {sidebarTasks.tasks.map((task, idx) => (
              <div
                key={task.id}
                className="gantt-row-label"
                style={{
                  position: 'absolute',
                  top: (sidebarTasks.offset + idx) * ROW_HEIGHT,
                  width: '100%',
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: PRIORITY_COLORS[task.priority]?.[0] || '#f59e0b',
                    flexShrink: 0,
                  }}
                />
                <span className="task-name" title={task.title}>
                  {task.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div
          className="gantt-timeline"
          onScroll={handleTimelineScroll}
          style={{ position: 'relative' }}
        >
          <div style={{ width: timelineWidth, height: totalHeight, position: 'relative' }}>
            <canvas
              ref={canvasRef}
              onMouseDown={handleCanvasMouseDown}
              style={{
                position: 'sticky',
                top: 0,
                left: 0,
                display: 'block',
              }}
            />
          </div>
        </div>
      </div>

      {tooltipData && !draggingRef.current && (
        <div
          className="gantt-tooltip"
          style={{
            left: tooltipData.x + 15,
            top: tooltipData.y + 15,
          }}
        >
          <div className="gantt-tooltip-title">{tooltipData.task.title}</div>
          <div className="gantt-tooltip-info">
            <div>负责人：{tooltipData.task.assignee}</div>
            <div>开始：{tooltipData.task.startDate}</div>
            <div>结束：{tooltipData.task.endDate}</div>
            <div>
              优先级：
              {{ high: '高', medium: '中', low: '低' }[tooltipData.task.priority]}
            </div>
            <div>
              状态：
              {{ todo: '待办', 'in-progress': '进行中', done: '完成' }[tooltipData.task.status]}
            </div>
            {tooltipData.task.dependencies.length > 0 && (
              <div>依赖：{tooltipData.task.dependencies.length} 个任务</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(GanttChart);
