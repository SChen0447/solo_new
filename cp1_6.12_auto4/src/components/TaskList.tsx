import { useState, useMemo } from 'react';
import type { Task } from '@/types';
import { COLOR_TAGS } from '@/types';
import { Search, Filter, Edit2, Trash2, Plus } from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
  selectedTaskId: string | null;
  onSelectTask: (id: string) => void;
  onAddTask: () => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
}

export default function TaskList({
  tasks,
  selectedTaskId,
  onSelectTask,
  onAddTask,
  onEditTask,
  onDeleteTask,
}: TaskListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [colorFilter, setColorFilter] = useState('');

  const assignees = useMemo(() => {
    const unique = [...new Set(tasks.map((t) => t.assignee))];
    return unique;
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch = task.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesAssignee = !assigneeFilter || task.assignee === assigneeFilter;
      const matchesColor = !colorFilter || task.colorTag === colorFilter;
      return matchesSearch && matchesAssignee && matchesColor;
    });
  }, [tasks, searchQuery, assigneeFilter, colorFilter]);

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold">Tasks</h3>
        <button
          onClick={onAddTask}
          className="bg-accent-orange text-white p-2 rounded-lg hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-primary-light border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-400 focus:ring-2 focus:ring-accent-blue focus:border-transparent outline-none transition-all"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="flex-1 bg-primary-light border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-accent-blue focus:border-transparent outline-none transition-all"
          >
            <option value="">All Assignees</option>
            {assignees.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setColorFilter('')}
            className={`w-6 h-6 rounded-full border-2 transition-all ${
              colorFilter === '' ? 'border-white ring-2 ring-accent-blue' : 'border-gray-600'
            } bg-gradient-to-br from-gray-400 to-gray-600`}
          />
          {COLOR_TAGS.map((color) => (
            <button
              key={color}
              onClick={() => setColorFilter(colorFilter === color ? '' : color)}
              className={`w-6 h-6 rounded-full border-2 transition-all ${
                colorFilter === color ? 'border-white ring-2 ring-accent-blue' : 'border-transparent'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {filteredTasks.map((task) => (
          <div
            key={task.id}
            onClick={() => onSelectTask(task.id)}
            className={`group bg-primary-light rounded-lg p-3 cursor-pointer transition-all duration-200 hover:-translate-y-[2px] hover:shadow-lg ${
              selectedTaskId === task.id ? 'ring-2 ring-accent-blue' : ''
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                style={{ backgroundColor: task.colorTag }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{task.name}</p>
                <p className="text-xs text-gray-400 hidden sm:block">{task.assignee}</p>

                <div className="mt-2 hidden sm:block">
                  <div className="w-full h-1.5 bg-gray-600 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent-orange rounded-full transition-all"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDate(task.startDate)} - {formatDate(task.endDate)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditTask(task);
                  }}
                  className="p-1.5 text-gray-400 hover:text-accent-blue hover:bg-primary rounded transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteTask(task.id);
                  }}
                  className="p-1.5 text-gray-400 hover:text-accent-red hover:bg-primary rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredTasks.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">No tasks found</div>
        )}
      </div>
    </div>
  );
}
