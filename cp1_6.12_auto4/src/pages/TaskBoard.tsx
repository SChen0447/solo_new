import { useState, useEffect } from 'react';
import { useAppStore } from '@/store';
import type { Task } from '@/types';
import TaskList from '@/components/TaskList';
import GanttChart from '@/components/GanttChart';
import TaskForm from '@/components/TaskForm';
import { Menu, Plus, X } from 'lucide-react';

export default function TaskBoard() {
  const {
    tasks,
    dependencies,
    zoomLevel,
    selectedTaskId,
    loadTasks,
    loadDependencies,
    setSelectedTaskId,
    addTask,
    editTask,
    removeTask,
  } = useAppStore();

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedDependencyId, setSelectedDependencyId] = useState<string | null>(null);

  useEffect(() => {
    loadTasks();
    loadDependencies();
  }, [loadTasks, loadDependencies]);

  function handleSelectTask(id: string | null) {
    setSelectedTaskId(selectedTaskId === id ? null : id);
  }

  function handleSelectDependency(id: string | null) {
    setSelectedDependencyId(selectedDependencyId === id ? null : id);
  }

  async function handleUpdateTasks(updatedTasks: Task[]) {
    for (const task of updatedTasks) {
      await editTask(task.id, task);
    }
  }

  function handleAddTask() {
    setEditingTask(null);
    setShowTaskForm(true);
  }

  function handleEditTask(task: Task) {
    setEditingTask(task);
    setShowTaskForm(true);
  }

  function handleDeleteTask(id: string) {
    if (confirm('Delete this task?')) {
      removeTask(id);
      if (selectedTaskId === id) {
        setSelectedTaskId(null);
      }
    }
  }

  async function handleSubmitTask(taskData: Partial<Task>) {
    if (editingTask) {
      await editTask(editingTask.id, taskData);
    } else {
      await addTask(taskData);
    }
    setShowTaskForm(false);
    setEditingTask(null);
  }

  function handleUpdateTask(id: string, updates: Partial<Task>) {
    editTask(id, updates);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="h-16 bg-primary border-b border-primary-dark flex items-center px-4 gap-4">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="md:hidden text-white p-2 hover:bg-primary-light rounded-lg transition-colors"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <h1 className="font-display text-xl font-bold text-white">Task Board</h1>
        <div className="flex-1" />
        <button
          onClick={handleAddTask}
          className="bg-accent-orange text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Task</span>
        </button>
      </div>

      <div className="flex md:flex flex-col md:flex-row">
        <aside
          className={`fixed md:relative inset-y-16 left-0 z-40 w-72 md:w-64 shrink-0 bg-primary text-white p-4 flex flex-col gap-4 h-[calc(100vh-64px)] overflow-y-auto transform transition-transform duration-300 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
        >
          <TaskList
            tasks={tasks}
            selectedTaskId={selectedTaskId}
            onSelectTask={handleSelectTask}
            onAddTask={handleAddTask}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
          />
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="flex-1 p-4 overflow-auto min-h-[calc(100vh-64px)]">
          <GanttChart
            tasks={tasks}
            dependencies={dependencies}
            zoomLevel={zoomLevel}
            selectedTaskId={selectedTaskId}
            selectedDependencyId={selectedDependencyId}
            onSelectTask={handleSelectTask}
            onSelectDependency={handleSelectDependency}
            onUpdateTask={handleUpdateTask}
            onUpdateTasks={handleUpdateTasks}
          />
        </main>
      </div>

      {showTaskForm && (
        <TaskForm
          task={editingTask ?? undefined}
          tasks={tasks}
          onSubmit={handleSubmitTask}
          onClose={() => {
            setShowTaskForm(false);
            setEditingTask(null);
          }}
        />
      )}
    </div>
  );
}
