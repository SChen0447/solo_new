import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Home from './pages/Home';
import AddBook from './pages/AddBook';
import BookDetail from './pages/BookDetail';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 },
};

const pageTransition = {
  duration: 0.3,
  ease: 'easeInOut',
};

export default function App() {
  const location = useLocation();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          background: 'linear-gradient(135deg, #F5F0EB 0%, #EDE5DC 100%)',
          borderBottom: '2px solid #8B5E3C',
          padding: '20px 32px',
          boxShadow: '0 2px 12px rgba(139, 94, 60, 0.15)',
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <NavLink to="/" style={{ textDecoration: 'none', color: '#2C2C2C' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #8B5E3C 0%, #A67850 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                }}
              >
                📚
              </div>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: '#8B5E3C', margin: 0 }}>
                  书途漂流
                </h1>
                <p style={{ fontSize: 12, color: '#6B5B4F', margin: 0 }}>
                  让好书遇见下一个读者
                </p>
              </div>
            </div>
          </NavLink>

          <nav style={{ display: 'flex', gap: 8 }}>
            <NavLink
              to="/"
              end
              style={({ isActive }) => ({
                padding: '10px 20px',
                borderRadius: 10,
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: 14,
                background: isActive ? '#8B5E3C' : 'transparent',
                color: isActive ? '#F5F0EB' : '#8B5E3C',
                transition: 'all 0.3s ease-in-out',
              })}
            >
              🏠 图书广场
            </NavLink>
            <NavLink
              to="/add"
              style={({ isActive }) => ({
                padding: '10px 20px',
                borderRadius: 10,
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: 14,
                background: isActive ? '#8B5E3C' : 'transparent',
                color: isActive ? '#F5F0EB' : '#8B5E3C',
                transition: 'all 0.3s ease-in-out',
              })}
            >
              ➕ 发布图书
            </NavLink>
          </nav>
        </div>
      </header>

      <main style={{ flex: 1, padding: '32px 0', maxWidth: 1280, width: '100%', margin: '0 auto' }}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route
              path="/"
              element={
                <motion.div
                  initial="initial"
                  animate="in"
                  exit="out"
                  variants={pageVariants}
                  transition={pageTransition}
                >
                  <Home />
                </motion.div>
              }
            />
            <Route
              path="/add"
              element={
                <motion.div
                  initial="initial"
                  animate="in"
                  exit="out"
                  variants={pageVariants}
                  transition={pageTransition}
                >
                  <AddBook />
                </motion.div>
              }
            />
            <Route
              path="/book/:id"
              element={
                <motion.div
                  initial="initial"
                  animate="in"
                  exit="out"
                  variants={pageVariants}
                  transition={pageTransition}
                >
                  <BookDetail />
                </motion.div>
              }
            />
          </Routes>
        </AnimatePresence>
      </main>

      <footer
        style={{
          background: '#8B5E3C',
          color: '#F5F0EB',
          padding: '24px 32px',
          textAlign: 'center',
          fontSize: 13,
        }}
      >
        <p style={{ margin: 0 }}>📖 书途漂流 · 让每一本书都有新的旅程</p>
      </footer>
    </div>
  );
}
