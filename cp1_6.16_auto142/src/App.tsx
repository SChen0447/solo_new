import React, { useState, useEffect, useCallback, useRef } from 'react';
import EcoMap from './components/EcoMap';
import ControlPanel from './components/ControlPanel';
import StatPanel from './components/StatPanel';
import {
  createEcosystem,
  stepEcosystem,
  getStats,
  placeFood,
  introduceSpecies,
  healAnimals,
  triggerManualDisaster,
  resetTerrain,
  type EcosystemState,
  type StatsSnapshot,
  type TerrainType,
  type DietType,
  type DisasterEvent,
} from './simulation/ecosystem';
import { saveScene, loadScenes, type SceneInfo } from './api/sceneApi';

const TERRAIN_OPTIONS: { value: TerrainType; label: string }[] = [
  { value: 'forest', label: '森林' },
  { value: 'grassland', label: '草原' },
  { value: 'desert', label: '沙漠' },
  { value: 'water', label: '水域' },
  { value: 'mountain', label: '山脉' },
];

const App: React.FC = () => {
  const [ecosystem, setEcosystem] = useState<EcosystemState>(() => createEcosystem());
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [stats, setStats] = useState<StatsSnapshot>(() => getStats(createEcosystem()));
  const [statsHistory, setStatsHistory] = useState<StatsSnapshot[]>([]);
  const [disasterMessage, setDisasterMessage] = useState<string | null>(null);
  const [cellSize, setCellSize] = useState(80);
  const [isMobile, setIsMobile] = useState(false);
  const [showSpeciesDialog, setShowSpeciesDialog] = useState(false);
  const [newSpeciesName, setNewSpeciesName] = useState('');
  const [newSpeciesDiet, setNewSpeciesDiet] = useState<DietType>('herbivore');
  const [pendingCell, setPendingCell] = useState<{ x: number; y: number } | null>(null);
  const [showTerrainDialog, setShowTerrainDialog] = useState(false);
  const [selectedTerrain, setSelectedTerrain] = useState<TerrainType>('forest');
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [savedScenes, setSavedScenes] = useState<SceneInfo[]>([]);

  const animationFrameRef = useRef<number>();
  const lastStepTimeRef = useRef<number>(0);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setCellSize(mobile ? 60 : 80);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isPaused) return;

    const simulate = (timestamp: number) => {
      if (timestamp - lastStepTimeRef.current >= 500) {
        const startTime = performance.now();
        const result = stepEcosystem(ecosystem);
        const endTime = performance.now();
        
        if (endTime - startTime > 50) {
          console.warn(`模拟步骤耗时过长: ${(endTime - startTime).toFixed(2)}ms`);
        }

        setEcosystem(result.state);
        
        const newStats = getStats(result.state);
        setStats(newStats);
        setStatsHistory(prev => {
          const updated = [...prev, newStats];
          return updated.slice(-50);
        });

        if (result.disaster) {
          showDisasterAlert(result.disaster);
        }

        lastStepTimeRef.current = timestamp;
      }
      animationFrameRef.current = requestAnimationFrame(simulate);
    };

    animationFrameRef.current = requestAnimationFrame(simulate);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [ecosystem, isPaused]);

  const showDisasterAlert = useCallback((disaster: DisasterEvent) => {
    setDisasterMessage(disaster.message);
    setTimeout(() => setDisasterMessage(null), 2000);
  }, []);

  const handleCellClick = useCallback((x: number, y: number) => {
    if (!selectedTool) return;

    switch (selectedTool) {
      case 'food':
        setEcosystem(prev => placeFood(prev, x, y));
        setSelectedTool(null);
        break;
      case 'species':
        setPendingCell({ x, y });
        setShowSpeciesDialog(true);
        break;
      case 'heal':
        setEcosystem(prev => healAnimals(prev, x, y));
        setSelectedTool(null);
        break;
      case 'disaster':
        const result = triggerManualDisaster(ecosystem);
        setEcosystem(result.state);
        if (result.disaster) {
          showDisasterAlert(result.disaster);
        }
        setSelectedTool(null);
        break;
      case 'terrain':
        setPendingCell({ x, y });
        setShowTerrainDialog(true);
        break;
    }
  }, [selectedTool, ecosystem, showDisasterAlert]);

  const handleSpeciesConfirm = useCallback(() => {
    if (pendingCell && newSpeciesName.trim()) {
      setEcosystem(prev => introduceSpecies(prev, pendingCell.x, pendingCell.y, newSpeciesName.trim(), newSpeciesDiet));
      setShowSpeciesDialog(false);
      setNewSpeciesName('');
      setPendingCell(null);
      setSelectedTool(null);
    }
  }, [pendingCell, newSpeciesName, newSpeciesDiet]);

  const handleTerrainConfirm = useCallback(() => {
    if (pendingCell) {
      setEcosystem(prev => resetTerrain(prev, pendingCell.x, pendingCell.y, selectedTerrain));
      setShowTerrainDialog(false);
      setPendingCell(null);
      setSelectedTool(null);
    }
  }, [pendingCell, selectedTerrain]);

  const handleSave = useCallback(async () => {
    const name = prompt('请输入场景名称:', `场景_${Date.now()}`);
    if (name) {
      try {
        await saveScene(name, ecosystem);
        alert('场景保存成功！');
      } catch (error) {
        alert('保存失败，请重试');
      }
    }
  }, [ecosystem]);

  const handleLoad = useCallback(async () => {
    try {
      const response = await loadScenes();
      setSavedScenes(response.scenes);
      setShowLoadDialog(true);
    } catch (error) {
      alert('加载失败，请重试');
    }
  }, []);

  const handleSceneSelect = useCallback((scene: SceneInfo) => {
    setEcosystem(scene.data);
    setStats(getStats(scene.data));
    setStatsHistory([]);
    setShowLoadDialog(false);
    setSelectedTool(null);
  }, []);

  const handleTogglePause = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

  const dialogOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  };

  const dialogStyle: React.CSSProperties = {
    backgroundColor: '#2D2D2D',
    padding: '24px',
    borderRadius: '8px',
    minWidth: '300px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#1E1E1E',
        color: '#E0E0E0',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <nav
        style={{
          height: '64px',
          backgroundColor: '#37474F',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>
          🌿 生态群落演化模拟器
        </h1>
      </nav>

      <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <ControlPanel
          selectedTool={selectedTool}
          onToolSelect={setSelectedTool}
          onSave={handleSave}
          onLoad={handleLoad}
          isPaused={isPaused}
          onTogglePause={handleTogglePause}
          step={ecosystem.step}
        />

        <div
          style={{
            display: 'flex',
            gap: '16px',
            flex: 1,
            flexDirection: isMobile ? 'column' : 'row',
          }}
        >
          <div
            style={{
              flex: 1,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-start',
              overflow: 'auto',
            }}
          >
            <EcoMap
              state={ecosystem}
              onCellClick={handleCellClick}
              selectedTool={selectedTool}
              cellSize={cellSize}
            />
          </div>

          <div
            style={{
              borderLeft: isMobile ? 'none' : '2px solid #444444',
              borderTop: isMobile ? '2px solid #444444' : 'none',
              paddingTop: isMobile ? '16px' : '0',
            }}
          >
            <StatPanel currentStats={stats} history={statsHistory} />
          </div>
        </div>
      </div>

      {disasterMessage && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(198, 40, 40, 0.95)',
            color: '#FFFFFF',
            padding: '20px 40px',
            borderRadius: '8px',
            fontSize: '24px',
            fontWeight: 'bold',
            zIndex: 1000,
            animation: 'pulse 0.5s ease-in-out infinite alternate',
            boxShadow: '0 4px 20px rgba(198, 40, 40, 0.5)',
          }}
        >
          {disasterMessage}
        </div>
      )}

      {showSpeciesDialog && (
        <div style={dialogOverlayStyle} onClick={() => setShowSpeciesDialog(false)}>
          <div style={dialogStyle} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px 0', color: '#E0E0E0' }}>引入新物种</h3>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', color: '#BDBDBD', fontSize: '14px' }}>
                物种名称
              </label>
              <input
                type="text"
                value={newSpeciesName}
                onChange={e => setNewSpeciesName(e.target.value)}
                placeholder="请输入物种名称"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  backgroundColor: '#1E1E1E',
                  border: '1px solid #444',
                  borderRadius: '4px',
                  color: '#E0E0E0',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#BDBDBD', fontSize: '14px' }}>
                食性
              </label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="diet"
                    checked={newSpeciesDiet === 'herbivore'}
                    onChange={() => setNewSpeciesDiet('herbivore')}
                  />
                  <span style={{ color: '#81C784' }}>🌿 食草</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="diet"
                    checked={newSpeciesDiet === 'carnivore'}
                    onChange={() => setNewSpeciesDiet('carnivore')}
                  />
                  <span style={{ color: '#FF7043' }}>🍖 食肉</span>
                </label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowSpeciesDialog(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#424242',
                  color: '#E0E0E0',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#616161'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#424242'}
              >
                取消
              </button>
              <button
                onClick={handleSpeciesConfirm}
                disabled={!newSpeciesName.trim()}
                style={{
                  padding: '8px 16px',
                  backgroundColor: newSpeciesName.trim() ? '#4CAF50' : '#666',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: newSpeciesName.trim() ? 'pointer' : 'not-allowed',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={e => {
                  if (newSpeciesName.trim()) e.currentTarget.style.backgroundColor = '#66BB6A';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = newSpeciesName.trim() ? '#4CAF50' : '#666';
                }}
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {showTerrainDialog && (
        <div style={dialogOverlayStyle} onClick={() => setShowTerrainDialog(false)}>
          <div style={dialogStyle} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px 0', color: '#E0E0E0' }}>重置地形</h3>
            <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {TERRAIN_OPTIONS.map(option => (
                <label
                  key={option.value}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    backgroundColor: selectedTerrain === option.value ? '#37474F' : '#1E1E1E',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={e => {
                    if (selectedTerrain !== option.value) {
                      e.currentTarget.style.backgroundColor = '#2D2D2D';
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = selectedTerrain === option.value ? '#37474F' : '#1E1E1E';
                  }}
                >
                  <input
                    type="radio"
                    name="terrain"
                    checked={selectedTerrain === option.value}
                    onChange={() => setSelectedTerrain(option.value)}
                  />
                  <span style={{ color: '#E0E0E0' }}>{option.label}</span>
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowTerrainDialog(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#424242',
                  color: '#E0E0E0',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#616161'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#424242'}
              >
                取消
              </button>
              <button
                onClick={handleTerrainConfirm}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#2196F3',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#42A5F5'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#2196F3'}
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {showLoadDialog && (
        <div style={dialogOverlayStyle} onClick={() => setShowLoadDialog(false)}>
          <div style={{ ...dialogStyle, maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px 0', color: '#E0E0E0' }}>加载场景</h3>
            {savedScenes.length === 0 ? (
              <p style={{ color: '#BDBDBD', textAlign: 'center', padding: '20px' }}>暂无保存的场景</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {savedScenes.map(scene => (
                  <div
                    key={scene.id}
                    onClick={() => handleSceneSelect(scene)}
                    style={{
                      padding: '12px',
                      backgroundColor: '#1E1E1E',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#37474F'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#1E1E1E'}
                  >
                    <div style={{ fontWeight: 'bold', color: '#E0E0E0' }}>{scene.name}</div>
                    <div style={{ fontSize: '12px', color: '#757575', marginTop: '4px' }}>
                      {new Date(scene.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowLoadDialog(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#424242',
                  color: '#E0E0E0',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#616161'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#424242'}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          from { transform: translate(-50%, -50%) scale(1); opacity: 0.9; }
          to { transform: translate(-50%, -50%) scale(1.05); opacity: 1; }
        }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
      `}</style>
    </div>
  );
};

export default App;
