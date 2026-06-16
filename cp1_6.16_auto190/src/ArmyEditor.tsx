import React, { useState } from 'react';
import { UnitTemplate, UNIT_TEMPLATES } from './BattleEngine';

interface ArmyUnit {
  id: string;
  template: UnitTemplate;
  quantity: number;
}

interface ArmyEditorProps {
  team: 'red' | 'blue';
  initialBudget?: number;
  onDeploy: (units: UnitTemplate[]) => void;
}

const ArmyEditor: React.FC<ArmyEditorProps> = ({ team, initialBudget = 8000, onDeploy }) => {
  const [armyName, setArmyName] = useState(team === 'red' ? '红方军队' : '蓝方军队');
  const [budget, setBudget] = useState(initialBudget);
  const [armyUnits, setArmyUnits] = useState<ArmyUnit[]>([]);
  const [showWarning, setShowWarning] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const totalCost = armyUnits.reduce((sum, u) => sum + u.template.cost * u.quantity, 0);

  const handleAddUnit = (template: UnitTemplate) => {
    if (budget < template.cost) {
      setShowWarning(true);
      setTimeout(() => setShowWarning(false), 2000);
      return;
    }

    setBudget(prev => prev - template.cost);
    
    const existing = armyUnits.find(u => u.template.type === template.type);
    if (existing) {
      setArmyUnits(prev =>
        prev.map(u =>
          u.template.type === template.type
            ? { ...u, quantity: u.quantity + 1 }
            : u
        )
      );
    } else {
      setArmyUnits(prev => [
        ...prev,
        { id: `${template.type}-${Date.now()}`, template, quantity: 1 }
      ]);
    }
  };

  const handleRemoveUnit = (unitId: string) => {
    const unit = armyUnits.find(u => u.id === unitId);
    if (!unit) return;

    setBudget(prev => prev + unit.template.cost);
    
    if (unit.quantity > 1) {
      setArmyUnits(prev =>
        prev.map(u =>
          u.id === unitId ? { ...u, quantity: u.quantity - 1 } : u
        )
      );
    } else {
      setArmyUnits(prev => prev.filter(u => u.id !== unitId));
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newUnits = [...armyUnits];
    const [removed] = newUnits.splice(draggedIndex, 1);
    newUnits.splice(index, 0, removed);
    setArmyUnits(newUnits);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleDeploy = () => {
    const units: UnitTemplate[] = [];
    armyUnits.forEach(u => {
      for (let i = 0; i < u.quantity; i++) {
        units.push({ ...u.template });
      }
    });
    onDeploy(units);
  };

  const StatBar = ({ label, value, maxValue, color }: { label: string; value: number; maxValue: number; color: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
      <span style={{ width: '28px', color: '#aaa' }}>{label}</span>
      <div style={{ flex: 1, height: '8px', background: '#1a1a2e', borderRadius: '4px', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${Math.min(100, (value / maxValue) * 100)}%`,
            background: color,
            borderRadius: '4px',
            transition: 'width 0.3s ease'
          }}
        />
      </div>
      <span style={{ width: '24px', textAlign: 'right', color: '#ddd' }}>{value}</span>
    </div>
  );

  const teamColor = team === 'red' ? '#e53935' : '#1e88e5';
  const teamBg = team === 'red' ? 'rgba(229, 57, 53, 0.1)' : 'rgba(30, 136, 229, 0.1)';
  const teamBorder = team === 'red' ? 'rgba(229, 57, 53, 0.3)' : 'rgba(30, 136, 229, 0.3)';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: '#16213e',
      borderRadius: '12px',
      overflow: 'hidden',
      border: `1px solid ${teamBorder}`
    }}>
      <div style={{
        padding: '16px 20px',
        background: teamBg,
        borderBottom: `1px solid ${teamBorder}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <input
          type="text"
          value={armyName}
          onChange={(e) => setArmyName(e.target.value)}
          style={{
            fontSize: '18px',
            fontWeight: 'bold',
            color: teamColor,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            padding: '4px 8px',
            borderRadius: '4px',
            cursor: 'text'
          }}
          onFocus={(e) => e.target.select()}
        />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span style={{ fontSize: '12px', color: '#888' }}>军费预算</span>
          <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#ffd700' }}>
            ¥{budget.toLocaleString()}
          </span>
        </div>
      </div>

      <div style={{
        display: 'flex',
        flex: 1,
        minHeight: 0,
        gap: '12px',
        padding: '12px'
      }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <h3 style={{ fontSize: '14px', color: '#ccc', margin: '0 0 8px 0' }}>作战单位</h3>
          <div style={{
            flex: 1,
            overflowY: 'auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '8px',
            alignContent: 'start'
          }}>
            {UNIT_TEMPLATES.map(template => {
              const canAfford = budget >= template.cost;
              return (
                <div
                  key={template.type}
                  style={{
                    background: '#1a1a2e',
                    borderRadius: '8px',
                    padding: '10px',
                    border: '1px solid #2a2a4e',
                    transition: 'all 0.2s ease',
                    opacity: canAfford ? 1 : 0.5
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: teamColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      color: 'white',
                      fontSize: '16px'
                    }}>
                      {template.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', color: '#eee', fontSize: '13px' }}>{template.name}</div>
                      <div style={{ color: '#ffd700', fontSize: '11px' }}>¥{template.cost}</div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '8px' }}>
                    <StatBar label="生命" value={template.hp} maxValue={350} color="#4caf50" />
                    <StatBar label="攻击" value={template.attack} maxValue={70} color="#f44336" />
                    <StatBar label="防御" value={template.defense} maxValue={50} color="#2196f3" />
                    <StatBar label="速度" value={template.speed} maxValue={5} color="#ff9800" />
                    <StatBar label="射程" value={template.range} maxValue={5} color="#9c27b0" />
                  </div>

                  <button
                    onClick={() => handleAddUnit(template)}
                    disabled={!canAfford}
                    style={{
                      width: '100%',
                      padding: '6px',
                      background: canAfford ? teamColor : '#555',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: canAfford ? 'pointer' : 'not-allowed',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    添加
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ width: '220px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <h3 style={{ fontSize: '14px', color: '#ccc', margin: '0 0 8px 0' }}>编队列表</h3>
          <div style={{
            flex: 1,
            overflowY: 'auto',
            background: '#1a1a2e',
            borderRadius: '8px',
            padding: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            {armyUnits.length === 0 ? (
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#555',
                fontSize: '12px'
              }}>
                点击左侧单位添加
              </div>
            ) : (
              armyUnits.map((unit, index) => (
                <div
                  key={unit.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px',
                    background: '#222244',
                    borderRadius: '6px',
                    cursor: 'move',
                    border: draggedIndex === index ? `2px solid ${teamColor}` : '1px solid #333',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: teamColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    color: 'white',
                    fontSize: '12px',
                    flexShrink: 0
                  }}>
                    {unit.template.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#eee', fontSize: '12px', fontWeight: 'bold' }}>
                      {unit.template.name}
                    </div>
                    <div style={{ color: '#888', fontSize: '10px' }}>
                      x{unit.quantity} · ¥{unit.template.cost * unit.quantity}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveUnit(unit.id)}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: '#f44336',
                      color: 'white',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '14px',
                      lineHeight: '1',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    -
                  </button>
                </div>
              ))
            )}
          </div>
          
          <div style={{
            marginTop: '8px',
            padding: '10px',
            background: '#1a1a2e',
            borderRadius: '8px',
            border: '1px solid #2a2a4e'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#888' }}>
              <span>单位总数</span>
              <span style={{ color: '#eee' }}>{armyUnits.reduce((s, u) => s + u.quantity, 0)} 个</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#888', marginTop: '4px' }}>
              <span>总消耗</span>
              <span style={{ color: '#ffd700' }}>¥{totalCost.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{
        padding: '12px 20px',
        background: '#1a1a2e',
        borderTop: '1px solid #2a2a4e',
        display: 'flex',
        justifyContent: 'center'
      }}>
        <button
          onClick={handleDeploy}
          disabled={armyUnits.length === 0}
          style={{
            padding: '10px 32px',
            background: armyUnits.length > 0 ? teamColor : '#555',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: armyUnits.length > 0 ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s ease'
          }}
        >
          部署军队 →
        </button>
      </div>

      {showWarning && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(244, 67, 54, 0.95)',
          color: 'white',
          padding: '16px 32px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: 'bold',
          zIndex: 100,
          animation: 'fadeIn 0.3s ease',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
        }}>
          军费不足！
        </div>
      )}
    </div>
  );
};

export default ArmyEditor;
