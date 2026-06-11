import { useState, useMemo } from 'react';
import type { Task, TimeEntry } from '@/types';
import { Calendar, Clock, Save } from 'lucide-react';

interface TimeEntryFormProps {
  tasks: Task[];
  timeEntries: TimeEntry[];
  onSubmit: (entries: Partial<TimeEntry>[]) => void;
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export default function TimeEntryForm({ tasks, timeEntries, onSubmit }: TimeEntryFormProps) {
  const [date, setDate] = useState(todayStr());
  const [hoursMap, setHoursMap] = useState<Record<string, number>>(() => buildInitialHours(todayStr()));

  function buildInitialHours(selectedDate: string): Record<string, number> {
    const map: Record<string, number> = {};
    for (const entry of timeEntries) {
      if (entry.date === selectedDate) {
        map[entry.taskId] = entry.hours;
      }
    }
    return map;
  }

  function handleDateChange(newDate: string) {
    setDate(newDate);
    setHoursMap(buildInitialHours(newDate));
  }

  function handleHoursChange(taskId: string, value: string) {
    const num = parseFloat(value);
    setHoursMap((prev) => ({ ...prev, [taskId]: isNaN(num) ? 0 : num }));
  }

  const totalHours = useMemo(
    () => Object.values(hoursMap).reduce((sum, h) => sum + h, 0),
    [hoursMap]
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const entries: Partial<TimeEntry>[] = tasks
      .filter((t) => (hoursMap[t.id] ?? 0) > 0)
      .map((t) => ({
        taskId: t.id,
        date,
        hours: hoursMap[t.id],
        assignee: t.assignee,
      }));
    if (entries.length === 0) return;
    onSubmit(entries);
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-3 mb-6">
          <Calendar className="w-5 h-5 text-gray-500" />
          <input
            type="date"
            value={date}
            onChange={(e) => handleDateChange(e.target.value)}
            className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-accent-blue focus:border-transparent outline-none transition-all"
          />
        </div>

        <div className="space-y-3 mb-6">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="bg-white rounded-lg shadow-sm p-4 flex items-center gap-4"
            >
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: task.colorTag }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{task.name}</p>
                <p className="text-xs text-gray-500">{task.assignee}</p>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={hoursMap[task.id] ?? 0}
                  onChange={(e) => handleHoursChange(task.id, e.target.value)}
                  className="w-20 border rounded-lg px-2 py-1 text-center focus:ring-2 focus:ring-accent-blue focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Total: <span className="font-semibold text-primary">{totalHours.toFixed(1)}h</span>
          </p>
          <button
            type="submit"
            className="bg-accent-orange text-white px-6 py-2 rounded-lg flex items-center gap-2 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200"
          >
            <Save className="w-4 h-4" />
            批量提交
          </button>
        </div>
      </form>
    </div>
  );
}
