import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from './store';
import { DeckBuilder } from './components/DeckBuilder';
import { BattleReport } from './components/BattleReport';
import { OpponentConfig, OpponentStrategy } from './types';

const App: React.FC = () => {
  const playerDeck = useStore((s) => s.playerDeck);
  const opponentConfigs = useStore((s) => s.opponentConfigs);
  const setOpponentConfigs = useStore((s) => s.setOpponentConfigs);
  const runBattle = useStore((s) => s.runBattle);
  const resetBattle = useStore((s) => s.resetBattle);
  const isBattling = useStore((s) => s.isBattling);
  const battleResults = useStore((s) => s.battleResults);

  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  const updateOpponentCount = (count: number) => {
    const clamped = Math.max(1, Math.min(5, count));
    const current = [...opponentConfigs];
    while (current.length < clamped) {
      current.push({ id: uuidv4(), strategy: 'random' });
    }
    while (current.length > clamped) {
      current.pop();
    }
    setOpponentConfigs(current);
  };

  const updateOpponentStrategy = (index: number, strategy: OpponentStrategy) => {
    const updated = [...opponentConfigs];
    updated[index] = { ...updated[index], strategy };
    setOpponentConfigs(updated);
  };

  const handleRunBattle = () => {
    if (playerDeck.length === 6 && !isBattling) {
      runBattle();
    }
  };

  return (
    <div className="app-container">
      <div className={`left-panel ${leftCollapsed ? 'collapsed' : ''}`}>
        <button
          className="panel-toggle left-toggle"
          onClick={() => setLeftCollapsed(!leftCollapsed)}
        >
          {leftCollapsed ? '→' : '←'}
        </button>
        {!leftCollapsed && <DeckBuilder />}
      </div>

      <div className="center-panel">
        <div className="center-header">
          <h1>⚔ 卡牌对战模拟器</h1>
          <div className="center-actions">
            <button
              className="btn-primary"
              disabled={playerDeck.length !== 6 || isBattling}
              onClick={handleRunBattle}
            >
              {isBattling ? '模拟中...' : '开始对战'}
            </button>
            {battleResults.length > 0 && (
              <button className="btn-secondary" onClick={resetBattle}>
                重置
              </button>
            )}
          </div>
        </div>
        {playerDeck.length !== 6 && (
          <div className="center-notice">
            请在左侧选择6张卡牌组成牌组
          </div>
        )}
        <BattleReport />
      </div>

      <div className={`right-panel ${rightCollapsed ? 'collapsed' : ''}`}>
        <button
          className="panel-toggle right-toggle"
          onClick={() => setRightCollapsed(!rightCollapsed)}
        >
          {rightCollapsed ? '←' : '→'}
        </button>
        {!rightCollapsed && (
          <div className="config-panel">
            <h3>对手配置</h3>
            <div className="config-group">
              <label>对手数量</label>
              <input
                type="range"
                min={1}
                max={5}
                value={opponentConfigs.length}
                onChange={(e) => updateOpponentCount(Number(e.target.value))}
              />
              <span className="config-value">{opponentConfigs.length}</span>
            </div>
            {opponentConfigs.map((cfg, i) => (
              <div key={cfg.id} className="config-group">
                <label>对手 #{i + 1} 策略</label>
                <select
                  value={cfg.strategy}
                  onChange={(e) =>
                    updateOpponentStrategy(i, e.target.value as OpponentStrategy)
                  }
                >
                  <option value="random">完全随机</option>
                  <option value="highCost">偏向高费用</option>
                  <option value="lowCost">偏向低费用</option>
                </select>
              </div>
            ))}
            <div className="deck-status">
              <h4>牌组状态</h4>
              <p>已选: {playerDeck.length}/6</p>
              <p>总费: {playerDeck.reduce((s, c) => s + c.cost, 0)}</p>
              {playerDeck.reduce((s, c) => s + c.cost, 0) > 30 && (
                <p className="cost-warning-text">⚠ 总费用超过30！</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
