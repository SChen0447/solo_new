import React, { useState } from 'react';
import { useGameStore } from '@/store/gameStore';

const DiceRoller: React.FC = () => {
  const { diceResult, isAnimating, gameStarted, currentPlayerIndex, players, rollDiceAction, showModal, winner } = useGameStore();
  const [isRolling, setIsRolling] = useState(false);

  const currentPlayer = players[currentPlayerIndex];

  const handleRoll = () => {
    if (isAnimating || !gameStarted || showModal.show || winner) return;
    
    setIsRolling(true);
    rollDiceAction();
    
    setTimeout(() => {
      setIsRolling(false);
    }, 800);
  };

  const getDiceDots = (value: number) => {
    const dotPositions: Record<number, string[]> = {
      1: ['center'],
      2: ['top-right', 'bottom-left'],
      3: ['top-right', 'center', 'bottom-left'],
      4: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
      5: ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'],
      6: ['top-left', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-right']
    };
    return dotPositions[value] || [];
  };

  const displayValue = diceResult || 1;
  const dots = getDiceDots(displayValue);

  const isDisabled = !gameStarted || isAnimating || showModal.show || !!winner;

  return (
    <div className="dice-roller">
      <div className="dice-current-player">
        <span 
          className="current-player-color"
          style={{ backgroundColor: currentPlayer ? getColor(currentPlayer.color) : '#ccc' }}
        />
        <span className="current-player-name">
          {currentPlayer ? currentPlayer.name : '等待开始'}
        </span>
      </div>
      
      <div 
        className={`dice-container ${isRolling ? 'dice-rolling' : ''}`}
        onClick={handleRoll}
        style={{ cursor: isDisabled ? 'not-allowed' : 'pointer' }}
      >
        <div className="dice">
          {dots.map((pos, idx) => (
            <div key={idx} className={`dice-dot dot-${pos}`} />
          ))}
        </div>
      </div>
      
      <button
        className="roll-button"
        onClick={handleRoll}
        disabled={isDisabled}
      >
        {!gameStarted ? '等待开始' : isAnimating ? '移动中...' : showModal.show ? '请关闭弹窗' : winner ? '游戏结束' : '掷骰子'}
      </button>
      
      {diceResult && !isRolling && (
        <div className="dice-result">
          点数：<span className="dice-result-value">{diceResult}</span>
        </div>
      )}
    </div>
  );
};

function getColor(color: string): string {
  const colors: Record<string, string> = {
    red: '#ef4444',
    blue: '#3b82f6',
    green: '#22c55e',
    orange: '#f97316'
  };
  return colors[color] || '#ccc';
}

export default DiceRoller;
