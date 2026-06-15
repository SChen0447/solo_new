import React from 'react';
import { Unit } from '../engine';

interface BattleFieldProps {
  heroes: Unit[];
  enemies: Unit[];
  simulating: boolean;
  currentTurn: number;
  currentActionUnitId: string | null;
  actionSkillId: string | null;
  onStart: () => void;
  onReset: () => void;
  simulationCount: number;
  simulationProgress?: number;
}

const HpBar: React.FC<{ current: number; max: number; isHero: boolean; label?: string }> = ({
  current,
  max,
  isHero,
  label
}) => {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  const low = pct < 20;
  return (
    <div style={{ width: '100%' }}>
      {label && (
        <div
          style={{
            fontSize: 10,
            color: '#8A8AAA',
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 2
          }}
        >
          <span>{label}</span>
          <span>
            {current}/{max}
          </span>
        </div>
      )}
      <div
        style={{
          width: '100%',
          height: 8,
          background: '#1E1E2E',
          borderRadius: 4,
          overflow: 'hidden',
          border: '1px solid #3A3A4C'
        }}
      >
        <div
          className={low ? 'hp-bar low-hp' : 'hp-bar'}
          style={{
            width: `${pct}%`,
            height: '100%',
            background: isHero
              ? low
                ? '#CC2222'
                : 'linear-gradient(90deg, #4A6CFF, #6C8CFF)'
              : low
              ? '#AA1111'
              : 'linear-gradient(90deg, #E04040, #FF7043)',
            transition: 'width 0.3s ease, background 0.2s'
          }}
        />
      </div>
    </div>
  );
};

const MpBar: React.FC<{ current: number; max: number }> = ({ current, max }) => {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  return (
    <div style={{ width: '100%', marginTop: 4 }}>
      <div
        style={{
          fontSize: 9,
          color: '#6A8ACC',
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 1
        }}
      >
        <span>MP</span>
        <span>
          {current}/{max}
        </span>
      </div>
      <div
        style={{
          width: '100%',
          height: 5,
          background: '#1E1E2E',
          borderRadius: 3,
          overflow: 'hidden',
          border: '1px solid #3A3A4C'
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #4A90E2, #6BB5FF)',
            transition: 'width 0.3s ease'
          }}
        />
      </div>
    </div>
  );
};

