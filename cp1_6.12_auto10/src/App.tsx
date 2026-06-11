import { useState, useCallback, useEffect } from 'react';
import ExerciseList from './components/ExerciseList';
import ExerciseEditor from './components/ExerciseEditor';
import ExercisePlayer from './components/ExercisePlayer';
import Dashboard from './components/Dashboard';
import type { Exercise } from './types';
import './styles/app.css';

type PageName = 'list' | 'editor' | 'player' | 'dashboard';

export default function App() {
  const [page, setPage] = useState<PageName>('list');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(
    null
  );
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
  const [animating, setAnimating] = useState(false);

  const navigate = useCallback((next: PageName) => {
    setAnimating(true);
    window.setTimeout(() => {
      setPage(next);
      setAnimating(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 180);
  }, []);

  const handleCreate = useCallback(() => {
    setSelectedExercise(null);
    setEditorMode('create');
    navigate('editor');
  }, [navigate]);

  const handleEdit = useCallback(
    (ex: Exercise) => {
      setSelectedExercise(ex);
      setEditorMode('edit');
      navigate('editor');
    },
    [navigate]
  );

  const handlePlay = useCallback(
    (ex: Exercise) => {
      setSelectedExercise(ex);
      navigate('player');
    },
    [navigate]
  );

  const handleBackToList = useCallback(() => {
    setSelectedExercise(null);
    navigate('list');
  }, [navigate]);

  const handleEditorSaved = useCallback(() => {
    navigate('list');
  }, [navigate]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (page === 'editor' || page === 'player') {
          handleBackToList();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [page, handleBackToList]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-inner">
          <div
            className="app-title"
            onClick={() => navigate('list')}
            style={{ cursor: 'pointer' }}
          >
            <span className="app-logo">练</span>
            <span>在线练习本</span>
          </div>
          <nav className="app-nav">
            <button
              className={`nav-btn ${page === 'list' ? 'active' : ''}`}
              onClick={() => navigate('list')}
            >
              练习列表
            </button>
            <button
              className={`nav-btn ${page === 'dashboard' ? 'active' : ''}`}
              onClick={() => navigate('dashboard')}
            >
              统计看板
            </button>
            {page === 'list' && (
              <button
                className="nav-btn"
                style={{ background: '#ff6d00', color: '#fff' }}
                onClick={handleCreate}
              >
                + 创建练习
              </button>
            )}
          </nav>
        </div>
      </header>

      <main className={`container page-content ${animating ? 'fade-out' : 'fade-in'}`}>
        {page === 'list' && (
          <ExerciseList
            key="list"
            onEdit={handleEdit}
            onPlay={handlePlay}
            onGoDashboard={() => navigate('dashboard')}
          />
        )}
        {page === 'editor' && (
          <ExerciseEditor
            key="editor"
            mode={editorMode}
            exercise={selectedExercise}
            onCancel={handleBackToList}
            onSaved={handleEditorSaved}
          />
        )}
        {page === 'player' && selectedExercise && (
          <ExercisePlayer
            key="player"
            exercise={selectedExercise}
            onBack={handleBackToList}
            onEdit={() => handleEdit(selectedExercise)}
          />
        )}
        {page === 'dashboard' && (
          <Dashboard key="dashboard" onBack={() => navigate('list')} />
        )}
      </main>
    </div>
  );
}
