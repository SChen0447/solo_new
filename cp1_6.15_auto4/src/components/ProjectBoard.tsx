import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useStore } from '../store/useStore';
import type { Task } from '../api/api';
import './ProjectBoard.css';

const GRADIENT_COLORS = [
  ['#667eea', '#764ba2'],
  ['#f093fb', '#f5576c'],
  ['#4facfe', '#00f2fe'],
  ['#43e97b', '#38f9d7'],
  ['#fa709a', '#fee140'],
  ['#a8edea', '#fed6e3']
];

type ColumnStatus = 'todo' | 'in-progress' | 'done';

const COLUMNS: { status: ColumnStatus; title: string; color: string; icon: string }[] = [
  { status: 'todo', title: '待办', color: '#4facfe', icon: '📋' },
  { status: 'in-progress', title: '进行中', color: '#fb923c', icon: '🔨' },
  { status: 'done', title: '完成', color: '#4ade80', icon: '✅' }
];

const ProjectBoard: React.FC = () => {
  const { currentProject, setCurrentView, updateTaskStatus, updateProjectTasks } = useStore();
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ColumnStatus | null>(null);
  const [justDroppedId, setJustDroppedId] = useState<string | null>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });

  const getTasksByStatus = (status: ColumnStatus) => {
    return currentProject?.tasks.filter((t) => t.status === status) || [];
  };

  const handleDragStart = useCallback((task: Task, e: React.DragEvent) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).style.opacity = '0.5';
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    (e.target as HTMLElement).style.opacity = '1';
    setDraggedTask(null);
    setDragOverColumn(null);
  }, []);

  const handleDragOver = useCallback((status: ColumnStatus, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== status) {
      setDragOverColumn(status);
    }
  }, [dragOverColumn]);

  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null);
  }, []);

  const handleDrop = useCallback(async (status: ColumnStatus, e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedTask || draggedTask.status === status) {
      setDraggedTask(null);
      setDragOverColumn(null);
      return;
    }

    const updatedTasks = currentProject?.tasks.map((t) =>
      t.id === draggedTask.id ? { ...t, status } : t
    ) || [];

    updateTaskStatus(draggedTask.id, status);
    setJustDroppedId(draggedTask.id);
    setTimeout(() => setJustDroppedId(null), 400);

    await updateProjectTasks(updatedTasks);
    setDraggedTask(null);
    setDragOverColumn(null);
  }, [draggedTask, currentProject, updateTaskStatus, updateProjectTasks]);

  const getStatusBadgeColor = (status: ColumnStatus) => {
    const column = COLUMNS.find((c) => c.status === status);
    return column?.color || '#888';
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    } catch {
      return dateStr;
    }
  };

  const totalTasks = currentProject?.tasks.length || 0;
  const completedTasks = getTasksByStatus('done').length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  if (!currentProject) {
    return (
      <div className="project-board-empty fade-in-item">
        <div className="empty-project-icon">📊</div>
        <h2>暂无项目</h2>
        <p>请先从创意画布生成创意并转为项目</p>
        <button className="btn btn-gradient-purple" onClick={() => setCurrentView('canvas')}>
          前往创意画布
        </button>
      </div>
    );
  }

  return (
    <div className="project-board fade-in-item">
      <div className="project-header">
        <div className="project-info">
          <button className="back-btn" onClick={() => setCurrentView('canvas')} title="返回画布">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="project-meta">
            <h1 className="project-title">{currentProject.title}</h1>
            <p className="project-summary">{currentProject.summary}</p>
          </div>
        </div>
        <div className="project-stats">
          <div className="progress-section">
            <div className="progress-label">
              <span>项目进度</span>
              <span className="progress-value">{progress}%</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${progress}%`,
                  background: `linear-gradient(90deg, #4facfe 0%, #a855f7 50%, #4ade80 100%)`
                }}
              />
            </div>
          </div>
          <div className="stats-summary">
            <div className="stat-item">
              <span className="stat-value" style={{ color: '#4facfe' }}>{totalTasks}</span>
              <span className="stat-label">总任务</span>
            </div>
            <div className="stat-item">
              <span className="stat-value" style={{ color: '#4ade80' }}>{completedTasks}</span>
              <span className="stat-label">已完成</span>
            </div>
          </div>
        </div>
      </div>

      <div className="kanban-container">
        {COLUMNS.map((column) => (
          <div
            key={column.status}
            className={`kanban-column ${dragOverColumn === column.status ? 'drag-over' : ''}`}
            onDragOver={(e) => handleDragOver(column.status, e)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(column.status, e)}
          >
            <div className="column-header">
              <div className="column-title-wrapper">
                <span className="column-icon">{column.icon}</span>
                <h3 className="column-title">{column.title}</h3>
              </div>
              <span
                className="task-count-badge"
                style={{ background: column.color }}
              >
                {getTasksByStatus(column.status).length}
              </span>
            </div>

            <div className="column-divider" style={{ background: column.color }} />

            <div className="task-list">
              {getTasksByStatus(column.status).length === 0 ? (
                <div className="empty-column-hint">
                  <span>拖拽任务到此处</span>
                </div>
              ) : (
                getTasksByStatus(column.status).map((task, index) => (
                  <div
                    key={task.id}
                    className={`task-card fade-in-item ${justDroppedId === task.id ? 'just-dropped' : ''}`}
                    style={{
                      animationDelay: `${index * 0.1}s`,
                      borderLeft: `4px solid ${GRADIENT_COLORS[task.colorIndex % GRADIENT_COLORS.length][0]}`
                    }}
                    draggable
                    onDragStart={(e) => handleDragStart(task, e)}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="task-name">{task.name}</div>
                    <div className="task-footer">
                      <div className="task-assignee">
                        <span className="assignee-avatar" title={task.assignee}>
                          {task.avatar}
                        </span>
                        <span className="assignee-name">{task.assignee}</span>
                      </div>
                      <div className="task-due">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                          <rect x="3" y="4" width="18" height="18" rx="2" />
                          <path d="M16 2v4M8 2v4M3 10h18" />
                        </svg>
                        {formatDate(task.dueDate)}
                      </div>
                    </div>
                    <div className="card-gradient" style={{
                      background: `linear-gradient(135deg, ${GRADIENT_COLORS[task.colorIndex % GRADIENT_COLORS.length][0]}22 0%, ${GRADIENT_COLORS[task.colorIndex % GRADIENT_COLORS.length][1]}22 100%)`
                    }} />
                  </div>
                ))
              )}
            </div>

            <div className="column-footer">
              <button className="add-task-btn">
                <span>+</span> 添加任务
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProjectBoard;
