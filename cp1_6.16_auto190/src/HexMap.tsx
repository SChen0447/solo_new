import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Unit,
  HexTile,
  TERRAIN_COLORS,
  hexToPixel,
  getHexCorners,
  hexDistance,
  HEX_SIZE,
  MAP_WIDTH,
  MAP_HEIGHT
} from './BattleEngine';

interface HexMapProps {
  map: HexTile[][];
  units: Unit[];
  phase: 'deploy' | 'battle';
  currentTeam?: 'red' | 'blue';
  selectedUnit?: Unit | null;
  deployUnit?: Unit | null;
  onHexClick?: (x: number, y: number) => void;
  action?: { type: string; attackerId?: string; targetId?: string; damage?: number } | null;
  onAnimationEnd?: () => void;
}

interface DamageText {
  id: string;
  x: number;
  y: number;
  damage: number;
  createdAt: number;
}

const HexMap: React.FC<HexMapProps> = ({
  map,
  units,
  phase,
  currentTeam,
  selectedUnit,
  deployUnit,
  onHexClick,
  action,
  onAnimationEnd
}) => {
  const [hoveredHex, setHoveredHex] = useState<{ x: number; y: number } | null>(null);
  const [damageTexts, setDamageTexts] = useState<DamageText[]>([]);
  const [attackLine, setAttackLine] = useState<{ from: { px: number; py: number }; to: { px: number; py: number }; color: string } | null>(null);
  const [blinkingUnits, setBlinkingUnits] = useState<Set<string>>(new Set());
  const damageIdRef = useRef(0);

  const svgWidth = MAP_WIDTH * HEX_SIZE * 1.5 + HEX_SIZE * 2;
  const svgHeight = MAP_HEIGHT * Math.sqrt(3) * HEX_SIZE + HEX_SIZE * 2;

  const rangeHighlight = useMemo(() => {
    const highlighted = new Set<string>();
    if (phase === 'deploy' && deployUnit && hoveredHex) {
      for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
          if (hexDistance(hoveredHex.x, hoveredHex.y, x, y) <= deployUnit.range) {
            highlighted.add(`${x}-${y}`);
          }
        }
      }
    } else if (selectedUnit && selectedUnit.hp > 0) {
      for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
          if (hexDistance(selectedUnit.x, selectedUnit.y, x, y) <= selectedUnit.range) {
            highlighted.add(`${x}-${y}`);
          }
        }
      }
    }
    return highlighted;
  }, [selectedUnit, deployUnit, hoveredHex, phase]);

  useEffect(() => {
    if (action?.type === 'attack' && action.attackerId && action.targetId) {
      const attacker = units.find(u => u.id === action.attackerId);
      const target = units.find(u => u.id === action.targetId);
      
      if (attacker && target) {
        const from = hexToPixel(attacker.x, attacker.y, HEX_SIZE);
        const to = hexToPixel(target.x, target.y, HEX_SIZE);
        const color = attacker.team === 'red' ? '#ff4444' : '#4444ff';
        
        setAttackLine({ from, to, color });

        const damageId = `dmg-${damageIdRef.current++}`;
        setDamageTexts(prev => [...prev, {
          id: damageId,
          x: to.px,
          y: to.py,
          damage: action.damage || 0,
          createdAt: Date.now()
        }]);

        if (action.damage && target.hp - action.damage <= 0) {
          setTimeout(() => {
            setBlinkingUnits(prev => new Set(prev).add(target.id));
          }, 300);
          setTimeout(() => {
            setBlinkingUnits(prev => {
              const next = new Set(prev);
              next.delete(target.id);
              return next;
            });
          }, 800);
        }

        setTimeout(() => {
          setAttackLine(null);
          if (onAnimationEnd) onAnimationEnd();
        }, 200);

        setTimeout(() => {
          setDamageTexts(prev => prev.filter(d => d.id !== damageId));
        }, 1000);
      }
    }
  }, [action, units, onAnimationEnd]);

  const handleHexClick = (x: number, y: number) => {
    if (onHexClick) {
      onHexClick(x, y);
    }
  };

  const canPlaceUnit = (x: number, y: number) => {
    if (phase !== 'deploy' || !deployUnit) return false;
    const hasUnit = units.some(u => u.hp > 0 && u.x === x && u.y === y);
    if (hasUnit) return false;
    if (currentTeam === 'red' && x >= 5) return false;
    if (currentTeam === 'blue' && x < MAP_WIDTH - 5) return false;
    return true;
  };

  const renderHexes = () => {
    const elements: React.ReactNode[] = [];
    
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const tile = map[y]?.[x];
        if (!tile) continue;
        
        const { px, py } = hexToPixel(x, y, HEX_SIZE);
        const isHighlighted = rangeHighlight.has(`${x}-${y}`);
        const isHovered = hoveredHex?.x === x && hoveredHex?.y === y;
        const canPlace = canPlaceUnit(x, y);
        
        let fillColor = TERRAIN_COLORS[tile.terrain];
        if (isHighlighted) {
          if (deployUnit?.team === 'red' || selectedUnit?.team === 'red') {
            fillColor = 'rgba(255, 100, 100, 0.35)';
          } else if (deployUnit?.team === 'blue' || selectedUnit?.team === 'blue') {
            fillColor = 'rgba(100, 100, 255, 0.35)';
          }
        }
        if (isHovered && phase === 'deploy') {
          fillColor = canPlace ? '#ffff99' : fillColor;
        }
        
        elements.push(
          <polygon
            key={`hex-${x}-${y}`}
            points={getHexCorners(px, py, HEX_SIZE - 1)}
            fill={fillColor}
            stroke="#2a2a3e"
            strokeWidth="1"
            onMouseEnter={() => setHoveredHex({ x, y })}
            onMouseLeave={() => setHoveredHex(null)}
            onClick={() => handleHexClick(x, y)}
            style={{ cursor: phase === 'deploy' ? 'pointer' : 'default', transition: 'fill 0.15s ease' }}
          />
        );
      }
    }
    
    return elements;
  };

  const renderUnits = () => {
    return units
      .filter(u => u.hp > 0)
      .map(unit => {
        const { px, py } = hexToPixel(unit.x, unit.y, HEX_SIZE);
        const isBlinking = blinkingUnits.has(unit.id);
        const isSelected = selectedUnit?.id === unit.id;
        
        return (
          <g key={unit.id} style={{ transition: 'transform 0.3s ease' }}>
            {isSelected && (
              <circle
                cx={px}
                cy={py}
                r={HEX_SIZE * 0.8}
                fill="none"
                stroke={unit.team === 'red' ? '#ff4444' : '#4444ff'}
                strokeWidth="2"
                strokeDasharray="5,3"
                opacity={isBlinking ? 0 : 1}
              />
            )}
            <circle
              cx={px}
              cy={py}
              r={HEX_SIZE * 0.6}
              fill={unit.team === 'red' ? '#e53935' : '#1e88e5'}
              stroke="#fff"
              strokeWidth="2"
              opacity={isBlinking ? 0 : 1}
              style={{ transition: 'opacity 0.15s ease' }}
            />
            <text
              x={px}
              y={py + 5}
              textAnchor="middle"
              fontSize="14"
              fontWeight="bold"
              fill="white"
              opacity={isBlinking ? 0 : 1}
              style={{ transition: 'opacity 0.15s ease', pointerEvents: 'none' }}
            >
              {unit.icon}
            </text>
            <rect
              x={px - 15}
              y={py + HEX_SIZE * 0.5}
              width="30"
              height="5"
              fill="#222"
              rx="2"
              opacity={isBlinking ? 0 : 1}
            />
            <rect
              x={px - 14}
              y={py + HEX_SIZE * 0.5 + 1}
              width={Math.max(0, (unit.hp / unit.maxHp) * 28)}
              height="3"
              fill={unit.hp / unit.maxHp > 0.5 ? '#4caf50' : unit.hp / unit.maxHp > 0.25 ? '#ff9800' : '#f44336'}
              rx="1"
              opacity={isBlinking ? 0 : 1}
            />
          </g>
        );
      });
  };

  const renderDeployZones = () => {
    if (phase !== 'deploy') return null;
    
    const zones: React.ReactNode[] = [];
    
    if (currentTeam === 'red') {
      for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < 5; x++) {
          const { px, py } = hexToPixel(x, y, HEX_SIZE);
          zones.push(
            <polygon
              key={`red-zone-${x}-${y}`}
              points={getHexCorners(px, py, HEX_SIZE - 2)}
              fill="rgba(255, 0, 0, 0.08)"
              stroke="rgba(255, 0, 0, 0.25)"
              strokeWidth="1"
              pointerEvents="none"
            />
          );
        }
      }
    }
    
    if (currentTeam === 'blue') {
      for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = MAP_WIDTH - 5; x < MAP_WIDTH; x++) {
          const { px, py } = hexToPixel(x, y, HEX_SIZE);
          zones.push(
            <polygon
              key={`blue-zone-${x}-${y}`}
              points={getHexCorners(px, py, HEX_SIZE - 2)}
              fill="rgba(0, 100, 255, 0.08)"
              stroke="rgba(0, 100, 255, 0.25)"
              strokeWidth="1"
              pointerEvents="none"
            />
          );
        }
      }
    }
    
    return <>{zones}</>;
  };

  const renderDamageTexts = () => {
    return damageTexts.map(dt => (
      <text
        key={dt.id}
        x={dt.x}
        y={dt.y - 20}
        textAnchor="middle"
        fontSize="16"
        fontWeight="bold"
        fill="#ff6b6b"
        style={{
          animation: 'floatUp 1s ease-out forwards',
          textShadow: '1px 1px 2px black'
        }}
      >
        -{dt.damage}
      </text>
    ));
  };

  return (
    <div style={{ position: 'relative', overflow: 'auto', maxWidth: '100%', maxHeight: '100%' }}>
      <style>{`
        @keyframes floatUp {
          0% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-30px); }
        }
        @keyframes pulse {
          0% { opacity: 1; }
          100% { opacity: 0.3; }
        }
      `}</style>
      <svg
        width={svgWidth}
        height={svgHeight}
        style={{ display: 'block', margin: '0 auto' }}
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {renderHexes()}
        {renderDeployZones()}
        {renderUnits()}
        
        {attackLine && (
          <line
            x1={attackLine.from.px}
            y1={attackLine.from.py}
            x2={attackLine.to.px}
            y2={attackLine.to.py}
            stroke={attackLine.color}
            strokeWidth="3"
            filter="url(#glow)"
            style={{
              strokeDasharray: '10,5',
              animation: 'pulse 0.2s ease-out'
            }}
          />
        )}
        
        {renderDamageTexts()}
      </svg>
    </div>
  );
};

export default HexMap;
