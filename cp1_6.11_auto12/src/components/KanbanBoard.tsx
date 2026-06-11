import React, { useMemo, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';
import { Task, TaskStatus } from '../utils/taskData';
import { useTaskContext } from '../App';

const columns: { id: TaskStatus; title: string; className: string }[] = [
  { id: 'todo', title: '待办', className: 'todo' },
  { id: 'in-progress', title: '进行中', className: 'in-progress' },
  { id: 'done', title: '完成', className: 'done' },
];

interface SortableTaskCardProps {
  task: Task;
}

const SortableTaskCard: React.FC<SortableTaskCardProps> = React.memo(React.forwardRef(({ task }, ref) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priorityLabels: Record<string, string> = { high: '高', medium: '中', low: '低' };

  const mergedRef = useCallback((node: HTMLDivElement | null) => {
    setNodeRef(node);
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
    }
  }, [setNodeRef, ref]);

  return (
    <motion.div
      ref={mergedRef}
      style={style}
      className={`task-card ${isDragging ? 'dragging' : ''}`}
      {...attributes}
      {...listeners}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <div className="task-card-title">{task.title}</div>
      <div className="task-deadline">
        <span>📅</span>
        <span>{task.endDate}</span>
      </div>
      <div className="task-card-footer">
        <div className="task-assignee">
          <div className="avatar">{task.assignee.charAt(0)}</div>
          <span className="assignee-name">{task.assignee}</span>
        </div>
        <span className={`priority-tag priority-${task.priority}`}>
          {priorityLabels[task.priority]}
        </span>
      </div>
    </motion.div>
  );
}));

SortableTaskCard.displayName = 'SortableTaskCard';

interface KanbanColumnProps {
  status: TaskStatus;
  title: string;
  tasks: Task[];
  className: string;
}

const KanbanColumn: React.FC<KanbanColumnProps> = React.memo(({ status, title, tasks, className }) => {
  return (
    <motion.div
      className={`kanban-column ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: ['todo', 'in-progress', 'done'].indexOf(status) * 0.1 }}
    >
      <div className="column-header">
        <span className="column-title">{title}</span>
        <span className="column-count">{tasks.length}</span>
      </div>
      <div className="column-content" data-status={status}>
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <AnimatePresence mode="popLayout">
            {tasks.map(task => (
              <SortableTaskCard key={task.id} task={task} />
            ))}
          </AnimatePresence>
        </SortableContext>
      </div>
    </motion.div>
  );
});

KanbanColumn.displayName = 'KanbanColumn';

const KanbanBoard: React.FC = () => {
  const { state, updateTask, filteredTasks: tasks } = useTaskContext();
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      'todo': [],
      'in-progress': [],
      'done': [],
    };
    tasks.forEach(task => {
      grouped[task.status].push(task);
    });
    return grouped;
  }, [tasks]);

  const activeTask = useMemo(() => {
    return tasks.find(t => t.id === activeId) || null;
  }, [activeId, tasks]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeTaskData = tasks.find(t => t.id === active.id);
    const overTask = tasks.find(t => t.id === over.id);

    if (!activeTaskData) return;

    if (overTask) {
      const overStatus = overTask.status;

      if (activeTaskData.status !== overStatus) {
        updateTask(active.id as string, { status: overStatus });
      } else {
        const statusTasks = tasksByStatus[activeTaskData.status];
        const oldIndex = statusTasks.findIndex(t => t.id === active.id);
        const newIndex = statusTasks.findIndex(t => t.id === over.id);
        if (oldIndex !== newIndex) {
          arrayMove(statusTasks, oldIndex, newIndex);
        }
      }
    }
  };

  const handleDragOver = (event: any) => {
    const { active } = event;
    if (!active) return;

    const activeTaskData = tasks.find(t => t.id === active.id);
    if (!activeTaskData) return;

    const overElement = document.elementFromPoint(
      event.activatorEvent?.clientX || 0,
      event.activatorEvent?.clientY || 0
    );
    const columnElement = overElement?.closest('.column-content');
    if (columnElement) {
      const status = columnElement.getAttribute('data-status') as TaskStatus;
      if (status && status !== activeTaskData.status) {
        updateTask(active.id as string, { status });
      }
    }
  };

  const priorityLabels: Record<string, string> = { high: '高', medium: '中', low: '低' };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
    >
      <div className="kanban-board">
        {columns.map(col => (
          <KanbanColumn
            key={col.id}
            status={col.id}
            title={col.title}
            tasks={tasksByStatus[col.id]}
            className={col.className}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? (
          <div className="task-card dragging" style={{ width: '280px' }}>
            <div className="task-card-title">{activeTask.title}</div>
            <div className="task-deadline">
              <span>📅</span>
              <span>{activeTask.endDate}</span>
            </div>
            <div className="task-card-footer">
              <div className="task-assignee">
                <div className="avatar">{activeTask.assignee.charAt(0)}</div>
                <span className="assignee-name">{activeTask.assignee}</span>
              </div>
              <span className={`priority-tag priority-${activeTask.priority}`}>
                {priorityLabels[activeTask.priority]}
              </span>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default React.memo(KanbanBoard);
