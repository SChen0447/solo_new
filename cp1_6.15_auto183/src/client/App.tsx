import { Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import Leaderboard from './components/Leaderboard';
import HomePage from './pages/HomePage';
import ShopPage from './pages/ShopPage';
import ProfilePage from './pages/ProfilePage';
import { useThemeStore } from './store/themeStore';
import { useChallengeStore } from './store/challengeStore';
import { useRewardStore } from './store/rewardStore';
import './App.css';

export default function App() {
  const { theme } = useThemeStore();
  const { fetchLeaderboard, currentUser } = useChallengeStore();
  const { fetchExchangeRecords } = useRewardStore();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    fetchLeaderboard();
    fetchExchangeRecords(currentUser.id);
  }, [fetchLeaderboard, fetchExchangeRecords, currentUser.id]);

  return (
    <div className={`app-root theme-${theme}`}>
      <Header />
      <div className="app-body">
        <aside className="sidebar">
          <Leaderboard />
        </aside>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
          <Footer />
        </main>
      </div>
    </div>
  );
}
