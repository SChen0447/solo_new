import React from 'react';
import { useSimulationStore } from '../store/useSimulationStore';
import type { EnergyType, HistoryRecord } from '../types';

const energyTypeIcons: Record<EnergyType, string> = {
  explosion: '💥',
  jet: '💧',
  pillar: '✨',
  shockwave: '🌊'
};

const energyTypeNames: Record<EnergyType, string> = {
  explosion: '爆炸',
  jet: '喷射',
  pillar: '光柱',
  shockwave: '冲击波'
};

export const HistoryPanel: React.FC = () => {
  const { history, loadHistoryRecord } = useSimulationStore();

  const handleRecordClick = (record: HistoryRecord) => {
    loadHistoryRecord(record);
  };

  return (
    <div
      style={{
        background: '#1a1a2e',
        borderRadius: '8px',
        padding: '16px',
        border: '1px solid #333',
        height: '200px',
        overflowY: 'auto'
      }}
    >
      <h3
        style={{
          margin: '0 0 12px 0',
          fontSize: '16px',
          color: '#ff6b35',
          textAlign: 'center',
          position: 'sticky',
          top: 0,
          background: '#1a1a2e',
          paddingBottom: '8px',
          borderBottom: '1px solid #333'
        }}
      >
        历史记录
      </h3>

      {history.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            color: '#666',
            fontSize: '12px',
            padding: '20px 0'
          }}
        >
          暂无记录<br />
          开始混合以生成记录
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {history.map((record, index) => (
            <div
              key={record.id}
              onClick={() => handleRecordClick(record)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                border: '1px solid transparent'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 107, 53, 0.1)';
                e.currentTarget.style.borderColor = '#ff6b35';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.borderColor = 'transparent';
              }}
            >
              <span style={{ fontSize: '20px' }}>{energyTypeIcons[record.energyType]}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '4px'
                  }}
                >
                  <span style={{ fontSize: '12px', color: '#fff', fontWeight: 'bold' }}>
                    #{history.length - index} {energyTypeNames[record.energyType]}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      color: '#ff6b35',
                      fontWeight: 'bold'
                    }}
                  >
                    {record.totalScore}分
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#888' }}>
                  配比: {Math.round(record.fireRatio)}:{Math.round(record.waterRatio)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
