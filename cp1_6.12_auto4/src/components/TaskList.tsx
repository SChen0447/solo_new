import { useState, useMemo } from 'react';
import { Search, Filter, Edit2, Trash2, Plus } from 'lucide-react';
import type { Task } from '@/types';
import { COLOR_TAGS } from '@/types';

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
  const [search, setSearch] = useState('');
  const [filterAssignee, setFilterAssignee] = useState<string>('');
  const [filterColor, setFilterColor] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  const assignees = useMemo(() => {
    const set = new Set(tasks.map((t) => t.assignee));
    return Array.from(set);
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterAssignee && t.assignee !== filterAssignee) return false;
      if (filterColor && t.colorTag !== filterColor) return false;
      return true;
    });
  }, [tasks, search, filterAssignee, filterColor]);

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center gap-2">
        <button
          onClick={onAddTask}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-accent-orange text-white rounded-lg text-sm font-medium hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">新建任务</span>
          <span className="sm:hidden">新建</span>
        </button>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`p-2 rounded-lg transition-all duration-200 hover:-translate-y-0.5 ${
            showFilters ? 'bg-accent-blue text-white' : 'bg-primary-light text-white hover:bg-primary-light/80'
          }`}
        >
          <Filter className="w-4 h-4" />
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索任务..."
          className="w-full pl-9 pr-3 py-2 text-sm bg-primary-light text-white placeholder-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-accent-blue transition-all"
        />
      </div>

      {showFilters && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top duration-200">
          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-primary-light text-white rounded-lg outline-none focus:ring-2 focus:ring-accent-blue transition-all"
          >
            <option value="">全部负责人</option>
            {assignees.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setFilterColor('')}
              className={`w-6 h-6 rounded-full border-2 transition-all ${
                filterColor === '' ? 'border-white scale-110' : 'border-transparent'
              }`}
              style={{ background: 'repeating-conic-gradient(#94a3b8 0% 25%, #ffffff 0% 50%) 50% / 6px 6px' }}
              title="全部颜色"
            />
            {COLOR_TAGS.map((color) => (
              <button
                key={color}
                onClick={() => setFilterColor(color)}
                className={`w-6 h-6 rounded-full transition-all ${
                  filterColor === color ? 'ring-2 ring-white ring-offset-1 ring-offset-primary scale-110' : ''
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-2 pr-1 -mr-1">
        {filteredTasks.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-8">暂无任务</div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              onClick={() => onSelectTask(task.id)}
              className={`group relative p-3 rounded-lg cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
                selectedTaskId === task.id
                  ? 'bg-accent-blue/20 ring-2 ring-accent-blue'
                  : 'bg-primary-light hover:bg-primary-light/80'
              }`}
            >
              <div className="flex items-start gap-2">
                <span
                  className="w-3 h-3 rounded-full mt-0.5 flex-shrink-0"
                  style={{ backgroundColor: task.colorTag }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{task.name}</p>
                  <p className="text-xs text-gray-300 mt-0.5">{task.assignee}</p>
                </div>
                <div className="hidden md:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditTask(task);
                    }}
                    className="p-1.5 rounded hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteTask(task.id);
                    }}
                    className="p-1.5 rounded hover:bg-red-500/20 text-gray-300 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>进度</span>
                  <span>{task.progress}%</span>
                </div>
                <div className="h-1.5 bg-primary rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${task.progress}%`,
                      backgroundColor: task.progress >= 100 ? '#2ECC71' : '#E67E22',
                    }}
                  />
                </div>
                <div className="mt-1.5 text-[10px] text-gray-400">
                  {task.startDate} ~ {task.endDate}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
