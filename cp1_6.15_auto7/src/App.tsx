import { useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import BookList from './modules/bookManager/BookList';
import BookDetail from './modules/bookManager/BookDetail';
import BookLending from './modules/borrow/BookLending';
import { useLibraryStore } from './store/useLibraryStore';

function App() {
  const fetchAll = useLibraryStore((state) => state.fetchAll);
  const location = useLocation();

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const navLinks = [
    { to: '/', label: '首页', match: '/' },
    { to: '/books', label: '图书管理', match: '/books' },
    { to: '/lending', label: '借阅记录', match: '/lending' }
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">📚</span>
            <h1>个人藏书管理</h1>
          </div>
          <nav className="nav-menu">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`nav-link ${isActive(link.match) ? 'active' : ''}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/books" element={<BookList />} />
          <Route path="/books/:id" element={<BookDetail />} />
          <Route path="/lending" element={<BookLending />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </main>

      <footer className="app-footer">
        <p>© 2026 个人藏书在线管理系统</p>
      </footer>
    </div>
  );
}

export default App;
