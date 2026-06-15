import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  GameState,
  OfflineEarnings,
  ResourceType,
  TICK_RATE,
  INITIAL_RESOURCES,
  BUILDING_TYPES
} from './types';
import {
  loadGame,
  saveGame,
  createInitialState,
  calculateOfflineEarnings,
  tick,
  canAfford,
  deductCost,
  buildBuilding,
  findEmptySpot,
  getBuildingType,
  addResources,
  startUpgrade,
  getUpgradeCost
} from './gameLogic';
import ResourceBar from './components/ResourceBar';
import BuildingPanel from './components/BuildingPanel';
import IslandGrid from './components/IslandGrid';
import OfflineModal from './components/OfflineModal';

interface Particle {
  id: number;
  x: number;
  y: number;
  icon: string;
}

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(() => {
    const saved = loadGame();
    return saved || createInitialState();
  });

  const [showBuildingPanel, setShowBuildingPanel] = useState(false);
  const [insufficientResources, setInsufficientResources] = useState<Set<ResourceType>>(new Set());
  const [offlineEarnings, setOfflineEarnings] = useState<OfflineEarnings | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);

  const lastTickTime = useRef(Date.now());
  const particleIdRef = useRef(0);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const saved = loadGame();
    if (saved) {
      const now = Date.now();
      const offlineSeconds = (now - saved.lastSaveTime) / 1000;

      if (offlineSeconds > 10) {
        const earnings = calculateOfflineEarnings(saved, offlineSeconds);
        if (earnings.earnings.gold > 0 || earnings.earnings.wood > 0 || earnings.earnings.stone > 0) {
          setOfflineEarnings(earnings);
        }
      }
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const deltaTime = (now - lastTickTime.current) / 1000;
      lastTickTime.current = now;

      setGameState(prevState => tick(prevState, deltaTime));
    }, 1000 / TICK_RATE);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveGame(gameState);
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [gameState]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      saveGame(gameState);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [gameState]);

  const triggerInsufficientFlash = useCallback((types: ResourceType[]) => {
    setInsufficientResources(new Set(types));
    setTimeout(() => {
      setInsufficientResources(new Set());
    }, 1500);
  }, []);

  const spawnCoinParticles = useCallback(() => {
    const newParticles: Particle[] = [];
    const particleCount = 30;

    for (let i = 0; i < particleCount; i++) {
      newParticles.push({
        id: particleIdRef.current++,
        x: Math.random() * window.innerWidth,
        y: -50 - Math.random() * 100,
        icon: ['💰', '🪵', '🪨', '✨'][Math.floor(Math.random() * 4)]
      });
    }

    setParticles(prev => [...prev, ...newParticles]);

    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 2000);
  }, []);

  const handleBuild = useCallback((typeId: string) => {
    const buildingType = getBuildingType(typeId);
    if (!buildingType) return;

    setGameState(prevState => {
      if (!canAfford(prevState.resources, buildingType.baseCost)) {
        return prevState;
      }

      const spot = findEmptySpot(prevState.buildings);
      if (!spot) {
        return prevState;
      }

      const newResources = deductCost(prevState.resources, buildingType.baseCost);
      const newBuilding = buildBuilding(typeId, spot.x, spot.y);

      return {
        ...prevState,
        resources: newResources,
        buildings: [...prevState.buildings, newBuilding]
      };
    });

    setShowBuildingPanel(false);
  }, []);

  const handleUpgrade = useCallback((buildingId: string) => {
    setGameState(prevState => {
      const building = prevState.buildings.find(b => b.id === buildingId);
      if (!building || building.isBuilding || building.isUpgrading) {
        return prevState;
      }

      const upgradeCost = getUpgradeCost(building);
      if (!canAfford(prevState.resources, upgradeCost)) {
        return prevState;
      }

      const newResources = deductCost(prevState.resources, upgradeCost);
      const updatedBuildings = prevState.buildings.map(b =>
        b.id === buildingId ? startUpgrade(b) : b
      );

      return {
        ...prevState,
        resources: newResources,
        buildings: updatedBuildings
      };
    });
  }, []);

  const handleCollectOffline = useCallback(() => {
    if (!offlineEarnings) return;

    setGameState(prevState => ({
      ...prevState,
      resources: addResources(prevState.resources, offlineEarnings.earnings)
    }));

    spawnCoinParticles();
    setOfflineEarnings(null);
  }, [offlineEarnings, spawnCoinParticles]);

  const resourceDisplayInfo = {
    gold: { icon: INITIAL_RESOURCES.gold.icon, color: INITIAL_RESOURCES.gold.color },
    wood: { icon: INITIAL_RESOURCES.wood.icon, color: INITIAL_RESOURCES.wood.color },
    stone: { icon: INITIAL_RESOURCES.stone.icon, color: INITIAL_RESOURCES.stone.color }
  };

  const activeBuildings = gameState.buildings.filter(b => !b.isBuilding).length;
  const totalProduction = Object.values(gameState.resources).reduce((sum, r) => sum + r.perSecond, 0);

  return (
    <div className="app-wrapper">
      {particles.length > 0 && (
        <div className="particle-container">
          {particles.map(particle => (
            <div
              key={particle.id}
              className="coin-particle"
              style={{
                left: particle.x,
                top: particle.y,
                animationDelay: `${Math.random() * 0.5}s`
              }}
            >
              {particle.icon}
            </div>
          ))}
        </div>
      )}

      {offlineEarnings && (
        <OfflineModal
          earnings={offlineEarnings}
          onCollect={handleCollectOffline}
          resources={resourceDisplayInfo}
        />
      )}

      <button
        className="building-toggle-btn"
        onClick={() => setShowBuildingPanel(!showBuildingPanel)}
      >
        {showBuildingPanel ? '◀' : '▶'}
      </button>

      <BuildingPanel
        isOpen={showBuildingPanel}
        resources={gameState.resources}
        onBuild={handleBuild}
        onInsufficient={triggerInsufficientFlash}
        onClose={() => setShowBuildingPanel(false)}
      />

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <ResourceBar
          resources={gameState.resources}
          insufficientResources={insufficientResources}
        />
      </div>

      <div className="main-content">
        <div className="game-area">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              width: '100%',
              maxWidth: '800px',
              marginBottom: '16px',
              padding: '0 20px'
            }}
          >
            <div
              style={{
                fontSize: '14px',
                color: '#5C4033',
                fontWeight: 'bold'
              }}
            >
              🏝️ 像素小岛
            </div>
            <div
              style={{
                display: 'flex',
                gap: '20px',
                fontSize: '12px',
                color: '#6B4423'
              }}
            >
              <span>建筑: {activeBuildings}/{BUILDING_TYPES.length}</span>
              <span>总产量: {totalProduction.toFixed(1)}/秒</span>
            </div>
          </div>

          <IslandGrid
            buildings={gameState.buildings}
            resources={gameState.resources}
            onUpgrade={handleUpgrade}
            onInsufficient={triggerInsufficientFlash}
            highlightEmpty={gameState.buildings.length === 0}
          />
        </div>
      </div>
    </div>
  );
};

export default App;
