import { useState, useMemo, useEffect } from 'react';
import { Calendar, Clock, Save, CheckCircle, AlertCircle } from 'lucide-react';
import type { Task, TimeEntry } from '@/types';

interface TimeEntryFormProps {
  tasks: Task[];
  timeEntries: TimeEntry[];
  onSubmit: (entries: Partial<TimeEntry>[]) => Promise<{ debounced: boolean; skippedCount: number; message: string }>;
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export default function TimeEntryForm({ tasks, timeEntries, onSubmit }: TimeEntryFormProps) {
  const [date, setDate] = useState(todayStr());
  const [hoursMap, setHoursMap] = useState<Record<string, number>>(() => buildInitialHours(todayStr()));
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'warning'; message: string } | null>(null);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

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
    setHoursMap((prev) => ({ ...prev, [taskId]: isNaN(num) ? 0 : Math.max(0, num) }));
  }

  const totalHours = useMemo(
    () => Object.values(hoursMap).reduce((sum, h) => sum + h, 0),
    [hoursMap]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const entries: Partial<TimeEntry>[] = tasks
      .filter((t) => (hoursMap[t.id] ?? 0) > 0)
      .map((t) => ({
        taskId: t.id,
        date,
        hours: hoursMap[t.id],
        assignee: t.assignee,
      }));
    if (entries.length === 0 || submitting) return;

    setSubmitting(true);
    try {
      const result = await onSubmit(entries);
      setToast({
        type: result.debounced ? 'warning' : 'success',
        message: result.message,
      });
      setHoursMap({});
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg animate-in slide-in-from-right ${
            toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-amber-500 text-white'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            <label className="text-sm font-medium text-gray-700">填报日期:</label>
          </div>
          <input
            type="date"
            value={date}
            onChange={(e) => handleDateChange(e.target.value)}
            className="w-full sm:w-auto border rounded-lg px-3 py-2 focus:ring-2 focus:ring-accent-blue focus:border-transparent outline-none transition-all"
          />
        </div>

        <div className="space-y-2 md:space-y-3 mb-6">
          {tasks.length === 0 ? (
            <div className="text-center py-12 text-gray-400">暂无任务，请先创建任务</div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className="bg-white rounded-lg shadow-sm p-3 md:p-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: task.colorTag }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{task.name}</p>
                    <p className="text-xs text-gray-500">
                      {task.assignee} · 预估 {task.estimatedHours}h · 实际 {task.actualHours}h
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-2">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      min="0"
                      max="24"
                      step="0.5"
                      value={hoursMap[task.id] ?? 0}
                      onChange={(e) => handleHoursChange(task.id, e.target.value)}
                      className="w-20 border rounded-lg px-2 py-1.5 text-center focus:ring-2 focus:ring-accent-blue focus:border-transparent outline-none transition-all"
                      placeholder="0"
                    />
                    <span className="text-xs text-gray-500">小时</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm text-gray-600 text-center sm:text-left">
            今日合计: <span className="font-semibold text-primary text-lg">{totalHours.toFixed(1)}h</span>
          </p>
          <button
            type="submit"
            disabled={submitting || totalHours === 0}
            className="w-full sm:w-auto bg-accent-orange text-white px-6 py-2.5 rounded-lg flex items-center justify-center gap-2 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
          >
            <Save className="w-4 h-4" />
            {submitting ? '提交中...' : '批量提交'}
          </button>
        </div>
      </form>
    </div>
  );
}
