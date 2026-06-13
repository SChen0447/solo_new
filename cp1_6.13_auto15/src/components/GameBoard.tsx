import React, { useMemo, useRef, useEffect, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { getCellType, BOARD_SIZE, Player, PlayerColor } from '@/utils/gameLogic';

interface CellInfo {
  position: number;
  type: 'normal' | 'ladder' | 'snake';
}

const GameBoard: React.FC = () => {
  const { players, specialCells } = useGameStore();
  const boardRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState(60);

  useEffect(() => {
    const updateSize = () => {
      if (boardRef.current) {
        const gridWidth = boardRef.current.clientWidth;
        setCellSize(gridWidth / 10);
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const cells = useMemo((): CellInfo[] => {
    const result: CellInfo[] = [];
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 10; col++) {
        const baseNum = (9 - row) * 10;
        const position = row % 2 === 0 
          ? baseNum + col + 1 
          : baseNum + (9 - col) + 1;
        result.push({
          position,
          type: getCellType(position, specialCells)
        });
      }
    }
    return result;
  }, [specialCells]);

  const getPositionCoords = (position: number) => {
    if (position === 0) {
      return { x: -cellSize * 0.8, y: cellSize * 9 };
    }
    const adjustedPos = position - 1;
    const row = 9 - Math.floor(adjustedPos / 10);
    const colInRow = adjustedPos % 10;
    const col = row % 2 === 1 ? 9 - colInRow : colInRow;
    return { x: col * cellSize, y: row * cellSize };
  };

  const getCellClass = (type: 'normal' | 'ladder' | 'snake') => {
    const base = 'board-cell';
    if (type === 'ladder') return `${base} cell-ladder`;
    if (type === 'snake') return `${base} cell-snake`;
    return base;
  };

  const getCellIcon = (type: 'normal' | 'ladder' | 'snake') => {
    if (type === 'ladder') return '🪜';
    if (type === 'snake') return '🐍';
    return null;
  };

  const getColorStyle = (color: PlayerColor) => {
    const colors: Record<PlayerColor, string> = {
      red: '#ef4444',
      blue: '#3b82f6',
      green: '#22c55e',
      orange: '#f97316'
    };
    return colors[color];
  };

  const getPlayerOffset = (index: number, totalOnCell: number) => {
    if (totalOnCell === 1) return { x: 0, y: 0 };
    const positions = [
      { x: -8, y: -8 },
      { x: 8, y: -8 },
      { x: -8, y: 8 },
      { x: 8, y: 8 }
    ];
    return positions[index % 4];
  };

  const groupedPlayers = useMemo(() => {
    const groups = new Map<number, Player[]>();
    players.forEach(player => {
      const pos = player.position;
      if (!groups.has(pos)) groups.set(pos, []);
      groups.get(pos)!.push(player);
    });
    return groups;
  }, [players]);

  return (
    <div className="game-board-wrapper">
      <div className="game-board" ref={boardRef}>
        <div className="board-grid">
          {cells.map(({ position, type }) => (
            <div
              key={position}
              className={getCellClass(type)}
            >
              <span className="cell-number">{position}</span>
              <span className="cell-icon">{getCellIcon(type)}</span>
            </div>
          ))}
        </div>
        
        <div className="board-start-indicator">
          <span className="cell-number">起点</span>
        </div>

        <div className="pieces-container">
          {Array.from(groupedPlayers.entries()).map(([position, playersOnPos]) => {
            const coords = getPositionCoords(position);
            return playersOnPos.map((player, idx) => {
              const offset = getPlayerOffset(idx, playersOnPos.length);
              const pieceSize = Math.min(30, cellSize * 0.45);
              
              return (
                <div
                  key={player.id}
                  className={`player-piece piece-${player.color}`}
                  style={{
                    width: `${pieceSize}px`,
                    height: `${pieceSize}px`,
                    transform: `translate(${coords.x + offset.x + cellSize / 2 - pieceSize / 2}px, ${coords.y + offset.y + cellSize / 2 - pieceSize / 2}px)`,
                    backgroundColor: getColorStyle(player.color),
                    boxShadow: `0 0 12px ${getColorStyle(player.color)}80`
                  }}
                  title={`${player.name} - 第${position}格`}
                />
              );
            });
          })}
        </div>
      </div>
    </div>
  );
};

export default GameBoard;
