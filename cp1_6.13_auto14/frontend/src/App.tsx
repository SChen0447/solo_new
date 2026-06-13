import { Routes, Route, Link, useLocation } from 'react-router-dom';
import ShopList from './pages/ShopList';
import ShopDetail from './pages/ShopDetail';
import PetProfile from './pages/PetProfile';
import Appointments from './pages/Appointments';
import { useState, useEffect } from 'react';
import { Pet } from './types';
import { fetchPets } from './stores/apiStore';

const Navbar = () => {
  const location = useLocation();
  const navItems = [
    { path: '/', label: '美容店' },
    { path: '/pets', label: '宠物档案' },
    { path: '/appointments', label: '我的预约' },
  ];

  return (
    <nav style={styles.navbar}>
      <div className="container" style={styles.navContainer}>
        <Link to="/" style={styles.logo}>
          🐾 宠物美容
        </Link>
        <div style={styles.navLinks}>
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              style={{
                ...styles.navLink,
                ...(location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path))
                  ? styles.navLinkActive
                  : {}),
              }}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
};

const Footer = () => {
  return (
    <footer style={styles.footer}>
      <div className="container" style={styles.footerContent}>
        <p>© 2024 宠物美容预约平台 · 让毛孩子更美丽</p>
      </div>
    </footer>
  );
};

function App() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPets = async () => {
      try {
        const data = await fetchPets();
        setPets(data);
      } finally {
        setLoading(false);
      }
    };
    loadPets();
  }, []);

  const refreshPets = async () => {
    const data = await fetchPets();
    setPets(data);
  };

  return (
    <>
      <Navbar />
      <main style={styles.main}>
        <div className="container" style={styles.container}>
          <Routes>
            <Route path="/" element={<ShopList />} />
            <Route path="/shop/:id" element={<ShopDetail pets={pets} />} />
            <Route
              path="/pets"
              element={<PetProfile pets={pets} refreshPets={refreshPets} loading={loading} />}
            />
            <Route path="/appointments" element={<Appointments />} />
          </Routes>
        </div>
      </main>
      <Footer />
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  navbar: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FF8C00',
    color: 'white',
    zIndex: 1000,
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  },
  navContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: '60px',
  },
  logo: {
    fontSize: '1.3rem',
    fontWeight: 'bold',
  },
  navLinks: {
    display: 'flex',
    gap: '24px',
  },
  navLink: {
    padding: '6px 12px',
    borderRadius: '6px',
    transition: 'background-color 0.2s',
    fontSize: '0.95rem',
  },
  navLinkActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    fontWeight: '600',
  },
  main: {
    flex: 1,
    marginTop: '60px',
    paddingTop: '24px',
    paddingBottom: '40px',
  },
  container: {
    minHeight: 'calc(100vh - 160px)',
  },
  footer: {
    backgroundColor: '#333',
    color: '#aaa',
    padding: '20px 0',
    marginTop: 'auto',
  },
  footerContent: {
    textAlign: 'center',
    fontSize: '0.85rem',
  },
};

export default App;
