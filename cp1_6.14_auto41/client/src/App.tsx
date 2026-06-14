import { Routes, Route, NavLink } from 'react-router-dom';
import PortfolioPage from './PortfolioPage';
import QuoteForm from './QuoteForm';
import OrderList from './OrderList';

const navStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 24,
  background: '#2c3e50',
  padding: '0 32px',
  height: 56,
  color: '#fff',
  fontFamily: 'Inter, system-ui, sans-serif',
};

const linkStyle = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
  color: isActive ? '#3498db' : '#bdc3c7',
  textDecoration: 'none',
  fontSize: 14,
  fontWeight: isActive ? 600 : 400,
  borderBottom: isActive ? '2px solid #3498db' : '2px solid transparent',
  paddingBottom: 2,
  transition: 'color 0.2s, border-color 0.2s',
});

export default function App() {
  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', minHeight: '100vh', background: '#f8f9fa' }}>
      <nav style={navStyle}>
        <span style={{ fontWeight: 700, fontSize: 18, marginRight: 32, letterSpacing: -0.5 }}>
          DesignerHub
        </span>
        <NavLink to="/" style={linkStyle} end>
          作品展示
        </NavLink>
        <NavLink to="/quote" style={linkStyle}>
          委托报价
        </NavLink>
        <NavLink to="/orders" style={linkStyle}>
          订单管理
        </NavLink>
      </nav>
      <Routes>
        <Route path="/" element={<PortfolioPage />} />
        <Route path="/quote" element={<QuoteForm />} />
        <Route path="/orders" element={<OrderList />} />
      </Routes>
    </div>
  );
}
