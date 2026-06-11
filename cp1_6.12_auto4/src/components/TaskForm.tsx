import { useState, useEffect } from 'react';
import type { Task } from '@/types';
import { COLOR_TAGS } from '@/types';

interface TaskFormProps {
  task?: Task;
  tasks: Task[];
  onSubmit: (task: Partial<Task>) => void;
  onClose: () => void;
}

interface FormErrors {
  name?: string;
  startDate?: string;
  endDate?: string;
  estimatedHours?: string;
  assignee?: string;
}

export default function TaskForm({ task, tasks, onSubmit, onClose }: TaskFormProps) {
  const [name, setName] = useState(task?.name ?? '');
  const [startDate, setStartDate] = useState(task?.startDate ?? '');
  const [endDate, setEndDate] = useState(task?.endDate ?? '');
  const [estimatedHours, setEstimatedHours] = useState(task?.estimatedHours?.toString() ?? '');
  const [assignee, setAssignee] = useState(task?.assignee ?? '');
  const [colorTag, setColorTag] = useState(task?.colorTag ?? COLOR_TAGS[0]);
  const [dependencies, setDependencies] = useState<string[]>(task?.dependencies ?? []);
  const [errors, setErrors] = useState<FormErrors>({});
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const availableTasks = tasks.filter((t) => t.id !== task?.id);

  function validate(): boolean {
    const e: FormErrors = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!startDate) e.startDate = 'Start date is required';
    if (!endDate) e.endDate = 'End date is required';
    else if (startDate && endDate < startDate) e.endDate = 'End date must be on or after start date';
    if (!estimatedHours || Number(estimatedHours) <= 0) e.estimatedHours = 'Hours must be greater than 0';
    if (!assignee.trim()) e.assignee = 'Assignee is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      ...(task ? { id: task.id } : {}),
      name: name.trim(),
      startDate,
      endDate,
      estimatedHours: Number(estimatedHours),
      assignee: assignee.trim(),
      colorTag,
      dependencies,
    });
  }

  function toggleDependency(id: string) {
    setDependencies((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  }

  const inputCls =
    'w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-accent-blue focus:border-transparent outline-none transition-all';

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
        style={{
          transform: visible ? 'scale(1)' : 'scale(0.95)',
          opacity: visible ? 1 : 0,
          transition: 'all 200ms ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-xl font-semibold text-primary mb-4">
          {task ? 'Edit Task' : 'Create Task'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputCls}
            />
            {errors.startDate && <p className="text-xs text-red-500 mt-1">{errors.startDate}</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={inputCls}
            />
            {errors.endDate && <p className="text-xs text-red-500 mt-1">{errors.endDate}</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Estimated Hours</label>
            <input
              type="number"
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(e.target.value)}
              className={inputCls}
            />
            {errors.estimatedHours && (
              <p className="text-xs text-red-500 mt-1">{errors.estimatedHours}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Assignee</label>
            <input
              type="text"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className={inputCls}
            />
            {errors.assignee && <p className="text-xs text-red-500 mt-1">{errors.assignee}</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Color Tag</label>
            <div className="flex gap-2 mt-1">
              {COLOR_TAGS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setColorTag(color)}
                  className={`w-8 h-8 rounded-full cursor-pointer border-2 border-transparent transition-all ${
                    colorTag === color ? 'ring-2 ring-offset-2 ring-primary' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {availableTasks.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700">Dependencies</label>
              <div className="mt-1 space-y-1 max-h-32 overflow-y-auto">
                {availableTasks.map((t) => (
                  <label key={t.id} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dependencies.includes(t.id)}
                      onChange={() => toggleDependency(t.id)}
                      className="accent-accent-blue"
                    />
                    {t.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="bg-accent-blue text-white px-4 py-2 rounded-lg hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200"
            >
              {task ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
