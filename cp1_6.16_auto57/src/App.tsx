import { Toaster } from 'react-hot-toast';
import { useDungeonStore } from './store';
import CharacterPanel from './components/CharacterPanel';
import ExplorationControl from './components/ExplorationControl';
import LogList from './components/LogList';
import StatsCharts from './components/StatsCharts';
import { calculateLevel, calculateAttack, calculateDefense, calculateMaxHp, calculateCritRate, sumAttributes, applyLevelBonus } from './dataModels';
import './App.css';

function DungeonStatus() {
  const { baseAttributes, inventory, currentFloor, explorationHistory } = useDungeonStore();

  const level = calculateLevel(Math.min(currentFloor, 20));
  const leveledAttrs = applyLevelBonus(baseAttributes, level);
  const totalAttrs = sumAttributes(leveledAttrs, inventory);

  const attack = calculateAttack(totalAttrs, inventory);
  const defense = calculateDefense(totalAttrs, inventory);
  const maxHp = calculateMaxHp(totalAttrs);
  const critRate = calculateCritRate(totalAttrs);

  const totalDrops = explorationHistory.filter((e) => e.droppedItem).length;
  const totalBattles = explorationHistory.filter((e) => e.encounterType === 'monster').length;

  const stats = [
    { label: '攻击力', value: Math.round(attack), icon: '⚔️' },
    { label: '防御力', value: Math.round(defense), icon: '🛡️' },
    { label: '最大生命', value: Math.round(maxHp), icon: '❤️' },
    { label: '暴击率', value: `${critRate.toFixed(1)}%`, icon: '💥' },
    { label: '战斗次数', value: totalBattles, icon: '👹' },
    { label: '获得装备', value: totalDrops, icon: '🎁' },
  ];

  return (
    <div className="dungeon-status">
      <h3 className="status-title">当前状态</h3>
      <div className="status-grid">
        {stats.map((stat) => (
          <div key={stat.label} className="status-item">
            <span className="status-icon">{stat.icon}</span>
            <div className="status-info">
              <span className="status-label">{stat.label}</span>
              <span className="status-value">{stat.value}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="floor-visual">
        <div className="depth-indicator">
          <span>⬇ 地牢深度</span>
          <span className="depth-value">{Math.min(currentFloor, 20)} / 20 层</span>
        </div>
        <div className="depth-bar">
          {Array.from({ length: 20 }, (_, i) => (
            <div
              key={i}
              className={`depth-segment ${i < currentFloor ? 'explored' : ''} ${i === currentFloor - 1 ? 'current' : ''}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <div className="app-container">
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 2500,
          style: {
            background: 'rgba(0,0,0,0.85)',
            color: '#fff',
            borderRadius: '8px',
          },
        }}
      />

      <header className="app-header">
        <h1>🏰 地牢探索模拟器</h1>
        <p className="app-subtitle">随机地牢 · 装备掉落 · 角色成长</p>
      </header>

      <main className="app-main">
        <section className="left-panel">
          <CharacterPanel />
        </section>

        <section className="center-panel">
          <ExplorationControl />
          <DungeonStatus />
        </section>

        <section className="right-panel">
          <LogList />
        </section>
      </main>

      <footer className="app-footer">
        <StatsCharts />
      </footer>
    </div>
  );
}

export default App;
