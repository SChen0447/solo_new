import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { useCartStore } from './store/useCartStore';
import BooksPage from './BooksPage';
import BookDetail from './BookDetail';
import OrdersPage from './OrdersPage';
import CartPanel from './CartPanel';
import './App.css';

function Navbar() {
  const cartItems = useCartStore(state => state.items);
  const toggleCart = useCartStore(state => state.toggleCart);

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          <span className="logo-icon">📚</span>
          <span className="logo-text">特装典藏馆</span>
        </Link>
        <div className="nav-actions">
          <Link to="/orders" className="nav-link">
            订单管理
          </Link>
          <button className="cart-toggle-btn" onClick={toggleCart}>
            <span className="cart-icon">🛒</span>
            {cartItems.length > 0 && (
              <span className="cart-badge">{cartItems.length}</span>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <div className="app">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<BooksPage />} />
            <Route path="/book/:id" element={<BookDetail />} />
            <Route path="/orders" element={<OrdersPage />} />
          </Routes>
        </main>
        <CartPanel />
      </div>
    </Router>
  );
}

export default App;
