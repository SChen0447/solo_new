import React from 'react';
import { useSimulationStore } from '../store/useSimulationStore';

interface ControlPanelProps {
  onMix: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ onMix }) => {
  const { fireAmount, waterAmount, setFireAmount, setWaterAmount, isSimulating } = useSimulationStore();

  const handleMix = () => {
    if (!isSimulating) {
      onMix();
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        padding: '24px',
        background: 'rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(8px)',
        borderRadius: '8px',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}
    >
      <h3 style={{ margin: 0, fontSize: '18px', color: '#ff6b35' }}>材料控制面板</h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ fontSize: '14px', color: '#ff6b35', fontWeight: 'bold' }}>
            🔥 火焰结晶
          </label>
          <span style={{ fontSize: '14px', color: '#fff', minWidth: '60px', textAlign: 'right' }}>
            {fireAmount}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={fireAmount}
          onChange={(e) => setFireAmount(Number(e.target.value))}
          disabled={isSimulating}
          style={{
            width: '200px',
            height: '4px',
            appearance: 'none',
            background: '#555',
            borderRadius: '2px',
            outline: 'none',
            cursor: isSimulating ? 'not-allowed' : 'pointer',
            opacity: isSimulating ? 0.5 : 1
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ fontSize: '14px', color: '#3b82f6', fontWeight: 'bold' }}>
            💧 水之精华
          </label>
          <span style={{ fontSize: '14px', color: '#fff', minWidth: '60px', textAlign: 'right' }}>
            {waterAmount}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={waterAmount}
          onChange={(e) => setWaterAmount(Number(e.target.value))}
          disabled={isSimulating}
          style={{
            width: '200px',
            height: '4px',
            appearance: 'none',
            background: '#555',
            borderRadius: '2px',
            outline: 'none',
            cursor: isSimulating ? 'not-allowed' : 'pointer',
            opacity: isSimulating ? 0.5 : 1
          }}
        />
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '12px',
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '8px',
          fontSize: '12px'
        }}
      >
        <span style={{ color: '#aaa' }}>配比:</span>
        <span style={{ color: '#fff', fontWeight: 'bold' }}>
          {Math.round(fireAmount)} : {Math.round(waterAmount)}
        </span>
      </div>

      <button
        onClick={handleMix}
        disabled={isSimulating}
        style={{
          padding: '14px 24px',
          fontSize: '16px',
          fontWeight: 'bold',
          color: '#fff',
          background: isSimulating
            ? '#ffaa33'
            : 'linear-gradient(135deg, #ff6b35 0%, #ff8533 100%)',
          border: 'none',
          borderRadius: '8px',
          cursor: isSimulating ? 'not-allowed' : 'pointer',
          opacity: isSimulating ? 0.5 : 1,
          transition: 'all 0.15s ease',
          transform: isSimulating ? 'scale(1)' : 'scale(1)',
          letterSpacing: '2px'
        }}
        onMouseDown={(e) => {
          if (!isSimulating) {
            e.currentTarget.style.transform = 'scale(0.95)';
            e.currentTarget.style.background = '#ffaa33';
          }
        }}
        onMouseUp={(e) => {
          if (!isSimulating) {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.background = 'linear-gradient(135deg, #ff6b35 0%, #ff8533 100%)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isSimulating) {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.background = 'linear-gradient(135deg, #ff6b35 0%, #ff8533 100%)';
          }
        }}
      >
        {isSimulating ? '✨ 能量释放中...' : '⚗️ 开始混合'}
      </button>
    </div>
  );
};
