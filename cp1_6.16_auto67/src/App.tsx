import { useState, useEffect } from 'react';
import { useGameStore } from './store/gameStore';
import { MapView } from './components/MapView';
import { PetWarehouse } from './components/PetWarehouse';
import { BattleArena } from './components/BattleArena';
import type { PageType } from './modules/battle/PokemonData';

function App() {
  const { currentPage, setCurrentPage } = useGameStore();
  const [pageKey, setPageKey] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const navItems: Array<{ key: PageType; label: string; icon: string }> = [
    { key: 'map', label: '探索', icon: '🗺️' },
    { key: 'warehouse', label: '仓库', icon: '🏠' },
    { key: 'battle', label: '战斗', icon: '⚔️' },
  ];

  const handleNavClick = (page: PageType) => {
    if (page === currentPage) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentPage(page);
      setPageKey((k) => k + 1);
      setIsTransitioning(false);
    }, 150);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'map':
        return <MapView />;
      case 'warehouse':
        return <PetWarehouse />;
      case 'battle':
        return <BattleArena />;
      default:
        return <MapView />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <div
        key={pageKey}
        className="page-container"
        style={{
          opacity: isTransitioning ? 0 : 1,
          transform: isTransitioning ? 'translateY(10px)' : 'translateY(0)',
          transition: 'all 0.3s ease-out',
        }}
      >
        {renderPage()}
      </div>

      <nav className="navbar">
        {navItems.map((item) => (
          <div
            key={item.key}
            className={`nav-item ${currentPage === item.key ? 'active' : ''}`}
            onClick={() => handleNavClick(item.key)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </div>
        ))}
      </nav>
    </div>
  );
}

export default App;
