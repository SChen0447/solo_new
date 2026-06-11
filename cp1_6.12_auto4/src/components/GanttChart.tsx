import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  DragStartEvent,
  DragMoveEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import type { Task, Dependency, ZoomLevel } from '@/types';
import {
  flattenGanttRows,
  buildGanttRows,
  getTaskDurationDays,
  getDateRange,
  propagateDependencyChanges,
} from '@/utils/dataTransform';

const COL_WIDTH: Record<ZoomLevel, number> = { day: 40, week: 120, month: 240 };
const ROW_HEIGHT = 36;
const LABEL_WIDTH = 160;
const LABEL_WIDTH_MOBILE = 100;

interface Props {
  tasks: Task[];
  dependencies: Dependency[];
  zoomLevel: ZoomLevel;
  selectedTaskId: string | null;
  selectedDependencyId: string | null;
  onSelectTask: (id: string | null) => void;
  onSelectDependency: (id: string | null) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onUpdateTasks: (tasks: Task[]) => void;
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

function DraggableTaskBar({
  task,
  x,
  width,
  rowHeight,
  selected,
  isDragging,
  onClick,
  onContextMenu,
}: {
  task: Task;
  x: number;
  width: number;
  rowHeight: number;
  selected: boolean;
  isDragging: boolean;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: task.id,
    data: { task },
  });

  const style: React.CSSProperties = transform
    ? {
        transform: `translate3d(${transform.x}px, 0, 0)`,
      }
    : {};

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onContextMenu={(e) => {
        e.stopPropagation();
        onContextMenu(e);
      }}
      className="absolute top-1 bottom-1 rounded cursor-grab active:cursor-grabbing"
      style={{
        left: x,
        width,
        backgroundColor: task.colorTag || '#3498DB',
        transition: isDragging ? 'none' : 'all 200ms ease-out',
        opacity: isDragging ? 0.35 : 1,
        boxShadow: selected ? '0 0 0 2px #2C3E50' : undefined,
        ...style,
      }}
    >
      <div
        className="absolute inset-y-0 left-0 rounded-l"
        style={{ width: `${task.progress}%`, backgroundColor: '#E67E22', opacity: 0.85 }}
      />
      <span
        className="relative text-white text-[10px] md:text-xs px-1 truncate block leading-none"
        style={{ marginTop: (rowHeight - 14) / 2 }}
      >
        {task.name}
      </span>
    </div>
  );
}

