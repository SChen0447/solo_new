import React, { useState, useCallback, useRef, useMemo } from 'react';
import type { Task, Dependency, ZoomLevel } from '@/types';
import { flattenGanttRows, buildGanttRows, getTaskDurationDays, getDateRange } from '@/utils/dataTransform';

const COL_WIDTH: Record<ZoomLevel, number> = { day: 40, week: 120, month: 240 };
const ROW_HEIGHT = 36;
const LABEL_WIDTH = 160;

interface Props {
  tasks: Task[];
  dependencies: Dependency[];
  zoomLevel: ZoomLevel;
  selectedTaskId: string | null;
  onSelectTask: (id: string) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function diffDays(a: string, b: string): number {
  return Math.round((new Date(a).getTime() - new Date(b).getTime()) / (86400000));
}

function formatLabel(dateStr: string, zoom: ZoomLevel): string {
  const d = new Date(dateStr);
  if (zoom === 'day') return `${d.getMonth() + 1}/${d.getDate()}`;
  if (zoom === 'week') return `${d.getMonth() + 1}/${d.getDate()}`;
  return `${d.getFullYear()}/${d.getMonth() + 1}`;
}

function generateDateHeaders(start: string, end: string, zoom: ZoomLevel): string[] {
  const headers: string[] = [];
  const d = new Date(start);
  const endDate = new Date(end);
  while (d <= endDate) {
    headers.push(d.toISOString().split('T')[0]);
    if (zoom === 'day') d.setDate(d.getDate() + 1);
    else if (zoom === 'week') d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
  }
  return headers;
}

export default function GanttChart({ tasks, dependencies, zoomLevel, selectedTaskId, onSelectTask, onUpdateTask }: Props) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; taskId: string } | null>(null);
  const [dragState, setDragState] = useState<{ taskId: string; startX: number; origStart: string } | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const [internalZoom, setInternalZoom] = useState<ZoomLevel>(zoomLevel);
  const activeZoom = internalZoom;

  const rows = flattenGanttRows(buildGanttRows(tasks, dependencies));
  const { start: rangeStart, end: rangeEnd } = getDateRange(tasks);
  const colWidth = COL_WIDTH[activeZoom];
  const dateHeaders = generateDateHeaders(rangeStart, rangeEnd, activeZoom);
  const totalWidth = dateHeaders.length * colWidth;

  const today = new Date().toISOString().split('T')[0];
  const todayOffset = Math.max(0, diffDays(today, rangeStart)) * (activeZoom === 'day' ? colWidth : colWidth / (activeZoom === 'week' ? 7 : 30));

  const taskIndexMap = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r, i) => m.set(r.task.id, i));
    return m;
  }, [rows]);

  const dayPx = activeZoom === 'day' ? colWidth : colWidth / (activeZoom === 'week' ? 7 : 30);

  const getTaskX = useCallback((task: Task) => diffDays(task.startDate, rangeStart) * dayPx, [rangeStart, dayPx]);

  const getTaskWidth = useCallback((task: Task) => getTaskDurationDays(task) * dayPx, [dayPx]);

  const gridLines = useMemo(() => dateHeaders.map((d, i) => ({ left: i * colWidth, key: d })), [dateHeaders, colWidth]);

  const handleContextMenu = useCallback((e: React.MouseEvent, taskId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, taskId });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent, task: Task) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    setDragState({ taskId: task.id, startX: e.clientX, origStart: task.startDate });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState) return;
  }, [dragState]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!dragState) return;
    const dx = e.clientX - dragState.startX;
    const daysMoved = Math.round(dx / dayPx);
    if (daysMoved !== 0) {
      const newStart = addDays(dragState.origStart, daysMoved);
      const task = tasks.find(t => t.id === dragState.taskId);
      if (task) {
        const duration = getTaskDurationDays(task);
        onUpdateTask(dragState.taskId, { startDate: newStart, endDate: addDays(newStart, duration) });
      }
    }
    setDragState(null);
  }, [dragState, dayPx, tasks, onUpdateTask]);

  const closeContext = useCallback(() => setContextMenu(null), []);

  const depArrows = dependencies.map(dep => {
    const predIdx = taskIndexMap.get(dep.predecessorId);
    const succIdx = taskIndexMap.get(dep.successorId);
    const predTask = tasks.find(t => t.id === dep.predecessorId);
    const succTask = tasks.find(t => t.id === dep.successorId);
    if (predIdx == null || succIdx == null || !predTask || !succTask) return null;
    const x1 = getTaskX(predTask) + getTaskWidth(predTask);
    const y1 = predIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
    const x2 = getTaskX(succTask);
    const y2 = succIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
    const midX = x1 + (x2 - x1) * 0.5;
    return (
      <path key={dep.id} d={`M${x1},${y1} C${midX},${y1} ${midX},${y2} ${x2},${y2}`}
        fill="none" stroke="#94a3b8" strokeWidth={1.5} markerEnd="url(#arrowhead)" />
    );
  });

  const contextTask = contextMenu ? tasks.find(t => t.id === contextMenu.taskId) : null;
  const contextDeps = contextTask
    ? dependencies.filter(d => d.predecessorId === contextTask.id || d.successorId === contextTask.id)
    : [];

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden select-none" onClick={closeContext}>
      <div className="flex items-center gap-1 px-3 py-2 border-b bg-gray-50">
        <span className="text-xs text-gray-500 mr-1">Zoom:</span>
        {(['day', 'week', 'month'] as ZoomLevel[]).map(z => (
          <button key={z}
            className={`px-3 py-1 text-xs rounded transition-colors ${activeZoom === z ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            onClick={() => setInternalZoom(z)}>
            {z === 'day' ? '日' : z === 'week' ? '周' : '月'}
          </button>
        ))}
      </div>

      <div className="flex">
        <div className="flex-shrink-0 border-r bg-gray-50" style={{ width: LABEL_WIDTH }}>
          <div className="h-8 border-b bg-primary text-white text-xs flex items-center px-2 font-medium">Task</div>
          {rows.map(r => (
            <div key={r.task.id}
              className={`flex items-center px-2 text-xs border-b truncate ${selectedTaskId === r.task.id ? 'bg-blue-50 font-medium' : ''}`}
              style={{ height: ROW_HEIGHT, paddingLeft: r.level * 12 + 8 }}>
              {r.task.name}
            </div>
          ))}
        </div>

        <div ref={chartRef} className="flex-1 overflow-x-auto"
          onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
          <div style={{ width: totalWidth, position: 'relative' }}>
            <div className="flex h-8 border-b">
              {dateHeaders.map(d => (
                <div key={d} className="flex-shrink-0 text-xs text-white bg-primary flex items-center justify-center border-r border-primary-light"
                  style={{ width: colWidth }}>
                  {formatLabel(d, activeZoom)}
                </div>
              ))}
            </div>

            {rows.map((r, i) => (
              <div key={r.task.id} className="relative border-b" style={{ height: ROW_HEIGHT }}>
                {gridLines.map(g => (
                  <div key={g.key} className="absolute top-0 bottom-0 border-r border-gray-100"
                    style={{ left: g.left, width: colWidth }} />
                ))}
                <div className="absolute top-1 bottom-1 rounded cursor-pointer"
                  style={{
                    left: getTaskX(r.task),
                    width: getTaskWidth(r.task),
                    backgroundColor: r.task.colorTag || '#3498DB',
                    transition: 'all 200ms ease-out',
                    opacity: dragState?.taskId === r.task.id ? 0.8 : 1,
                    boxShadow: selectedTaskId === r.task.id ? '0 0 0 2px #2C3E50' : undefined,
                  }}
                  onClick={() => onSelectTask(r.task.id)}
                  onContextMenu={e => handleContextMenu(e, r.task.id)}
                  onMouseDown={e => handleMouseDown(e, r.task)}>
                  <div className="absolute inset-y-0 left-0 rounded-l"
                    style={{ width: `${r.task.progress}%`, backgroundColor: '#E67E22', opacity: 0.85 }} />
                  <span className="relative text-white text-[10px] px-1 truncate block leading-none"
                    style={{ marginTop: (ROW_HEIGHT - 14) / 2 }}>
                    {r.task.name}
                  </span>
                </div>
              </div>
            ))}

            <svg className="absolute top-8 left-0 pointer-events-none" style={{ width: totalWidth, height: rows.length * ROW_HEIGHT }}>
              <defs>
                <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill="#94a3b8" />
                </marker>
              </defs>
              {depArrows}
              {todayOffset >= 0 && todayOffset <= totalWidth && (
                <line x1={todayOffset} y1={0} x2={todayOffset} y2={rows.length * ROW_HEIGHT}
                  stroke="#E74C3C" strokeWidth={2} strokeDasharray="4 2" />
              )}
            </svg>
          </div>
        </div>
      </div>

      {contextMenu && contextTask && (
        <div className="fixed z-50 bg-white/90 backdrop-blur shadow-lg rounded-lg p-4 text-xs min-w-[200px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={e => e.stopPropagation()}>
          <div className="font-bold text-sm mb-2">{contextTask.name}</div>
          <div className="space-y-1 text-gray-700">
            <div><span className="text-gray-500">Start:</span> {contextTask.startDate}</div>
            <div><span className="text-gray-500">End:</span> {contextTask.endDate}</div>
            <div><span className="text-gray-500">Hours:</span> {contextTask.actualHours}/{contextTask.estimatedHours}</div>
            <div><span className="text-gray-500">Assignee:</span> {contextTask.assignee}</div>
            <div><span className="text-gray-500">Progress:</span> {contextTask.progress}%</div>
            {contextDeps.length > 0 && (
              <div><span className="text-gray-500">Deps:</span> {contextDeps.map(d => d.predecessorId === contextTask.id ? `→${d.successorId.slice(0, 6)}` : `←${d.predecessorId.slice(0, 6)}`).join(', ')}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
