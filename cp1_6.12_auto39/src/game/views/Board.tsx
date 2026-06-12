import React, { useMemo } from 'react';
import {
  GameState,
  Position,
  HighlightType,
  DamageInfo,
  BOARD_SIZE,
  posEqual,
} from '../types';
import { getUnitAt } from '../logic/GameEngine';

interface BoardProps {
  state: GameState;
  onCellClick: (pos: Position) => void;
  cellSize: number;
  aiMovePath: Position[];
  defeatedMarkers: Position[];
  attackingAnim: { attackerId: string; attackerPos: Position; targetPos: Position } | null;
  flashTargetIds: string[];
  shrinkingUnit: { id: string; pos: Position } | null;
}

const EASING = 'cubic-bezier(0.25, 0.1, 0.25, 1)';

function getUnitPixelIcon(type: string, side: string): React.ReactNode {
  const isBlue = side === 'blue';
  const color = isBlue ? '#4488ff' : '#ff4444';
  const darkColor = isBlue ? '#2266cc' : '#cc2222';
  const lightColor = isBlue ? '#66aaff' : '#ff6666';
  const skinColor = isBlue ? '#ffd5b0' : '#ffd5b0';

  switch (type) {
    case 'swordsman':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{
            width: '12px', height: '8px', backgroundColor: skinColor,
            position: 'relative', margin: '0 auto',
          }}>
            <div style={{
              position: 'absolute', top: '-3px', left: '0px',
              width: '12px', height: '3px', backgroundColor: color,
            }} />
          </div>
          <div style={{
            width: '16px', height: '10px', backgroundColor: color,
            margin: '0 auto', position: 'relative',
          }}>
            <div style={{
              position: 'absolute', top: '2px', right: '-6px',
              width: '3px', height: '10px', backgroundColor: '#bbb',
            }} />
            <div style={{
              position: 'absolute', top: '3px', right: '-8px',
              width: '8px', height: '2px', backgroundColor: '#ddd',
            }} />
          </div>
          <div style={{
            width: '14px', height: '6px', backgroundColor: darkColor, margin: '0 auto',
          }} />
          <div style={{ display: 'flex', gap: '2px' }}>
            <div style={{ width: '4px', height: '6px', backgroundColor: darkColor }} />
            <div style={{ width: '4px', height: '6px', backgroundColor: darkColor }} />
          </div>
        </div>
      );
    case 'archer':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{
            width: '12px', height: '8px', backgroundColor: skinColor,
            position: 'relative', margin: '0 auto',
          }}>
            <div style={{
              position: 'absolute', top: '-3px', left: '1px',
              width: '10px', height: '3px', backgroundColor: color,
            }} />
          </div>
          <div style={{
            width: '14px', height: '8px', backgroundColor: color,
            margin: '0 auto', position: 'relative',
          }}>
            <div style={{
              position: 'absolute', top: '-2px', right: '-8px',
              width: '2px', height: '14px', backgroundColor: '#8B4513',
            }} />
            <div style={{
              position: 'absolute', top: '1px', right: '-5px',
              width: '6px', height: '2px', backgroundColor: '#8B4513',
            }} />
            <div style={{
              position: 'absolute', top: '-4px', right: '-6px',
              width: '4px', height: '2px', backgroundColor: '#aaa',
            }} />
          </div>
          <div style={{
            width: '12px', height: '5px', backgroundColor: darkColor, margin: '0 auto',
          }} />
          <div style={{ display: 'flex', gap: '3px' }}>
            <div style={{ width: '3px', height: '5px', backgroundColor: darkColor }} />
            <div style={{ width: '3px', height: '5px', backgroundColor: darkColor }} />
          </div>
        </div>
      );
    case 'knight':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{
            width: '12px', height: '8px', backgroundColor: skinColor,
            position: 'relative', margin: '0 auto',
          }}>
            <div style={{
              position: 'absolute', top: '-6px', left: '0px',
              width: '12px', height: '6px', backgroundColor: lightColor,
              clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
            }} />
          </div>
          <div style={{
            width: '18px', height: '10px', backgroundColor: color,
            margin: '0 auto', position: 'relative',
          }}>
            <div style={{
              position: 'absolute', top: '3px', left: '-4px',
              width: '4px', height: '6px', backgroundColor: '#999',
            }} />
          </div>
          <div style={{
            width: '14px', height: '6px', backgroundColor: darkColor, margin: '0 auto',
          }} />
          <div style={{ display: 'flex', gap: '2px' }}>
            <div style={{ width: '4px', height: '6px', backgroundColor: darkColor }} />
            <div style={{ width: '4px', height: '6px', backgroundColor: darkColor }} />
          </div>
        </div>
      );
    case 'mage':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{
            width: '12px', height: '8px', backgroundColor: skinColor,
            position: 'relative', margin: '0 auto',
          }}>
            <div style={{
              position: 'absolute', top: '-5px', left: '1px',
              width: '10px', height: '5px', backgroundColor: lightColor,
              clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
            }} />
          </div>
          <div style={{
            width: '14px', height: '8px', backgroundColor: color,
            margin: '0 auto', position: 'relative',
          }}>
            <div style={{
              position: 'absolute', top: '-2px', right: '-7px',
              width: '2px', height: '12px', backgroundColor: '#9b59b6',
            }} />
            <div style={{
              position: 'absolute', top: '-4px', right: '-9px',
              width: '5px', height: '5px', backgroundColor: '#e74c3c',
            }} />
          </div>
          <div style={{
            width: '12px', height: '5px', backgroundColor: darkColor, margin: '0 auto',
          }} />
          <div style={{ display: 'flex', gap: '3px' }}>
            <div style={{ width: '3px', height: '5px', backgroundColor: darkColor }} />
            <div style={{ width: '3px', height: '5px', backgroundColor: darkColor }} />
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
      width: '34px', height: '3px', backgroundColor: '#333',
      margin: '1px auto 0', position: 'relative',
    }}>
      <div style={{
        width: `${pct}%`, height: '100%',
        background: isBlue
          ? 'linear-gradient(90deg, #2266cc, #4488ff)'
          : 'linear-gradient(90deg, #cc2222, #ff4444)',
        transition: `width 0.3s ${EASING}`,
      }} />
    </div>
  );
}

