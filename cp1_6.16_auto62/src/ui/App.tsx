import { useState, useEffect, useCallback } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { useDataStore } from '../game/dataStore';
import { runSimulation } from '../game/simulationEngine';
import ConfigPanel from './ConfigPanel';
import StatsPanel from './StatsPanel';
import type { Character } from '../game/types';

export default function App() {
  const {
    selectedCharacters,
    enemyGroups,
    isSimulating,
    simulationProgress,
    battleStatistics,
    setBattleStatistics,
    setIsSimulating,
    setSimulationProgress,
  } = useDataStore();

  const [leftPanelOpen, setLeftPanelOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1280);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const validCharacters = selectedCharacters.filter(
    (c): c is Character => c !== undefined && c !== null
  );

  const handleStartSimulation = useCallback(async () => {
    if (validCharacters.length === 0) {
      toast.error('请至少选择一个角色');
      return;
    }

    if (validCharacters.length > 4) {
      toast.error('最多选择4个角色');
      return;
    }

    setIsSimulating(true);
    setSimulationProgress(0);

    try {
      const startTime = Date.now();
      const result = await runSimulation(
        validCharacters,
        enemyGroups,
        (progress) => {
          setSimulationProgress(progress);
        }
      );
      const endTime = Date.now();
      
      setBattleStatistics(result);
      
      toast.success(
        `模拟完成！总胜率: ${result.winRate}% (${(endTime - startTime) / 1000}s)`
      );
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '模拟失败';
        toast.error(errorMessage);
    } finally {
      setIsSimulating(false);
    }
  }, [validCharacters, enemyGroups, setBattleStatistics, setIsSimulating, setSimulationProgress]);

  const getProgressColor = () => {
    const ratio = simulationProgress / 100;
    const r = Math.round(233 - ratio * 233);
    const g = Math.round(69 + ratio * 186);
    const b = Math.round(96 + ratio * 27);
    return `rgb(${r}, ${g}, ${b})`;
  };

  return (
    <div className="app-container">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#16213e',
            color: '#fff',
            border: '1px solid #0f3460',
          },
          success: {
            iconTheme: {
              primary: '#00FF7F',
              secondary: '#16213e',
            },
          },
          error: {
            iconTheme: {
              primary: '#e94560',
              secondary: '#16213e',
            },
          },
        }}
      />

      {isMobile && (
        <>
          <button
            className="hamburger left"
            onClick={() => setLeftPanelOpen(true)}
          >
            ☰
          </button>
          <button
            className="hamburger right"
            onClick={() => setRightPanelOpen(true)}
          >
            ☰
          </button>
          {(leftPanelOpen || rightPanelOpen) && (
            <div
              className="drawer-overlay"
              onClick={() => {
                setLeftPanelOpen(false);
                setRightPanelOpen(false);
              }}
            />
          )}
        </>
      )}

      <div className={`left-panel ${isMobile && leftPanelOpen ? 'open' : ''}`}>
        <ConfigPanel />
      </div>

      <div className="center-panel">
        <h2 className="panel-title">⚔️ 战斗控制台</h2>
        <div className="console-container">
          <button
            className="start-button"
            onClick={handleStartSimulation}
            disabled={isSimulating || validCharacters.length === 0}
          >
            {isSimulating ? '⏳' : '▶️'}
          </button>

          <div className="progress-container">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${simulationProgress}%`,
                  backgroundColor: getProgressColor(),
                }}
              />
            </div>
            <div className="progress-text">
              {simulationProgress}% 完成
            </div>
          </div>
        </div>

        <div className="enemy-groups">
          <h3 className="panel-title" style={{ marginBottom: '8px' }}>
            🎯 敌人组合
          </h3>
          {enemyGroups.map((group) => (
            <div key={group.id} className="enemy-group-card">
              <div className="enemy-group-title">{group.name}</div>
              <div className="enemy-list">
                {group.enemies.map((enemy) => (
                  <div key={enemy.id} className="enemy-unit">
                    <div className="enemy-emoji">{enemy.emoji}</div>
                    <div className="enemy-name">{enemy.name}</div>
                    <div className="enemy-stats">
                      ❤️{enemy.hp} ⚔️{enemy.attack}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={`right-panel ${isMobile && rightPanelOpen ? 'open' : ''}`}>
        <h2 className="panel-title">📊 战斗统计</h2>
        <StatsPanel statistics={battleStatistics} />
      </div>
    </div>
  );
}
