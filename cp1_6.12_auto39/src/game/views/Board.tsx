import React, { useMemo } from 'react';
import {
  GameState,
  Position,
  HighlightType,
  Unit,
  DamageInfo,
  BOARD_SIZE,
  posEqual,
} from '../types';
import { getUnitAt } from '../logic/GameEngine';

interface BoardProps {
  state: GameState;
  onCellClick: (pos: Position) => void;
  cellSize: number;
  aiMovePath?: Position[];
  defeatedMarkers?: Position[];
}

const EASING = 'cubic-bezier(0.25, 0.1, 0.25, 1)';

function getUnitPixelIcon(type: string, side: string): React.ReactNode {
  const isBlue = side === 'blue';
  const color = isBlue ? '#4488ff' : '#ff4444';
  const darkColor = isBlue ? '#2266cc' : '#cc2222';
  const lightColor = isBlue ? '#66aaff' : '#ff6666';

  switch (type) {
    case 'swordsman':
      return (
        <div className="pixel-unit swordsman-pixel" style={{ color }}>
          <div style={{
            width: '20px', height: '16px', backgroundColor: color,
            margin: '0 auto', position: 'relative',
          }}>
            <div style={{
              position: 'absolute', top: '-6px', left: '6px',
              width: '8px', height: '6px', backgroundColor: lightColor,
            }} />
            <div style={{
              position: 'absolute', top: '4px', right: '-8px',
              width: '4px', height: '14px', backgroundColor: '#aaa',
            }} />
            <div style={{
              position: 'absolute', top: '4px', right: '-10px',
              width: '8px', height: '2px', backgroundColor: '#ccc',
            }} />
          </div>
          <div style={{
            width: '16px', height: '10px', backgroundColor: darkColor, margin: '0 auto',
          }} />
          <div style={{
            display: 'flex', justifyContent: 'center', gap: '2px',
          }}>
            <div style={{ width: '4px', height: '8px', backgroundColor: darkColor }} />
            <div style={{ width: '4px', height: '8px', backgroundColor: darkColor }} />
          </div>
        </div>
      );
    case 'archer':
      return (
        <div className="pixel-unit archer-pixel" style={{ color }}>
          <div style={{
            width: '18px', height: '14px', backgroundColor: color,
            margin: '0 auto', position: 'relative',
          }}>
            <div style={{
              position: 'absolute', top: '-4px', left: '5px',
              width: '8px', height: '4px', backgroundColor: lightColor,
            }} />
            <div style={{
              position: 'absolute', top: '-2px', right: '-10px',
              width: '2px', height: '16px', backgroundColor: '#8B4513',
            }} />
            <div style={{
              position: 'absolute', top: '2px', right: '-6px',
              width: '8px', height: '2px', backgroundColor: '#8B4513',
            }} />
          </div>
          <div style={{
            width: '14px', height: '8px', backgroundColor: darkColor, margin: '0 auto',
          }} />
          <div style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
            <div style={{ width: '3px', height: '7px', backgroundColor: darkColor }} />
            <div style={{ width: '3px', height: '7px', backgroundColor: darkColor }} />
          </div>
        </div>
      );
    case 'knight':
      return (
        <div className="pixel-unit knight-pixel" style={{ color }}>
          <div style={{
            width: '20px', height: '16px', backgroundColor: color,
            margin: '0 auto', position: 'relative',
          }}>
            <div style={{
              position: 'absolute', top: '-8px', left: '4px',
              width: '12px', height: '8px', backgroundColor: lightColor,
              clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
            }} />
            <div style={{
              position: 'absolute', top: '6px', left: '-6px',
              width: '4px', height: '4px', backgroundColor: '#aaa',
            }} />
          </div>
          <div style={{
            width: '18px', height: '10px', backgroundColor: darkColor, margin: '0 auto',
          }} />
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2px' }}>
            <div style={{ width: '4px', height: '8px', backgroundColor: darkColor }} />
            <div style={{ width: '4px', height: '8px', backgroundColor: darkColor }} />
          </div>
        </div>
      );
    case 'mage':
      return (
        <div className="pixel-unit mage-pixel" style={{ color }}>
          <div style={{
            width: '16px', height: '14px', backgroundColor: color,
            margin: '0 auto', position: 'relative',
          }}>
            <div style={{
              position: 'absolute', top: '-10px', left: '3px',
              width: '10px', height: '10px', backgroundColor: lightColor,
              clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
            }} />
            <div style={{
              position: 'absolute', top: '-2px', right: '-8px',
              width: '2px', height: '14px', backgroundColor: '#9b59b6',
            }} />
            <div style={{
              position: 'absolute', top: '-4px', right: '-10px',
              width: '6px', height: '6px', backgroundColor: '#e74c3c',
              borderRadius: '0',
            }} />
          </div>
          <div style={{
            width: '14px', height: '8px', backgroundColor: darkColor, margin: '0 auto',
          }} />
          <div style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
            <div style={{ width: '3px', height: '7px', backgroundColor: darkColor }} />
            <div style={{ width: '3px', height: '7px', backgroundColor: darkColor }} />
          </div>
        </div>
      );
    default:
      return null;
  }
}