export default function GanttChart({
  tasks,
  dependencies,
  zoomLevel,
  selectedTaskId,
  selectedDependencyId,
  onSelectTask,
  onSelectDependency,
  onUpdateTask,
  onUpdateTasks,
}: Props) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; taskId: string } | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [dragDeltaX, setDragDeltaX] = useState(0);
  const [internalZoom, setInternalZoom] = useState<ZoomLevel>(zoomLevel);
  const activeZoom = internalZoom;
  const chartRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const rows = flattenGanttRows(buildGanttRows(tasks, dependencies));
  const { start: rangeStart, end: rangeEnd } = getDateRange(tasks);
  const colWidth = COL_WIDTH[activeZoom];
  const dateHeaders = generateDateHeaders(rangeStart, rangeEnd, activeZoom);
  const totalWidth = dateHeaders.length * colWidth;

  const today = new Date().toISOString().split('T')[0];
  const dayPx = activeZoom === 'day' ? colWidth : colWidth / (activeZoom === 'week' ? 7 : 30);
  const todayOffset = Math.max(0, diffDays(today, rangeStart)) * dayPx;

  const taskIndexMap = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r, i) => m.set(r.task.id, i));
    return m;
  }, [rows]);

  const getTaskX = useCallback(
    (task: Task) => {
      let base = diffDays(task.startDate, rangeStart) * dayPx;
      if (activeDragId === task.id) {
        base += dragDeltaX;
      }
      return base;
    },
    [rangeStart, dayPx, activeDragId, dragDeltaX]
  );

  const getTaskWidth = useCallback((task: Task) => getTaskDurationDays(task) * dayPx, [dayPx]);
  const gridLines = useMemo(
    () => dateHeaders.map((d, i) => ({ left: i * colWidth, key: d })),
    [dateHeaders, colWidth]
  );

  const activeTask = activeDragId ? tasks.find((t) => t.id === activeDragId) : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
    setContextMenu(null);
    setDragDeltaX(0);
  };

  const handleDragMove = useCallback((event: DragMoveEvent) => {
    setDragDeltaX(event.delta.x);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const taskId = event.active.id as string;
      const task = tasks.find((t) => t.id === taskId);
      setActiveDragId(null);
      setDragDeltaX(0);

      if (!task) return;

      const deltaX = event.delta.x;
      const daysMoved = Math.round(deltaX / dayPx);
      if (daysMoved === 0) return;

      const newStart = addDays(task.startDate, daysMoved);
      const updatedTasks = propagateDependencyChanges(taskId, newStart, tasks, dependencies);
      onUpdateTasks(updatedTasks);
    },
    [tasks, dependencies, dayPx, onUpdateTasks]
  );

  const handleContextMenu = useCallback((e: React.MouseEvent, taskId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, taskId });
  }, []);

  const closeContext = useCallback(() => setContextMenu(null), []);

  const depArrows = useMemo(() => {
    return dependencies.map((dep) => {
      const predIdx = taskIndexMap.get(dep.predecessorId);
      const succIdx = taskIndexMap.get(dep.successorId);
      const predTask = tasks.find((t) => t.id === dep.predecessorId);
      const succTask = tasks.find((t) => t.id === dep.successorId);
      if (predIdx == null || succIdx == null || !predTask || !succTask) return null;

      let predX = diffDays(predTask.startDate, rangeStart) * dayPx;
      let succX = diffDays(succTask.startDate, rangeStart) * dayPx;
      if (activeDragId === predTask.id) predX += dragDeltaX;
      if (activeDragId === succTask.id) succX += dragDeltaX;

      const predWidth = getTaskWidth(predTask);
      const x1 = predX + predWidth;
      const y1 = predIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
      const x2 = succX;
      const y2 = succIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
      const midX = x1 + (x2 - x1) * 0.5;

      const isSelected = selectedDependencyId === dep.id;

      return (
        <g key={dep.id}>
          <path
            d={`M${x1},${y1} C${midX},${y1} ${midX},${y2} ${x2},${y2}`}
            fill="none"
            stroke="transparent"
            strokeWidth={14}
            style={{ cursor: 'pointer', transition: 'all 200ms ease-out' }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectDependency(isSelected ? null : dep.id);
              onSelectTask(null);
            }}
          />
          <path
            d={`M${x1},${y1} C${midX},${y1} ${midX},${y2} ${x2},${y2}`}
            fill="none"
            stroke={isSelected ? '#3498DB' : '#94a3b8'}
            strokeWidth={isSelected ? 3 : 1.5}
            markerEnd={`url(#arrowhead-${isSelected ? 'selected' : 'normal'})`}
            style={{ pointerEvents: 'none', transition: 'all 200ms ease-out' }}
          />
        </g>
      );
    });
  }, [
    dependencies,
    taskIndexMap,
    tasks,
    rangeStart,
    dayPx,
    activeDragId,
    dragDeltaX,
    getTaskWidth,
    selectedDependencyId,
    onSelectDependency,
    onSelectTask,
  ]);

  const contextTask = contextMenu ? tasks.find((t) => t.id === contextMenu.taskId) : null;
  const contextDeps = contextTask
    ? dependencies.filter((d) => d.predecessorId === contextTask.id || d.successorId === contextTask.id)
    : [];

  const selectedDependency = selectedDependencyId
    ? dependencies.find((d) => d.id === selectedDependencyId)
    : null;
  const predTask = selectedDependency ? tasks.find((t) => t.id === selectedDependency.predecessorId) : null;
  const succTask = selectedDependency ? tasks.find((t) => t.id === selectedDependency.successorId) : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      <div
        className="bg-white rounded-lg shadow overflow-hidden select-none"
        onClick={() => {
          closeContext();
          onSelectDependency(null);
          onSelectTask(null);
        }}
      >
        <div className="flex items-center gap-1 px-3 py-2 border-b bg-gray-50">
          <span className="text-xs text-gray-500 mr-1">缩放:</span>
          {(['day', 'week', 'month'] as ZoomLevel[]).map((z) => (
            <button
              key={z}
              className={`px-3 py-1 text-xs rounded transition-all duration-200 hover:-translate-y-0.5 ${
                activeZoom === z
                  ? 'bg-primary text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:shadow'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                setInternalZoom(z);
              }}
            >
              {z === 'day' ? '日' : z === 'week' ? '周' : '月'}
            </button>
          ))}
        </div>

        <div className="flex">
          <div
            className="flex-shrink-0 border-r bg-gray-50 hidden md:block"
            style={{ width: LABEL_WIDTH }}
          >
            <div className="h-8 border-b bg-primary text-white text-xs flex items-center px-2 font-medium">
              任务
            </div>
            {rows.map((r) => (
              <div
                key={r.task.id}
                className={`flex items-center px-2 text-xs border-b truncate cursor-pointer ${
                  selectedTaskId === r.task.id ? 'bg-blue-50 font-medium' : ''
                }`}
                style={{ height: ROW_HEIGHT, paddingLeft: r.level * 12 + 8 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTask(r.task.id);
                }}
              >
                {r.task.name}
              </div>
            ))}
          </div>

          <div ref={chartRef} className="flex-1 overflow-x-auto">
            <div style={{ width: totalWidth, position: 'relative', minWidth: '100%' }}>
              <div className="flex h-8 border-b">
                {dateHeaders.map((d) => (
                  <div
                    key={d}
                    className="flex-shrink-0 text-xs text-white bg-primary flex items-center justify-center border-r border-primary-light"
                    style={{ width: colWidth }}
                  >
                    {formatLabel(d, activeZoom)}
                  </div>
                ))}
              </div>

              {rows.map((r, i) => (
                <div key={r.task.id} className="relative border-b" style={{ height: ROW_HEIGHT }}>
                  {gridLines.map((g) => (
                    <div
                      key={g.key}
                      className="absolute top-0 bottom-0 border-r border-gray-100"
                      style={{ left: g.left, width: colWidth }}
                    />
                  ))}
                  <DraggableTaskBar
                    task={r.task}
                    x={getTaskX(r.task)}
                    width={getTaskWidth(r.task)}
                    rowHeight={ROW_HEIGHT}
                    selected={selectedTaskId === r.task.id}
                    isDragging={activeDragId === r.task.id}
                    onClick={() => onSelectTask(r.task.id)}
                    onContextMenu={(e) => handleContextMenu(e, r.task.id)}
                  />
                </div>
              ))}

              <svg
                className="absolute top-8 left-0"
                style={{ width: totalWidth, height: rows.length * ROW_HEIGHT }}
                onClick={(e) => e.stopPropagation()}
              >
                <defs>
                  <marker
                    id="arrowhead-normal"
                    markerWidth="8"
                    markerHeight="6"
                    refX="8"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="0 0, 8 3, 0 6" fill="#94a3b8" />
                  </marker>
                  <marker
                    id="arrowhead-selected"
                    markerWidth="8"
                    markerHeight="6"
                    refX="8"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="0 0, 8 3, 0 6" fill="#3498DB" />
                  </marker>
                </defs>
                {depArrows}
                {todayOffset >= 0 && todayOffset <= totalWidth && (
                  <line
                    x1={todayOffset}
                    y1={0}
                    x2={todayOffset}
                    y2={rows.length * ROW_HEIGHT}
                    stroke="#E74C3C"
                    strokeWidth={2}
                    strokeDasharray="4 2"
                    style={{ pointerEvents: 'none' }}
                  />
                )}
              </svg>
            </div>
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeTask ? (
            <div
              className="rounded shadow-lg"
              style={{
                width: getTaskWidth(activeTask),
                height: ROW_HEIGHT - 8,
                backgroundColor: activeTask.colorTag || '#3498DB',
                opacity: 0.75,
              }}
            >
              <div
                className="absolute inset-y-0 left-0 rounded-l"
                style={{ width: `${activeTask.progress}%`, backgroundColor: '#E67E22', opacity: 0.85 }}
              />
              <span
                className="relative text-white text-[10px] px-1 truncate block leading-none"
                style={{ marginTop: (ROW_HEIGHT - 14) / 2 }}
              >
                {activeTask.name}
              </span>
            </div>
          ) : null}
        </DragOverlay>

        {contextMenu && contextTask && (
          <div
            className="fixed z-50 bg-white/95 backdrop-blur shadow-lg rounded-lg p-4 text-xs min-w-[200px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="font-bold text-sm mb-2">{contextTask.name}</div>
            <div className="space-y-1 text-gray-700">
              <div>
                <span className="text-gray-500">开始:</span> {contextTask.startDate}
              </div>
              <div>
                <span className="text-gray-500">结束:</span> {contextTask.endDate}
              </div>
              <div>
                <span className="text-gray-500">工时:</span> {contextTask.actualHours}/
                {contextTask.estimatedHours}h
              </div>
              <div>
                <span className="text-gray-500">负责人:</span> {contextTask.assignee}
              </div>
              <div>
                <span className="text-gray-500">进度:</span> {contextTask.progress}%
              </div>
              {contextDeps.length > 0 && (
                <div>
                  <span className="text-gray-500">依赖:</span>{' '}
                  {contextDeps
                    .map((d) => {
                      const other =
                        d.predecessorId === contextTask.id
                          ? tasks.find((t) => t.id === d.successorId)
                          : tasks.find((t) => t.id === d.predecessorId);
                      return other
                        ? d.predecessorId === contextTask.id
                          ? `→ ${other.name}`
                          : `← ${other.name}`
                        : '';
                    })
                    .filter(Boolean)
                    .join(', ')}
                </div>
              )}
            </div>
          </div>
        )}

        {selectedDependency && predTask && succTask && (
          <div
            className="fixed z-50 bg-white/95 backdrop-blur shadow-lg rounded-lg p-4 text-xs min-w-[240px] animate-in"
            style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="font-bold text-sm mb-3 text-primary">依赖详情</div>
            <div className="space-y-2 text-gray-700 mb-4">
              <div>
                <span className="text-gray-500">前置任务:</span>{' '}
                <span className="font-medium">{predTask.name}</span>
              </div>
              <div className="text-center text-accent-blue font-semibold">↓ {selectedDependency.type}</div>
              <div>
                <span className="text-gray-500">后置任务:</span>{' '}
                <span className="font-medium">{succTask.name}</span>
              </div>
              <div>
                <span className="text-gray-500">类型:</span> Finish-to-Start (FS)
              </div>
            </div>
            <div className="flex gap-2">
              <button
                className="flex-1 px-3 py-1.5 bg-red-500 text-white rounded hover:bg-red-600 hover:-translate-y-0.5 hover:shadow transition-all duration-200"
                onClick={() => {
                  const store = (window as any).__appStore;
                  if (store) store.removeDependency(selectedDependency.id);
                  onSelectDependency(null);
                }}
              >
                删除依赖
              </button>
              <button
                className="flex-1 px-3 py-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 hover:-translate-y-0.5 hover:shadow transition-all duration-200"
                onClick={() => onSelectDependency(null)}
              >
                关闭
              </button>
            </div>
          </div>
        )}
      </div>
    </DndContext>
  );
}
