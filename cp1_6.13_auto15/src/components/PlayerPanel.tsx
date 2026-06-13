import React, { useMemo } from 'react';
import { useGameStore } from '@/store/gameStore';
import { PlayerColor, BOARD_SIZE } from '@/utils/gameLogic';

const PlayerPanel: React.FC = () => {
  const { players, currentPlayerIndex, winner } = useGameStore();

  const getColor = (color: PlayerColor): string => {
    const colors: Record<PlayerColor, string> = {
      red: '#ef4444',
      blue: '#3b82f6',
      green: '#22c55e',
      orange: '#f97316'
    };
    return colors[color];
  };

  const getColorName = (color: PlayerColor): string => {
    const names: Record<PlayerColor, string> = {
      red: '红色',
      blue: '蓝色',
      green: '绿色',
      orange: '橙色'
    };
    return names[color];
  };

  const rankedPlayers = useMemo(() => {
    return [...players]
      .map((player, index) => ({
        ...player,
        originalIndex: index,
        progress: player.position / BOARD_SIZE
      }))
      .sort((a, b) => b.position - a.position);
  }, [players]);

  const getRank = (originalIndex: number): number => {
    return rankedPlayers.findIndex(p => p.originalIndex === originalIndex) + 1;
  };

  return (
    <div className="player-panel">
      <h3 className="panel-title">玩家信息</h3>
      
      <div className="players-list">
        {players.map((player, index) => {
          const isCurrentPlayer = index === currentPlayerIndex && !winner;
          const isWinner = winner?.id === player.id;
          const rank = getRank(index);
          const progress = (player.position / BOARD_SIZE) * 100;

          return (
            <div
              key={player.id}
              className={`player-card ${isCurrentPlayer ? 'player-active' : ''} ${isWinner ? 'player-winner' : ''}`}
            >
              <div className="player-header">
                <div 
                  className="player-color-indicator"
                  style={{ backgroundColor: getColor(player.color) }}
                />
                <div className="player-info">
                  <div className="player-name">
                    {player.name}
                    {isWinner && <span className="winner-badge">🏆</span>}
                  </div>
                  <div className="player-color-text">{getColorName(player.color)}</div>
                </div>
                <div className="player-rank">
                  <span className="rank-number">#{rank}</span>
                </div>
              </div>
              
              <div className="player-progress">
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ 
                      width: `${progress}%`,
                      backgroundColor: getColor(player.color)
                    }}
                  />
                </div>
                <div className="player-position">
                  位置: {player.position} / {BOARD_SIZE}
                </div>
              </div>

              {isCurrentPlayer && (
                <div className="current-turn-indicator">
                  <span className="turn-dot" />
                  当前回合
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="game-rules">
        <h4 className="rules-title">游戏规则</h4>
        <ul className="rules-list">
          <li>🎲 轮流掷骰子，点数决定步数</li>
          <li>🪜 踩到梯子可前进到更高位置</li>
          <li>🐍 踩到蛇会滑落到更低位置</li>
          <li>🏁 先到达第100格获胜</li>
        </ul>
      </div>
    </div>
  );
};

export default PlayerPanel;