function HpBar({ hp, maxHp, side }: { hp: number; maxHp: number; side: string }) {
  const pct = (hp / maxHp) * 100;
  const isBlue = side === 'blue';
  return (
    <div style={{
      width: '36px', height: '4px', backgroundColor: '#333',
      margin: '1px auto 0', position: 'relative',
    }}>
      <div style={{
        width: `${pct}%`, height: '100%',
        backgroundColor: isBlue
          ? `rgb(${Math.round(68 + (1 - pct / 100) * 187)}, ${Math.round(136 - (1 - pct / 100) * 100)}, 255)`
          : `rgb(255, ${Math.round(68 + pct / 100 * 60)}, ${Math.round(68 + pct / 100 * 60)})`,
        transition: `width 0.3s ${EASING}`,
      }} />
    </div>
  );
}

function DamagePopup({ info, cellSize }: { info: DamageInfo; cellSize: number }) {
  const offsetX = Math.floor(Math.random() * 21) - 10;
  return (
    <div className="damage-popup" style={{
      position: 'absolute',
      left: info.targetPos.x * cellSize + cellSize / 2 + offsetX,
      top: info.targetPos.y * cellSize,
      transform: 'translate(-50%, -50%)',
      color: '#ff3333',
      fontFamily: '"Courier New", monospace',
      fontSize: '14px',
      fontWeight: 'bold',
      pointerEvents: 'none',
      zIndex: 100,
      animation: `floatUp 0.8s ${EASING} forwards`,
      textShadow: '1px 1px 0 #000',
    }}>
      -{info.damage}
    </div>
  );
}

