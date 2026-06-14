import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useRecipeStore } from './store';
import RecipeList from './RecipeList';
import RecipeForm from './RecipeForm';
import RecipeDetail from './RecipeDetail';

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const fetchAllData = useRecipeStore((s) => s.fetchAllData);
  const error = useRecipeStore((s) => s.error);
  const [displayError, setDisplayError] = useState<string | null>(null);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    if (error) {
      setDisplayError(error);
      const timer = setTimeout(() => setDisplayError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const isDetailPage = location.pathname.startsWith('/recipe/') && !location.pathname.includes('/edit');
  const isFormPage = location.pathname.includes('/new') || location.pathname.includes('/edit');

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <Link to="/" className="logo-link">
            <span className="logo-icon">🧁</span>
            <h1 className="app-title">烘焙食谱管理</h1>
          </Link>
          <div className="header-actions">
            {!isFormPage && (
              <button
                className="btn btn-primary ripple"
                onClick={() => navigate('/new')}
              >
                <span>＋</span> 新建食谱
              </button>
            )}
            {isDetailPage && (
              <button
                className="btn btn-secondary ripple"
                onClick={() => navigate('/')}
              >
                ← 返回列表
              </button>
            )}
          </div>
        </div>
      </header>

      {displayError && (
        <div className="error-toast">
          <span>⚠️</span> {displayError}
        </div>
      )}

      <main className="app-main">
        <div className="page-transition-wrapper" key={location.pathname}>
          <Routes>
            <Route path="/" element={<RecipeList />} />
            <Route path="/new" element={<RecipeForm />} />
            <Route path="/recipe/:id" element={<RecipeDetail />} />
            <Route path="/recipe/:id/edit" element={<RecipeForm />} />
          </Routes>
        </div>
      </main>

      <footer className="app-footer">
        <p>🍰 用心烘焙，享受生活 🍪</p>
      </footer>
    </div>
  );
}

export default App;
