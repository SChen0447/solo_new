import { useState, createContext, useContext, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import Editor from './Editor';
import Dashboard from './Dashboard';
import type { Courseware, CoursewareResults } from './types';

interface AppContextType {
  coursewares: Courseware[];
  setCoursewares: React.Dispatch<React.SetStateAction<Courseware[]>>;
  currentCourseware: Courseware | null;
  setCurrentCourseware: React.Dispatch<React.SetStateAction<Courseware | null>>;
  results: CoursewareResults | null;
  setResults: React.Dispatch<React.SetStateAction<CoursewareResults | null>>;
  loading: boolean;
  error: string | null;
  fetchCoursewares: () => Promise<void>;
  fetchResults: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

function Navbar() {
  const location = useLocation();

  return (
    <nav style={styles.nav}>
      <div style={styles.navBrand}>互动课件平台</div>
      <div style={styles.navLinks}>
        <Link
          to="/edit"
          style={{
            ...styles.navLink,
            ...(location.pathname.startsWith('/edit') ? styles.navLinkActive : {})
          }}
        >
          课件编辑
        </Link>
        <Link
          to="/board"
          style={{
            ...styles.navLink,
            ...(location.pathname.startsWith('/board') ? styles.navLinkActive : {})
          }}
        >
          反馈看板
        </Link>
      </div>
    </nav>
  );
}

function AppContent() {
  const [coursewares, setCoursewares] = useState<Courseware[]>([]);
  const [currentCourseware, setCurrentCourseware] = useState<Courseware | null>(null);
  const [results, setResults] = useState<CoursewareResults | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCoursewares = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/courseware');
      setCoursewares(response.data);
    } catch (err) {
      setError('加载课件列表失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchResults = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`/api/results/${id}`);
      setResults(response.data);
    } catch (err) {
      setError('加载结果失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoursewares();
  }, []);

  return (
    <AppContext.Provider
      value={{
        coursewares,
        setCoursewares,
        currentCourseware,
        setCurrentCourseware,
        results,
        setResults,
        loading,
        error,
        fetchCoursewares,
        fetchResults
      }}
    >
      <div style={styles.app}>
        <Navbar />
        {error && (
          <div style={styles.errorBar}>
            <span style={{ color: '#fff' }}>{error}</span>
          </div>
        )}
        <main style={styles.main}>
          <Routes>
            <Route path="/" element={<Navigate to="/edit" replace />} />
            <Route path="/edit" element={<Editor />} />
            <Route path="/edit/:id" element={<Editor />} />
            <Route path="/board" element={<Dashboard />} />
            <Route path="/board/:id" element={<Dashboard />} />
          </Routes>
        </main>
      </div>
    </AppContext.Provider>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    backgroundColor: '#FAFAFA'
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    height: '56px',
    backgroundColor: '#fff',
    borderBottom: '1px solid #E0E0E0',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  },
  navBrand: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1976D2'
  },
  navLinks: {
    display: 'flex',
    gap: '8px'
  },
  navLink: {
    padding: '8px 16px',
    borderRadius: '8px',
    textDecoration: 'none',
    color: '#666',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.2s ease'
  },
  navLinkActive: {
    backgroundColor: '#E3F2FD',
    color: '#1976D2'
  },
  main: {
    padding: '24px'
  },
  errorBar: {
    backgroundColor: '#FFEBEE',
    padding: '12px 24px',
    textAlign: 'center',
    color: '#fff',
    fontSize: '14px',
    position: 'sticky',
    top: 0,
    zIndex: 100
  }
};

export default App;
