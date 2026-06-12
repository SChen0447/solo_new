import React from 'react';
import { Unit, UnitType } from '../types';

interface UnitCardProps {
  unit: Unit;
  isSelected: boolean;
  isDisabled: boolean;
  onClick: () => void;
}

const EASING = 'cubic-bezier(0.25, 0.1, 0.25, 1)';

const UNIT_SYMBOLS: Record<UnitType, string> = {
  swordsman: '⚔',
  archer: '🏹',
  knight: '🛡',
  mage: '✦',
};

function getUnitPixelIcon(type: UnitType, side: string): React.ReactNode {
  const isBlue = side === 'blue';
  const color = isBlue ? '#4488ff' : '#ff4444';
  const darkColor = isBlue ? '#2266cc' : '#cc2222';

  const baseStyle: React.CSSProperties = {
    width: '16px',
    height: '12px',
    backgroundColor: color,
    position: 'relative',
    margin: '0 auto',
  };

  switch (type) {
    case 'swordsman':
      return (
        <div style={baseStyle}>
          <div style={{ position: 'absolute', top: '-4px', left: '4px', width: '8px', height: '4px', backgroundColor: color }} />
          <div style={{ position: 'absolute', top: '2px', right: '-6px', width: '3px', height: '10px', backgroundColor: '#aaa' }} />
        </div>
      );
    case 'archer':
      return (
        <div style={baseStyle}>
          <div style={{ position: 'absolute', top: '-2px', left: '3px', width: '8px', height: '4px', backgroundColor: color }} />
          <div style={{ position: 'absolute', top: '0', right: '-6px', width: '2px', height: '10px', backgroundColor: '#8B4513' }} />
        </div>
      );
    case 'knight':
      return (
        <div style={baseStyle}>
          <div style={{ position: 'absolute', top: '-6px', left: '2px', width: '12px', height: '6px', backgroundColor: color, clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
        </div>
      );
    case 'mage':
      return (
        <div style={baseStyle}>
          <div style={{ position: 'absolute', top: '-6px', left: '3px', width: '10px', height: '6px', backgroundColor: color, clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
          <div style={{ position: 'absolute', top: '-3px', right: '-4px', width: '4px', height: '4px', backgroundColor: '#e74c3c' }} />
        </div>
      );
  }
}

export const UnitCard: React.FC<UnitCardProps> = React.memo(({ unit, isSelected, isDisabled, onClick }) => {
  const isBlue = unit.side === 'blue';
  const borderColor = isBlue ? '#4488ff' : '#ff4444';
  const bgColor = isBlue ? 'rgba(20, 40, 80, 0.9)' : 'rgba(80, 20, 20, 0.9)';
  const hpPct = (unit.hp / unit.maxHp) * 100;

  return (
    <div
      className="unit-card"
      onClick={onClick}
      style={{
        width: '100%',
        padding: '6px',
        backgroundColor: bgColor,
        border: isSelected ? `2px solid #ffcc00` : `2px solid ${borderColor}`,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: !unit.isAlive ? 0.4 : isDisabled ? 0.6 : 1,
        fontFamily: '"Courier New", monospace',
        color: '#ddd',
        fontSize: '11px',
        transition: `border-color 0.2s ${EASING}, opacity 0.2s ${EASING}`,
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <div style={{
          width: '28px',
          height: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.3)',
          border: `1px solid ${borderColor}`,
          flexShrink: 0,
        }}>
          {getUnitPixelIcon(unit.type, unit.side)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 'bold', fontSize: '11px' }}>
            {unit.skillName}
          </div>
          <div style={{ fontSize: '9px', color: '#aaa', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {unit.skillDescription}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px' }}>
          <span>HP</span>
          <span>{unit.hp}/{unit.maxHp}</span>
        </div>
        <div style={{
          width: '100%', height: '5px', backgroundColor: '#333', marginTop: '1px',
        }}>
          <div style={{
            width: `${hpPct}%`, height: '100%',
            backgroundColor: isBlue
              ? `linear-gradient(90deg, #2266cc, #4488ff)`
              : `linear-gradient(90deg, #cc2222, #ff4444)`,
            background: isBlue
              ? 'linear-gradient(90deg, #2266cc, #4488ff)'
              : 'linear-gradient(90deg, #cc2222, #ff4444)',
            transition: `width 0.3s ${EASING}`,
          }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: '3px', fontSize: '9px' }}>
        <span>ATK:{unit.attack}</span>
        <span>DEF:{unit.defense}</span>
        <span>MOV:{unit.moveRange}</span>
        <span>RNG:{unit.attackRange}</span>
      </div>

      <div style={{ display: 'flex', gap: '4px', marginTop: '2px', fontSize: '8px' }}>
        {unit.hasMoved && <span style={{ color: '#888' }}>已移动</span>}
        {unit.hasAttacked && <span style={{ color: '#888' }}>已攻击</span>}
        {!unit.hasMoved && !unit.hasAttacked && <span style={{ color: '#4a4' }}>待命</span>}
      </div>
    </div>
  );
});

UnitCard.displayName = 'UnitCard';
