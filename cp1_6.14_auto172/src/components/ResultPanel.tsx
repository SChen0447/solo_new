import React, { useState, useMemo, useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';
import { runSingleBattle } from '@/core/BattleEngine';
import { analyzeBattleResults, getWinRateColor, getHeatmapColor, AnalysisResult } from '@/core/Analyzer';
import { BattleResult, SKILLS, BattleAction, validateCharacterName } from '@/configs/CharacterConfig';

const RingProgress: React.FC<{
  percentage: number;
  label: string;
  name: string;
  size?: number;
}> = ({ percentage, label, name, size = 140 }) => {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const color = getWinRateColor(percentage);

  return (
    <div className="ring-progress-wrapper">
      <div className="ring-label">{name}</div>
      <svg width={size} height={size} className="ring-progress">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#3d3d5c"
          strokeWidth="10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
        />
        <text
          x={size / 2}
          y={size / 2 - 4}
          textAnchor="middle"
          fill={color}
          fontSize="24"
          fontWeight="700"
          fontFamily="'JetBrains Mono', monospace"
        >
          {percentage.toFixed(1)}%
        </text>
        <text
          x={size / 2}
          y={size / 2 + 16}
          textAnchor="middle"
          fill="#a0a0b8"
          fontSize="12"
        >
          {label}
        </text>
      </svg>
    </div>
  );
};

const BattleLogModal: React.FC<{ battle: BattleResult; onClose: () => void }> = ({ battle, onClose }) => {
  const [currentTurn, setCurrentTurn] = useState(battle.totalTurns);

  const actionsByTurn = useMemo(() => {
    const grouped: Record<number, BattleAction[]> = {};
    battle.actions.forEach((action) => {
      if (!grouped[action.turn]) grouped[action.turn] = [];
      grouped[action.turn].push(action);
    });
    return grouped;
  }, [battle]);

  return (
    <div className="battle-log-overlay" onClick={onClose}>
      <div className="battle-log-modal" onClick={(e) => e.stopPropagation()}>
        <div className="battle-log-header">
          <h3>
            战斗日志 - 第{battle.battleId.slice(0, 8)}场
            <span className="log-winner">
              {battle.isDraw ? '平局' : `胜者: ${battle.winnerName}`}
            </span>
          </h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="turn-selector">
          <span>跳转回合：</span>
          {Array.from({ length: battle.totalTurns }, (_, i) => i + 1).map((t) => (
            <button
              key={t}
              className={`turn-btn ${t === currentTurn ? 'active' : ''}`}
              onClick={() => setCurrentTurn(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="battle-log-content">
          {Array.from({ length: battle.totalTurns }, (_, i) => i + 1).map((turn) => (
            <div key={turn} className={`turn-block ${turn === currentTurn ? 'highlighted' : ''}`}>
              <div className="turn-title">回合 {turn}</div>
              <div className="turn-actions">
                {actionsByTurn[turn]?.map((action, idx) => (
                  <div key={idx} className={`log-message ${action.attackerId === 'char1' ? 'left' : action.attackerId === 'char2' ? 'right' : 'system'}`}>
                    <div className="log-bubble">
                      <span className="log-attacker">{action.attackerName}</span>
                      {action.actionType === 'skill' ? (
                        <span className="log-skill"> 使用【{action.skillName}】</span>
                      ) : action.attackerId === 'dot' ? (
                        <span className="log-dot"> 造成</span>
                      ) : (
                        <span className="log-attack"> 发动攻击</span>
                      )}
                      {action.damage !== undefined && (
                        <span className="log-damage"> -{action.damage} HP</span>
                      )}
                      {action.heal !== undefined && (
                        <span className="log-heal"> +{action.heal} HP</span>
                      )}
                      {action.effectApplied && (
                        <span className="log-effect"> [{action.effectApplied}]</span>
                      )}
                      <span className="log-target"> → {action.targetName}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const HeatmapChart: React.FC<{ data: AnalysisResult['heatmapData'] }> = ({ data }) => {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  const cellMap = useMemo(() => {
    const map: Record<string, { winRate: number; sampleSize: number }> = {};
    data.forEach((d) => {
      map[`${d.skill1Id}|${d.skill2Id}`] = { winRate: d.winRate, sampleSize: d.sampleSize };
    });
    return map;
  }, [data]);

  return (
    <div className="heatmap-wrapper">
      <div className="heatmap-title">技能组合胜率热力图</div>
      <div className="heatmap-container">
        <div className="heatmap-corner" />
        {SKILLS.map((skill) => (
          <div key={skill.id} className="heatmap-col-header" title={skill.name}>
            <span>{skill.icon}</span>
          </div>
        ))}
        {SKILLS.map((rowSkill, rowIdx) => (
          <React.Fragment key={rowSkill.id}>
            <div className="heatmap-row-header" title={rowSkill.name}>
              <span>{rowSkill.icon}</span>
              <span className="heatmap-skill-name">{rowSkill.name}</span>
            </div>
            {SKILLS.map((colSkill, colIdx) => {
              if (colIdx <= rowIdx) {
                return <div key={colSkill.id} className="heatmap-cell disabled" />;
              }
              const key = `${rowSkill.id}|${colSkill.id}`;
              const cell = cellMap[key];
              const winRate = cell?.winRate ?? 50;
              const isHovered = hoveredCell === key;

              return (
                <div
                  key={colSkill.id}
                  className={`heatmap-cell ${isHovered ? 'hovered' : ''}`}
                  style={{ backgroundColor: getHeatmapColor(winRate) }}
                  onMouseEnter={() => setHoveredCell(key)}
                  onMouseLeave={() => setHoveredCell(null)}
                >
                  {cell && cell.sampleSize > 0 ? (
                    <span className="heatmap-value">{winRate.toFixed(0)}%</span>
                  ) : (
                    <span className="heatmap-na">—</span>
                  )}
                  {isHovered && cell && (
                    <div className="heatmap-tooltip">
                      <div>{rowSkill.name} + {colSkill.name}</div>
                      <div>胜率: {winRate.toFixed(1)}%</div>
                      <div>样本: {cell.sampleSize} 场</div>
                    </div>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
      <div className="heatmap-legend">
        <span>低胜率</span>
        <div className="legend-gradient" />
        <span>高胜率</span>
      </div>
    </div>
  );
};

const SkillFrequencyChart: React.FC<{ data: AnalysisResult['skillFrequency'] }> = ({ data }) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const maxPercentage = Math.max(...data.map((d) => d.percentage), 1);

  return (
    <div className="frequency-wrapper">
      <div className="frequency-title">技能使用频率</div>
      <div className="frequency-list">
        {data.map((item) => {
          const isHovered = hoveredId === item.skillId;
          return (
            <div
              key={item.skillId}
              className="frequency-row"
              onMouseEnter={() => setHoveredId(item.skillId)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div className="frequency-skill">
                <span className="frequency-icon">{item.icon}</span>
                <span className="frequency-name">{item.skillName}</span>
              </div>
              <div className="frequency-bar-container">
                <div
                  className="frequency-bar"
                  style={{
                    width: `${(item.percentage / maxPercentage) * 100}%`,
                    opacity: isHovered ? 1 : 0.85,
                  }}
                />
                {isHovered && (
                  <span className="frequency-tooltip">
                    {item.count} 次 ({item.percentage.toFixed(1)}%)
                  </span>
                )}
              </div>
              <span className="frequency-count">{item.count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const ResultPanel: React.FC = () => {
  const character1 = useGameStore((s) => s.character1);
  const character2 = useGameStore((s) => s.character2);
  const battleResults = useGameStore((s) => s.battleResults);
  const analysisResult = useGameStore((s) => s.analysisResult);
  const isRunning = useGameStore((s) => s.isRunning);
  const setBattleResults = useGameStore((s) => s.setBattleResults);
  const setAnalysisResult = useGameStore((s) => s.setAnalysisResult);
  const setSelectedBattleId = useGameStore((s) => s.setSelectedBattleId);
  const selectedBattleId = useGameStore((s) => s.selectedBattleId);
  const setIsRunning = useGameStore((s) => s.setIsRunning);

  const [viewBattle, setViewBattle] = useState<BattleResult | null>(null);

  const canStartBattle = useMemo(() => {
    return (
      validateCharacterName(character1.name) &&
      validateCharacterName(character2.name) &&
      character1.skillIds.length === 3 &&
      character2.skillIds.length === 3 &&
      !isRunning
    );
  }, [character1, character2, isRunning]);

  const handleStartBattle = useCallback(async () => {
    if (!canStartBattle) return;

    setIsRunning(true);
    setBattleResults([]);
    setAnalysisResult(null);

    const results: BattleResult[] = [];
    const BATCH_SIZE = 10;
    const TOTAL_BATTLES = 30;

    for (let i = 0; i < TOTAL_BATTLES; i += BATCH_SIZE) {
      const batch = [];
      for (let j = i; j < Math.min(i + BATCH_SIZE, TOTAL_BATTLES); j++) {
        batch.push(runSingleBattle(character1, character2));
      }
      results.push(...batch);
      setBattleResults([...results]);
      await new Promise((resolve) => setTimeout(resolve, 16));
    }

    const analysis = analyzeBattleResults(results, character1.id, character2.id);
    setAnalysisResult(analysis);
    setIsRunning(false);
  }, [canStartBattle, character1, character2, setBattleResults, setAnalysisResult, setIsRunning]);

  const selectedBattle = battleResults.find((b) => b.battleId === selectedBattleId);

  return (
    <div className="result-panel">
      <div className="result-header">
        <h3>对战结果与分析</h3>
        <button
          className={`start-battle-btn ${!canStartBattle ? 'disabled' : ''}`}
          onClick={handleStartBattle}
          disabled={!canStartBattle}
        >
          {isRunning ? '对战中...' : '开始对战 (30局)'}
        </button>
      </div>

      {!canStartBattle && !isRunning && battleResults.length === 0 && (
        <div className="warning-box">
          请确保两个角色都已输入有效名称（2-6个中文字符）并选择了3个技能
        </div>
      )}

      {analysisResult && (
        <div className="analysis-section">
          <div className="win-rate-section">
            <div className="section-title">胜率统计</div>
            <div className="win-rate-rings">
              <RingProgress
                percentage={analysisResult.winRate.character1WinRate}
                label={`${analysisResult.winRate.character1Wins}胜 / ${battleResults.length}局`}
                name={character1.name}
              />
              <RingProgress
                percentage={analysisResult.winRate.drawRate}
                label={`${analysisResult.winRate.draws}平`}
                name="平局"
              />
              <RingProgress
                percentage={analysisResult.winRate.character2WinRate}
                label={`${analysisResult.winRate.character2Wins}胜 / ${battleResults.length}局`}
                name={character2.name}
              />
            </div>
            <div className="avg-turns">
              平均回合数: <span className="mono">{analysisResult.avgTurns.toFixed(1)}</span>
            </div>
          </div>

          <div className="stats-row">
            <SkillFrequencyChart data={analysisResult.skillFrequency} />
          </div>

          <div className="stats-row">
            <HeatmapChart data={analysisResult.heatmapData} />
          </div>
        </div>
      )}

      <div className="battle-records-section">
        <div className="section-title">战斗记录 ({battleResults.length}/30)</div>
        {battleResults.length === 0 ? (
          <div className="empty-state">暂无战斗记录，点击上方按钮开始对战</div>
        ) : (
          <div className="battle-table-wrapper">
            <table className="battle-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>胜者</th>
                  <th>{character1.name} HP</th>
                  <th>{character2.name} HP</th>
                  <th>回合数</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {battleResults.map((battle, idx) => (
                  <tr
                    key={battle.battleId}
                    className={`battle-row ${selectedBattleId === battle.battleId ? 'selected' : ''} fade-in`}
                    onClick={() => setSelectedBattleId(battle.battleId)}
                  >
                    <td className="mono">{idx + 1}</td>
                    <td>
                      <span
                        className="winner-badge"
                        style={{
                          backgroundColor: battle.isDraw
                            ? '#666'
                            : battle.winnerId === character1.id
                            ? '#6c63ff'
                            : '#ffd700',
                          color: battle.winnerId === character2.id ? '#1a1a2e' : '#fff',
                        }}
                      >
                        {battle.isDraw ? '平局' : battle.winnerName}
                      </span>
                    </td>
                    <td className="mono">{battle.character1FinalHp}</td>
                    <td className="mono">{battle.character2FinalHp}</td>
                    <td className="mono">{battle.totalTurns}</td>
                    <td>
                      <button
                        className="view-log-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewBattle(battle);
                        }}
                      >
                        查看日志
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(viewBattle || selectedBattle) && (
        <BattleLogModal
          battle={viewBattle || selectedBattle!}
          onClose={() => {
            setViewBattle(null);
            setSelectedBattleId(null);
          }}
        />
      )}
    </div>
  );
};

export default ResultPanel;