export const Board: React.FC<BoardProps> = React.memo(({
  state,
  onCellClick,
  cellSize,
  aiMovePath = [],
  defeatedMarkers = [],
}) => {
  const boardPx = BOARD_SIZE * cellSize;

  const highlightMap = useMemo(() => {
    const map = new Map<string, HighlightType>();
    state.highlightedCells.forEach((h) => {
      map.set(`${h.pos.x},${h.pos.y}`, h.type);
    });
    return map;
  }, [state.highlightedCells]);

  const aiPathSet = useMemo(() => {
    const set = new Set<string>();
    aiMovePath.forEach((p) => set.add(`${p.x},${p.y}`));
    return set;
  }, [aiMovePath]);

  const defeatedSet = useMemo(() => {
    const set = new Set<string>();
    defeatedMarkers.forEach((p) => set.add(`${p.x},${p.y}`));
    return set;
  }, [defeatedMarkers]);

  const renderCell = (x: number, y: number) => {
    const key = `${x},${y}`;
    const highlight = highlightMap.get(key);
    const isAiPath = aiPathSet.has(key);
    const isDefeated = defeatedSet.has(key);
    const unit = getUnitAt(state, { x, y });
    const isSelected = state.selectedUnitId && unit?.id === state.selectedUnitId;

    let bgStyle: React.CSSProperties = {};
    if (highlight === 'move') {
      bgStyle = { backgroundColor: 'rgba(0, 200, 0, 0.35)' };
    } else if (highlight === 'attack') {
      bgStyle = { backgroundColor: 'rgba(255, 50, 50, 0.35)' };
    } else if (highlight === 'selected') {
      bgStyle = { backgroundColor: 'rgba(255, 255, 100, 0.3)' };
    }

    if (isAiPath) {
      bgStyle = {
        ...bgStyle,
        backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(60,60,255,0.4) 3px, rgba(60,60,255,0.4) 6px)',
      };
    }

    return (
      <div
        key={key}
        className="board-cell"
        onClick={() => onCellClick({ x, y })}
        style={{
          width: cellSize,
          height: cellSize,
          position: 'relative',
          border: '1px solid #5c3a1e',
          cursor: highlight === 'move' || highlight === 'attack' ? 'pointer' : 'default',
          ...bgStyle,
        }}
      >
        {unit && unit.isAlive && (
          <div
            className={`unit-on-board ${isSelected ? 'unit-selected' : ''} ${highlight === 'attack' && unit.side !== state.currentTurn ? 'unit-attack-target' : ''}`}
            style={{
              position: 'absolute',
              inset: '2px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              transition: `all 0.3s ${EASING}`,
              border: isSelected ? '2px solid yellow' : unit.side === 'blue' ? '2px solid #4488ff' : '2px solid #ff4444',
              backgroundColor: 'rgba(0,0,0,0.2)',
            }}
          >
            {getUnitPixelIcon(unit.type, unit.side)}
            <HpBar hp={unit.hp} maxHp={unit.maxHp} side={unit.side} />
            <span style={{
              fontFamily: '"Courier New", monospace',
              fontSize: '7px',
              color: '#ddd',
              lineHeight: 1,
            }}>
              {unit.hp}/{unit.maxHp}
            </span>
          </div>
        )}
        {isDefeated && (
          <div style={{
            position: 'absolute',
            inset: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.5,
          }}>
            <div style={{
              width: '12px',
              height: '16px',
              backgroundColor: '#ccc',
              position: 'relative',
            }}>
              <div style={{
                position: 'absolute',
                top: '-4px',
                left: '-2px',
                width: '16px',
                height: '4px',
                backgroundColor: '#aaa',
              }} />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="board-container" style={{
      position: 'relative',
      width: boardPx,
      height: boardPx,
      backgroundImage: `
        repeating-linear-gradient(0deg, transparent, transparent ${cellSize - 1}px, #5c3a1e ${cellSize - 1}px, #5c3a1e ${cellSize}px),
        repeating-linear-gradient(90deg, transparent, transparent ${cellSize - 1}px, #5c3a1e ${cellSize - 1}px, #5c3a1e ${cellSize}px)
      `,
      backgroundColor: '#c4a265',
      boxShadow: 'inset 0 0 30px rgba(92,58,30,0.3), 0 4px 12px rgba(0,0,0,0.5)',
      border: '3px solid #3d2410',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${BOARD_SIZE}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${BOARD_SIZE}, ${cellSize}px)`,
      }}>
        {Array.from({ length: BOARD_SIZE }, (_, y) =>
          Array.from({ length: BOARD_SIZE }, (_, x) => renderCell(x, y))
        )}
      </div>
      {state.damageAnimations.map((info, i) => (
        <DamagePopup key={`dmg-${i}-${info.targetId}`} info={info} cellSize={cellSize} />
      ))}
    </div>
  );
});

Board.displayName = 'Board';
