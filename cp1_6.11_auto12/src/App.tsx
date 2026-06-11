import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Task, Sprint, initialTasks, sprint as initialSprint } from './utils/taskData';
import KanbanBoard from './components/KanbanBoard';
import GanttChart from './components/GanttChart';
import './styles/main.css';

type ViewMode = 'kanban' | 'gantt';

interface AppState {
  tasks: Task[];
  sprint: Sprint;
  viewMode: ViewMode;
  searchQuery: string;
}

type Action =
  | { type: 'UPDATE_TASK'; payload: { taskId: string; updates: Partial<Task> } }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'SET_VIEW_MODE'; payload: ViewMode }
  | { type: 'SET_SEARCH_QUERY'; payload: string };

const initialState: AppState = {
  tasks: initialTasks,
  sprint: initialSprint,
  viewMode: 'kanban',
  searchQuery: '',
};

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'UPDATE_TASK':
      return {
        ...state,
        tasks: state.tasks.map(task =>
          task.id === action.payload.taskId
            ? { ...task, ...action.payload.updates }
            : task
        ),
      };
    case 'ADD_TASK':
      return {
        ...state,
        tasks: [...state.tasks, action.payload],
      };
    case 'SET_VIEW_MODE':
      return {
        ...state,
        viewMode: action.payload,
      };
    case 'SET_SEARCH_QUERY':
      return {
        ...state,
        searchQuery: action.payload,
      };
    default:
      return state;
  }
}

interface TaskContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  addTask: () => void;
  filteredTasks: Task[];
}

const TaskContext = createContext<TaskContextType | null>(null);

export const useTaskContext = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTaskContext must be used within TaskProvider');
  }
  return context;
};

const App: React.FC = () => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const updateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    dispatch({ type: 'UPDATE_TASK', payload: { taskId, updates } });
  }, []);

  const addTask = useCallback(() => {
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: '新任务',
      assignee: '张三',
      status: 'todo',
      priority: 'medium',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      dependencies: [],
      description: '',
    };
    dispatch({ type: 'ADD_TASK', payload: newTask });
  }, []);

  const filteredTasks = useMemo(() => {
    if (!state.searchQuery.trim()) return state.tasks;
    const query = state.searchQuery.toLowerCase();
    return state.tasks.filter(
      task =>
        task.title.toLowerCase().includes(query) ||
        task.assignee.toLowerCase().includes(query)
    );
  }, [state.tasks, state.searchQuery]);

  const handleModeChange = useCallback((mode: ViewMode) => {
    dispatch({ type: 'SET_VIEW_MODE', payload: mode });
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: e.target.value });
  }, []);

  const contextValue = useMemo(
    () => ({
      state,
      dispatch,
      updateTask,
      addTask,
      filteredTasks,
    }),
    [state, updateTask, addTask, filteredTasks]
  );

  return (
    <TaskContext.Provider value={contextValue}>
      <div className="app">
        <header className="toolbar">
          <div className="toolbar-left">
            <h1 className="toolbar-title">SprintBoard</h1>
            <div className="mode-switch">
              <button
                className={`mode-btn ${state.viewMode === 'kanban' ? 'active' : ''}`}
                onClick={() => handleModeChange('kanban')}
              >
                看板视图
              </button>
              <button
                className={`mode-btn ${state.viewMode === 'gantt' ? 'active' : ''}`}
                onClick={() => handleModeChange('gantt')}
              >
                甘特图
              </button>
            </div>
          </div>
          <div className="toolbar-right">
            <input
              type="text"
              className="search-box"
              placeholder="搜索任务或负责人..."
              value={state.searchQuery}
              onChange={handleSearchChange}
            />
            <button className="add-btn" onClick={addTask}>
              + 添加任务
            </button>
          </div>
        </header>

        <main className="main-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={state.viewMode}
              className="view-container"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              {state.viewMode === 'kanban' ? <KanbanBoard /> : <GanttChart />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </TaskContext.Provider>
  );
};

export default App;
