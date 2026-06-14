import { Routes, Route, Navigate } from 'react-router-dom';
import { InstrumentProvider } from './modules/instrument/InstrumentContext';
import { TradeProvider } from './modules/trade/TradeContext';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import InstrumentDetailPage from './pages/InstrumentDetailPage';
import TradeMarketPage from './pages/TradeMarketPage';
import UserProfilePage from './pages/UserProfilePage';
import AddInstrumentPage from './pages/AddInstrumentPage';

export default function App() {
  return (
    <InstrumentProvider>
      <TradeProvider>
        <div className="app-container">
          <Header />
          <main className="app-main">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/instruments/:id" element={<InstrumentDetailPage />} />
              <Route path="/add" element={<AddInstrumentPage />} />
              <Route path="/market" element={<TradeMarketPage />} />
              <Route path="/profile/:id" element={<UserProfilePage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </TradeProvider>
    </InstrumentProvider>
  );
}