function DamagePopup({ info, cellSize }: { info: DamageInfo; cellSize: number }) {
  const offsetX = ((info.damage * 7 + info.targetPos.x * 13 + info.targetPos.y * 17) % 21) - 10;
  return (
    <div className="damage-popup" style={{
      left: info.targetPos.x * cellSize + cellSize / 2 + offsetX,
      top: info.targetPos.y * cellSize - 2,
    }}>
      -{info.damage}
    </div>
  );
}

function Tombstone() {
  return (
    <div className="tombstone-marker">
      <div className="tombstone-shape" />
    </div>
  );
}

function computeLungeTransform(
  attackerPos: Position,
  targetPos: Position,
  cellSize: number
): React.CSSProperties {
  const dx = targetPos.x - attackerPos.x;
  const dy = targetPos.y - attackerPos.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) return {};
  const lungeDist = cellSize * 0.3;
  const lx = Math.round((dx / dist) * lungeDist);
  const ly = Math.round((dy / dist) * lungeDist);
  return {
    '--lunge-x': `${lx}px`,
    '--lunge-y': `${ly}px`,
  } as React.CSSProperties;
}

export const Board: React.FC<BoardProps> = React.memo(({
  state,
  onCellClick,
  cellSize,
  aiMovePath,
  defeatedMarkers,
  attackingAnim,
  flashTargetIds,
  shrinkingUnit,
}) => {
  const boardPx = BOARD_SIZE * cellSize;

  const highlightMap = useMemo(() => {
    const map = new Map<string, HighlightType>();
    state.highlightedCells.forEach((h) => {
      const key = `${h.pos.x},${h.pos.y}`;
      const existing = map.get(key);
      if (existing === 'attack' && h.type === 'move') return;
      if (existing === 'selected') return;
      map.set(key, h.type);
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
    const isAttackTarget = highlight === 'attack' && unit && unit.side !== state.currentTurn;
    const isLunging = attackingAnim && unit?.id === attackingAnim.attackerId;
    const isFlashing = unit && flashTargetIds.includes(unit.id);
    const isShrinking = shrinkingUnit && shrinkingUnit.pos.x === x && shrinkingUnit.pos.y === y;

    let highlightClass = '';
    if (highlight === 'move') highlightClass = 'move-highlight';
    else if (highlight === 'attack') highlightClass = 'attack-highlight';
    else if (highlight === 'selected') highlightClass = 'selected-highlight';

    if (isAiPath) highlightClass += ' ai-path-cell';

    let unitClass = 'unit-on-board';
    if (isSelected) unitClass += ' unit-selected';
    if (isAttackTarget) unitClass += ' unit-attack-target';
    if (isLunging) unitClass += ' unit-lunge';
    if (isFlashing) unitClass += ' unit-red-flash';
    if (isShrinking) unitClass += ' unit-shrink-defeat';

    const lungeStyle = isLunging
      ? computeLungeTransform(attackingAnim!.attackerPos, attackingAnim!.targetPos, cellSize)
      : {};

    return (
      <div
        key={key}
        className={`board-cell ${highlightClass}`}
        onClick={() => onCellClick({ x, y })}
        style={{
          width: cellSize,
          height: cellSize,
          position: 'relative',
          border: `1px solid #5c3a1e`,
          cursor: highlight === 'move' || highlight === 'attack' ? 'pointer' : 'default',
        }}
      >
        {unit && unit.isAlive && !isShrinking && (
          <div
            className={unitClass}
            style={{
              position: 'absolute',
              inset: '2px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              border: isSelected ? '2px solid #ffcc00' : unit.side === 'blue' ? '2px solid #4488ff' : '2px solid #ff4444',
              backgroundColor: 'rgba(0,0,0,0.2)',
              ...lungeStyle,
            }}
          >
            {getUnitPixelIcon(unit.type, unit.side)}
            <HpBar hp={unit.hp} maxHp={unit.maxHp} side={unit.side} />
            <span style={{
              fontFamily: '"Courier New", monospace',
              fontSize: cellSize <= 40 ? '6px' : '7px',
              color: '#ddd',
              lineHeight: 1,
            }}>
              {unit.hp}/{unit.maxHp}
            </span>
          </div>
        )}
        {isShrinking && (
          <div
            className="unit-on-board unit-shrink-defeat"
            style={{
              position: 'absolute',
              inset: '2px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #ff4444',
              backgroundColor: 'rgba(0,0,0,0.2)',
            }}
          >
            {shrinkingUnit && getUnitPixelIcon(
              state.units.find(u => u.id === shrinkingUnit.id)?.type || 'swordsman',
              state.units.find(u => u.id === shrinkingUnit.id)?.side || 'red'
            )}
          </div>
        )}
        {isDefeated && !unit?.isAlive && !isShrinking && <Tombstone />}
      </div>
    );
  };

  return (
    <div
      className="board-wood-texture"
      style={{
        position: 'relative',
        width: boardPx,
        height: boardPx,
        boxShadow: 'inset 0 0 30px rgba(92,58,30,0.4), 0 4px 12px rgba(0,0,0,0.5)',
        border: '3px solid #3d2410',
      }}
    >
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
        <DamagePopup key={`dmg-${i}-${info.targetId}-${info.damage}`} info={info} cellSize={cellSize} />
      ))}
    </div>
  );
});

Board.displayName = 'Board';
