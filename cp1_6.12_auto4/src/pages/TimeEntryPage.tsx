import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store';
import type { TimeEntry } from '@/types';
import TimeEntryForm from '@/components/TimeEntryForm';
import { ArrowLeft, CheckCircle } from 'lucide-react';

export default function TimeEntryPage() {
  const navigate = useNavigate();
  const { tasks, timeEntries, submitTimeEntries, loadTasks, loadTimeEntries } = useAppStore();
  const [showToast, setShowToast] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      await Promise.all([loadTasks(), loadTimeEntries()]);
      setLoading(false);
    }
    loadData();
  }, [loadTasks, loadTimeEntries]);

  async function handleSubmit(entries: Partial<TimeEntry>[]) {
    await submitTimeEntries(entries);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="h-16 bg-primary border-b border-primary-dark flex items-center px-4 sm:px-6 gap-4">
        <button
          onClick={() => navigate(-1)}
          className="text-white p-2 hover:bg-primary-light rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-display text-xl font-bold text-white">Time Entry</h1>
      </div>

      <div className="p-4 sm:p-6 lg:p-8">
        <TimeEntryForm
          tasks={tasks}
          timeEntries={timeEntries}
          onSubmit={handleSubmit}
        />
      </div>

      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-accent-green text-white px-4 py-3 rounded-lg shadow-lg animate-slide-up">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">Time entries submitted successfully!</span>
        </div>
      )}
    </div>
  );
}
