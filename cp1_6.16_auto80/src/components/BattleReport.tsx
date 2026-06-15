import React, { useEffect, useRef, useCallback } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { useStore } from '../store';
import { BattleEvent, EventType } from '../types';

const WIN_COLOR = '#4ECDC4';
const LOSS_COLOR = '#FF6B6B';
const DRAW_COLOR = '#FFD93D';

const EVENT_COLORS: Record<EventType, string> = {
  playCard: '#3B82F6',
  attack: '#EF4444',
  shieldBlock: '#4ECDC4',
  lifesteal: '#C77DFF',
  freezeApply: '#74C0FC',
  freezeSkip: '#60A5FA',
  burnApply: '#FF922B',
  burnTick: '#F97316',
  doubleStrike: '#FF6B6B',
  death: '#1F2937',
};

const EVENT_LABELS: Record<EventType, string> = {
  playCard: '出牌',
  attack: '攻击',
  shieldBlock: '护盾',
  lifesteal: '吸血',
  freezeApply: '冰冻',
  freezeSkip: '冰冻跳过',
  burnApply: '灼烧施加',
  burnTick: '灼烧伤害',
  doubleStrike: '连击',
  death: '阵亡',
};

export const BattleReport: React.FC = () => {
  const battleResults = useStore((s) => s.battleResults);
  const selectedBattleIndex = useStore((s) => s.selectedBattleIndex);
  const selectBattle = useStore((s) => s.selectBattle);
  const currentReplayTurn = useStore((s) => s.currentReplayTurn);
  const setCurrentReplayTurn = useStore((s) => s.setCurrentReplayTurn);
  const statistics = useStore((s) => s.statistics);
  const timerRef = useRef<number | null>(null);

  const selectedResult =
    selectedBattleIndex !== null && selectedBattleIndex < battleResults.length
      ? battleResults[selectedBattleIndex]
      : null;

  const maxTurn = selectedResult ? selectedResult.snapshots.length : 0;

  const startAutoReplay = useCallback(() => {
    stopAutoReplay();
    setCurrentReplayTurn(0);
    timerRef.current = window.setInterval(() => {
      setCurrentReplayTurn(currentReplayTurn + 1);
    }, 800);
  }, [currentReplayTurn, setCurrentReplayTurn]);

  const stopAutoReplay = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearInterval(timerRef.current);
    };
  }, []);

  if (battleResults.length === 0) {
    return (
      <div className="battle-report-empty">
        <div className="empty-icon">⚔</div>
        <p>配置对手并开始对战以查看战报</p>
      </div>
    );
  }

  const winRateData = statistics
    ? [
        { name: '胜利', value: statistics.wins },
        { name: '失败', value: statistics.losses },
        { name: '平局', value: statistics.draws },
      ]
    : [];

  const cardUsageData = statistics
    ? Object.entries(statistics.cardUsage)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
    : [];

  const damageDistData = statistics?.damageDistribution || [];

  const hpTrendData = selectedResult
    ? selectedResult.snapshots.map((s) => ({
        turn: s.turn,
        玩家血量: s.playerHp,
        对手血量: s.opponentHp,
      }))
    : [];

  return (
    <div className="battle-report">
      <div className="battle-summary-list">
        <h3>对战摘要</h3>
        {battleResults.map((r, i) => (
          <div
            key={i}
            className={`battle-summary-card ${selectedBattleIndex === i ? 'active' : ''}`}
            onClick={() => selectBattle(i)}
          >
            <div className="summary-header">
              <span>对手 #{r.opponentIndex + 1}</span>
              <span
                className={`summary-result ${r.winner === 'player' ? 'win' : r.winner === 'opponent' ? 'lose' : 'draw'}`}
              >
                {r.winner === 'player' ? '胜' : r.winner === 'opponent' ? '负' : '平'}
              </span>
            </div>
            <div className="summary-details">
              <span>回合: {r.totalTurns}</span>
              <span>血量: {r.playerRemainingHp} vs {r.opponentRemainingHp}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="battle-replay">
        {selectedResult && (
          <>
            <div className="replay-header">
              <h3>
                对手 #{selectedResult.opponentIndex + 1} 战斗回放
              </h3>
              <div className="replay-controls">
                <button onClick={startAutoReplay}>▶ 自动播放</button>
                <button onClick={stopAutoReplay}>⏸ 暂停</button>
                <button onClick={() => setCurrentReplayTurn(0)}>⏮ 重置</button>
                <input
                  type="range"
                  min={0}
                  max={maxTurn}
                  value={currentReplayTurn}
                  onChange={(e) => setCurrentReplayTurn(Number(e.target.value))}
                />
                <span>回合 {currentReplayTurn}/{maxTurn}</span>
              </div>
            </div>

            <div className="hp-trend-chart">
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={hpTrendData}>
                  <XAxis dataKey="turn" stroke="#E0E0E0" />
                  <YAxis stroke="#E0E0E0" />
                  <Tooltip
                    contentStyle={{ background: '#2D2D3F', border: 'none', color: '#E0E0E0' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="玩家血量" stroke={WIN_COLOR} strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="对手血量" stroke={LOSS_COLOR} strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="replay-timeline">
              {selectedResult.snapshots
                .filter((s) => s.turn <= currentReplayTurn)
                .map((snap) => (
                  <div key={snap.turn} className="turn-block">
                    <div className="turn-label">回合 {snap.turn}</div>
                    <div className="turn-cards">
                      <div className="turn-card player">
                        {snap.playerCard ? (
                          <>
                            <strong>{snap.playerCard.def.name}</strong>
                            <span>⚔{snap.playerCard.def.attack} ❤{snap.playerCard.currentHp}</span>
                          </>
                        ) : (
                          <span>无牌可出</span>
                        )}
                      </div>
                      <div className="turn-vs">VS</div>
                      <div className="turn-card opponent">
                        {snap.opponentCard ? (
                          <>
                            <strong>{snap.opponentCard.def.name}</strong>
                            <span>⚔{snap.opponentCard.def.attack} ❤{snap.opponentCard.currentHp}</span>
                          </>
                        ) : (
                          <span>无牌可出</span>
                        )}
                      </div>
                    </div>
                    <div className="turn-hp">
                      玩家HP: {snap.playerHp} | 对手HP: {snap.opponentHp}
                    </div>
                    <div className="turn-events">
                      {snap.events.map((ev, ei) => (
                        <div
                          key={ei}
                          className="event-item"
                          style={{
                            borderLeft: `3px solid ${EVENT_COLORS[ev.type]}`,
                            background: `${EVENT_COLORS[ev.type]}15`,
                          }}
                        >
                          <span className="event-type">
                            [{EVENT_LABELS[ev.type]}]
                          </span>
                          <span className="event-detail">{ev.detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </>
        )}
      </div>

      <div className="battle-stats">
        <h3>统计图表</h3>

        {statistics && (
          <>
            <div className="stat-section">
              <h4>胜率分布</h4>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={winRateData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {winRateData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={[WIN_COLOR, LOSS_COLOR, DRAW_COLOR][i]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="stat-section">
              <h4>卡牌使用频率</h4>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={cardUsageData}>
                  <XAxis
                    dataKey="name"
                    stroke="#E0E0E0"
                    tick={{ fontSize: 10 }}
                    angle={-30}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis stroke="#E0E0E0" />
                  <Tooltip
                    contentStyle={{ background: '#2D2D3F', border: 'none', color: '#E0E0E0' }}
                  />
                  <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="stat-section">
              <h4>伤害输出分布</h4>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={damageDistData}
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    dataKey="count"
                    label={({ range, count }) => `${range}: ${count}`}
                  >
                    {damageDistData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={['#3B82F6', '#8B5CF6', '#EC4899', '#F97316', '#EF4444'][i]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
