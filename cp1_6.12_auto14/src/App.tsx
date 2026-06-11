import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { RecipeList } from './recipe/RecipeList';
import { RecipeDetail } from './recipe/RecipeDetail';
import { Editor } from './editor/Editor';
import { Recipe } from './types';
import { apiRequest } from './api';

type Page = 'list' | 'detail' | 'editor';

const AppContent: React.FC = () => {
  const { user, login, register, logout, isLoading: authLoading } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>('list');
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ username: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [pageTransition, setPageTransition] = useState(true);

  const fetchRecipes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/recipes');
      setRecipes(data.recipes);
    } catch (e) {
      console.error('Failed to fetch recipes', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  const handleSelectRecipe = useCallback((recipe: Recipe) => {
    setPageTransition(false);
    setTimeout(() => {
      setSelectedRecipe(recipe);
      setCurrentPage('detail');
      setPageTransition(true);
    }, 150);
  }, []);

  const handleBackToList = useCallback(() => {
    setPageTransition(false);
    setTimeout(() => {
      setSelectedRecipe(null);
      setCurrentPage('list');
      setPageTransition(true);
      fetchRecipes();
    }, 150);
  }, [fetchRecipes]);

  const handleEditRecipe = useCallback(() => {
    setPageTransition(false);
    setTimeout(() => {
      setCurrentPage('editor');
      setPageTransition(true);
    }, 150);
  }, []);

  const handleCreateRecipe = useCallback(() => {
    setSelectedRecipe(null);
    setCurrentPage('editor');
  }, []);

  const handleSaveRecipe = useCallback(async (recipeData: Partial<Recipe>) => {
    try {
      if (selectedRecipe) {
        const data = await apiRequest(`/recipes/${selectedRecipe.id}`, {
          method: 'PUT',
          body: JSON.stringify(recipeData),
        });
        setSelectedRecipe(data.recipe);
      } else {
        const data = await apiRequest('/recipes', {
          method: 'POST',
          body: JSON.stringify(recipeData),
        });
        setSelectedRecipe(data.recipe);
      }
      setCurrentPage('detail');
      fetchRecipes();
    } catch (e) {
      alert('保存失败，请重试');
    }
  }, [selectedRecipe, fetchRecipes]);

  const handleToggleFavorite = useCallback(async (recipeId: string) => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    try {
      const data = await apiRequest(`/recipes/${recipeId}/favorite`, {
        method: 'POST',
      });
      setRecipes(prev => prev.map(r => r.id === recipeId ? data.recipe : r));
      if (selectedRecipe?.id === recipeId) {
        setSelectedRecipe(data.recipe);
      }
    } catch (e) {
      console.error('Failed to toggle favorite', e);
    }
  }, [user, selectedRecipe]);

  const handleAddComment = useCallback(async (content: string, parentId?: string, replyTo?: string) => {
    if (!selectedRecipe) return;
    try {
      const data = await apiRequest(`/recipes/${selectedRecipe.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content, parentId, replyTo }),
      });
      const updatedRecipe = {
        ...selectedRecipe,
        comments: [...selectedRecipe.comments, data.comment],
      };
      setSelectedRecipe(updatedRecipe);
      setRecipes(prev => prev.map(r => r.id === selectedRecipe.id ? updatedRecipe : r));
    } catch (e) {
      console.error('Failed to add comment', e);
    }
  }, [selectedRecipe]);

  const handleLikeComment = useCallback(async (commentId: string) => {
    if (!selectedRecipe) return;
    try {
      const data = await apiRequest(`/recipes/${selectedRecipe.id}/comments/${commentId}/like`, {
        method: 'POST',
      });
      const updatedRecipe = {
        ...selectedRecipe,
        comments: selectedRecipe.comments.map(c => c.id === commentId ? data.comment : c),
      };
      setSelectedRecipe(updatedRecipe);
      setRecipes(prev => prev.map(r => r.id === selectedRecipe.id ? updatedRecipe : r));
    } catch (e) {
      console.error('Failed to like comment', e);
    }
  }, [selectedRecipe]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      await login(loginForm.email, loginForm.password);
      setShowLoginModal(false);
      setLoginForm({ email: '', password: '' });
    } catch (err: any) {
      setAuthError(err.message || '登录失败');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      await register(registerForm.username, registerForm.email, registerForm.password);
      setShowRegisterModal(false);
      setRegisterForm({ username: '', email: '', password: '' });
    } catch (err: any) {
      setAuthError(err.message || '注册失败');
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="logo" onClick={handleBackToList}>
            <span className="logo-icon">🍳</span>
            <span className="logo-text">美食协作</span>
          </div>
          <nav className="header-nav">
            <button
              className={`nav-btn ${currentPage === 'list' && !showFavoritesOnly ? 'active' : ''}`}
              onClick={() => { setShowFavoritesOnly(false); handleBackToList(); }}
            >
              食谱
            </button>
            {user && (
              <button
                className={`nav-btn ${showFavoritesOnly ? 'active' : ''}`}
                onClick={() => { setShowFavoritesOnly(true); setCurrentPage('list'); }}
              >
                我的收藏
              </button>
            )}
            {user && (
              <button className="create-btn" onClick={handleCreateRecipe}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                创建食谱
              </button>
            )}
          </nav>
          <div className="header-auth">
            {user ? (
              <div className="user-menu">
                <img src={user.avatar} alt={user.username} className="user-avatar" />
                <span className="user-name">{user.username}</span>
                <button className="logout-btn" onClick={logout}>退出</button>
              </div>
            ) : (
              <div className="auth-buttons">
                <button className="login-btn" onClick={() => { setShowLoginModal(true); setAuthError(''); }}>登录</button>
                <button className="register-btn" onClick={() => { setShowRegisterModal(true); setAuthError(''); }}>注册</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className={`app-main ${pageTransition ? 'fade-in' : 'fade-out'}`}>
        {currentPage === 'list' && (
          <RecipeList
            recipes={recipes}
            loading={loading}
            onSelectRecipe={handleSelectRecipe}
            onToggleFavorite={handleToggleFavorite}
            showFavoritesOnly={showFavoritesOnly}
          />
        )}
        {currentPage === 'detail' && selectedRecipe && (
          <RecipeDetail
            recipe={selectedRecipe}
            loading={false}
            onBack={handleBackToList}
            onEdit={handleEditRecipe}
            onToggleFavorite={() => handleToggleFavorite(selectedRecipe.id)}
            onAddComment={handleAddComment}
            onLikeComment={handleLikeComment}
          />
        )}
        {currentPage === 'editor' && (
          <Editor
            recipe={selectedRecipe || undefined}
            onSave={handleSaveRecipe}
            onCancel={handleBackToList}
            onBack={handleBackToList}
          />
        )}
      </main>

      {showLoginModal && (
        <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowLoginModal(false)}>×</button>
            <h2>欢迎回来</h2>
            <p className="modal-subtitle">登录你的美食账号</p>
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>邮箱</label>
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={e => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="your@email.com"
                  className="form-input"
                  required
                />
              </div>
              <div className="form-group">
                <label>密码</label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={e => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="输入密码"
                  className="form-input"
                  required
                />
              </div>
              {authError && <div className="auth-error">{authError}</div>}
              <button type="submit" className="submit-btn">登录</button>
            </form>
            <div className="modal-footer">
              还没有账号？
              <button className="link-btn" onClick={() => { setShowLoginModal(false); setShowRegisterModal(true); setAuthError(''); }}>
                立即注册
              </button>
            </div>
            <div className="demo-accounts">
              <p className="demo-title">演示账号：</p>
              <div className="demo-item" onClick={() => setLoginForm({ email: 'wang@example.com', password: '123456' })}>
                美食家小王 (wang@example.com / 123456)
              </div>
              <div className="demo-item" onClick={() => setLoginForm({ email: 'li@example.com', password: '123456' })}>
                厨神小李 (li@example.com / 123456)
              </div>
            </div>
          </div>
        </div>
      )}

      {showRegisterModal && (
        <div className="modal-overlay" onClick={() => setShowRegisterModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowRegisterModal(false)}>×</button>
            <h2>加入我们</h2>
            <p className="modal-subtitle">创建你的美食账号</p>
            <form onSubmit={handleRegister}>
              <div className="form-group">
                <label>用户名</label>
                <input
                  type="text"
                  value={registerForm.username}
                  onChange={e => setRegisterForm(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="你的昵称"
                  className="form-input"
                  required
                />
              </div>
              <div className="form-group">
                <label>邮箱</label>
                <input
                  type="email"
                  value={registerForm.email}
                  onChange={e => setRegisterForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="your@email.com"
                  className="form-input"
                  required
                />
              </div>
              <div className="form-group">
                <label>密码</label>
                <input
                  type="password"
                  value={registerForm.password}
                  onChange={e => setRegisterForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="至少6位密码"
                  className="form-input"
                  required
                  minLength={6}
                />
              </div>
              {authError && <div className="auth-error">{authError}</div>}
              <button type="submit" className="submit-btn">注册</button>
            </form>
            <div className="modal-footer">
              已有账号？
              <button className="link-btn" onClick={() => { setShowRegisterModal(false); setShowLoginModal(true); setAuthError(''); }}>
                立即登录
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