const UnitCard: React.FC<{
  unit: Unit;
  isHero: boolean;
  isActing: boolean;
  showSkillFlash: boolean;
}> = ({ unit, isHero, isActing, showSkillFlash }) => {
  const hpPct = (unit.hp / unit.maxHp) * 100;
  return (
    <div
      className={`unit-card ${showSkillFlash ? 'skill-flash' : ''}`}
      style={{
        width: 120,
        background: unit.alive
          ? isActing
            ? 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))'
            : '#2B2B3D'
          : 'rgba(20,20,30,0.6)',
        border: `2px solid ${isActing ? (isHero ? '#6C63FF' : '#FF6B6B') : '#3A3A4C'}`,
        borderRadius: 12,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        opacity: unit.alive ? 1 : 0.35,
        filter: unit.alive ? 'none' : 'grayscale(0.8)',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        boxShadow: isActing
          ? `0 0 20px ${isHero ? 'rgba(108,99,255,0.4)' : 'rgba(255,107,107,0.4)'}`
          : 'none',
        transform: showSkillFlash ? 'scale(1.1)' : 'scale(1)'
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: isHero
            ? 'linear-gradient(135deg, #6C63FF, #A29BFE)'
            : 'linear-gradient(135deg, #FF6B6B, #FF8E53)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
          fontWeight: 700,
          color: '#FFF',
          marginBottom: 8,
          boxShadow: isActing
            ? `0 0 15px ${isHero ? 'rgba(162,155,254,0.8)' : 'rgba(255,142,83,0.7)'}`
            : 'none'
        }}
      >
        {unit.name.charAt(0)}
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: '#E0E0E0',
          marginBottom: 6,
          textAlign: 'center',
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}
      >
        {unit.name}
      </div>
      <div style={{ width: '100%' }}>
        <HpBar current={unit.hp} max={unit.maxHp} isHero={isHero} />
        <MpBar current={unit.mp} max={unit.maxMp} />
      </div>
      {(unit.buffs.length > 0 || unit.debuffs.length > 0) && (
        <div
          style={{
            display: 'flex',
            gap: 3,
            marginTop: 6,
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}
        >
          {unit.buffs.map((b, i) => (
            <span
              key={'b' + i}
              style={{
                fontSize: 9,
                background: 'rgba(68,136,255,0.2)',
                color: '#6B9BFF',
                padding: '1px 4px',
                borderRadius: 3,
                border: '1px solid rgba(68,136,255,0.3)'
              }}
            >
              +{b.type}
            </span>
          ))}
          {unit.debuffs.map((d, i) => (
            <span
              key={'d' + i}
              style={{
                fontSize: 9,
                background: 'rgba(255,136,0,0.2)',
                color: '#FF9944',
                padding: '1px 4px',
                borderRadius: 3,
                border: '1px solid rgba(255,136,0,0.3)'
              }}
            >
              -{d.type}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

const BattleField: React.FC<BattleFieldProps> = ({
  heroes,
  enemies,
  simulating,
  currentTurn,
  currentActionUnitId,
  actionSkillId,
  onStart,
  onReset,
  simulationCount,
  simulationProgress = 0
}) => {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        height: '100%',
        background: '#1E1E2E'
      }}
    >
      <div
        style={{
          padding: '12px 20px',
          borderBottom: '1px solid #3A3A4C',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#E0E0E0' }}>
            ⚔ 战斗模拟
          </div>
          <div style={{ fontSize: 12, color: '#A0A0B8' }}>
            回合: <span style={{ color: '#FFB844', fontWeight: 700, fontSize: 16 }}>{currentTurn}</span> / 50
          </div>
          {simulationCount > 1 && (
            <div style={{ fontSize: 12, color: '#A0A0B8' }}>
              模拟进度:{' '}
              <span style={{ color: '#6BB5FF', fontWeight: 700 }}>
                {Math.round(simulationProgress * 100)}%
              </span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={onReset}
            disabled={simulating}
            style={{
              background: simulating ? '#2B2B3D' : 'rgba(255,255,255,0.05)',
              border: '1px solid #3A3A4C',
              color: simulating ? '#6A6A8A' : '#A0A0B8',
              fontSize: 12,
              padding: '7px 16px',
              borderRadius: 6,
              cursor: simulating ? 'not-allowed' : 'pointer',
              fontWeight: 500
            }}
          >
            ⟲ 重置
          </button>
          <button
            onClick={onStart}
            disabled={simulating}
            style={{
              background: simulating
                ? '#2B2B3D'
                : 'linear-gradient(135deg, #6C63FF, #A29BFE)',
              border: 'none',
              color: simulating ? '#6A6A8A' : '#FFF',
              fontSize: 13,
              fontWeight: 700,
              padding: '7px 20px',
              borderRadius: 6,
              cursor: simulating ? 'not-allowed' : 'pointer',
              boxShadow: simulating ? 'none' : '0 2px 12px rgba(108,99,255,0.4)'
            }}
          >
            {simulating
              ? simulationCount > 1
                ? '模拟中…'
                : '战斗进行中…'
              : `▶ 开始模拟${simulationCount > 1 ? ` (${simulationCount}次)` : ''}`}
          </button>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          background:
            'radial-gradient(ellipse at center top, rgba(108,99,255,0.08) 0%, transparent 60%), radial-gradient(ellipse at center bottom, rgba(255,107,107,0.06) 0%, transparent 60%)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-around',
          padding: 20,
          overflow: 'hidden'
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              color: '#FF8E53',
              fontWeight: 700,
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              justifyContent: 'center'
            }}
          >
            <span style={{ width: 40, height: 2, background: 'linear-gradient(90deg, transparent, #FF6B6B)' }} />
            敌方 · Enemy
            <span style={{ width: 40, height: 2, background: 'linear-gradient(90deg, #FF6B6B, transparent)' }} />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 16,
              flexWrap: 'wrap'
            }}
          >
            {enemies.map((e) => (
              <UnitCard
                key={e.id}
                unit={e}
                isHero={false}
                isActing={currentActionUnitId === e.id}
                showSkillFlash={currentActionUnitId === e.id && !!actionSkillId}
              />
            ))}
          </div>
        </div>

        <div
          style={{
            height: 80,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div
            style={{
              width: 120,
              height: 2,
              background:
                'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)'
            }}
          />
        </div>

        <div>
          <div
            style={{
              fontSize: 12,
              color: '#A29BFE',
              fontWeight: 700,
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              justifyContent: 'center'
            }}
          >
            <span style={{ width: 40, height: 2, background: 'linear-gradient(90deg, transparent, #6C63FF)' }} />
            英雄 · Heroes
            <span style={{ width: 40, height: 2, background: 'linear-gradient(90deg, #6C63FF, transparent)' }} />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 16,
              flexWrap: 'wrap'
            }}
          >
            {heroes.map((h) => (
              <UnitCard
                key={h.id}
                unit={h}
                isHero={true}
                isActing={currentActionUnitId === h.id}
                showSkillFlash={currentActionUnitId === h.id && !!actionSkillId}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BattleField;
