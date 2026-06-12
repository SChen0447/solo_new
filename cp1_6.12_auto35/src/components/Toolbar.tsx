import React, { useState } from 'react';
import { DeviceType } from '../types';

interface ToolbarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const deviceItems: { type: DeviceType; label: string; icon: string; color: string }[] = [
  { type: 'pc', label: 'PC', icon: '🖥️', color: '#3b82f6' },
  { type: 'router', label: '路由器', icon: '📡', color: '#8b5cf6' },
];

export const Toolbar: React.FC<ToolbarProps> = ({ collapsed = false, onToggleCollapse }) => {
  const [hoveredType, setHoveredType] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, type: DeviceType) => {
    e.dataTransfer.setData('deviceType', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  if (collapsed) {
    return (
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: 0,
          transform: 'translateY(-50%)',
          zIndex: 200,
          background: 'linear-gradient(180deg, #1e3a5f 0%, #0f172a 100%)',
          borderRadius: '0 12px 12px 0',
          padding: '8px 6px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
          boxShadow: '4px 0 12px rgba(0,0,0,0.15)',
        }}
      >
        <button
          onClick={onToggleCollapse}
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            fontSize: '16px',
            padding: '4px',
          }}
          title="展开工具栏"
        >
          ▶
        </button>
        {deviceItems.map((item) => (
          <div
            key={item.type}
            draggable
            onDragStart={(e) => handleDragStart(e, item.type)}
            style={{
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.1)',
              cursor: 'grab',
              fontSize: '18px',
              transition: 'all 0.2s',
            }}
            title={item.label}
          >
            {item.icon}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      style={{
        width: 88,
        minWidth: 88,
        height: '100%',
        background: 'linear-gradient(180deg, #1e3a5f 0%, #0f172a 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '16px 0',
        boxShadow: '4px 0 12px rgba(0,0,0,0.1)',
        position: 'relative',
        zIndex: 10,
      }}
    >
      <div
        style={{
          fontSize: '11px',
          fontWeight: 700,
          color: '#94a3b8',
          letterSpacing: '1px',
          marginBottom: '20px',
          textTransform: 'uppercase',
        }}
      >
        设备
      </div>

      {deviceItems.map((item) => (
        <div
          key={item.type}
          draggable
          onDragStart={(e) => handleDragStart(e, item.type)}
          onMouseEnter={() => setHoveredType(item.type)}
          onMouseLeave={() => setHoveredType(null)}
          style={{
            width: 64,
            padding: '12px 0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            borderRadius: '12px',
            background: hoveredType === item.type
              ? 'rgba(255,255,255,0.15)'
              : 'rgba(255,255,255,0.05)',
            cursor: 'grab',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            marginBottom: '8px',
            border: `2px solid ${hoveredType === item.type ? item.color : 'transparent'}`,
            transform: hoveredType === item.type ? 'scale(1.05)' : 'scale(1)',
            boxShadow: hoveredType === item.type
              ? `0 4px 12px ${item.color}40`
              : 'none',
          }}
        >
          <div style={{ fontSize: '28px', lineHeight: 1 }}>{item.icon}</div>
          <div
            style={{
              fontSize: '10px',
              fontWeight: 600,
              color: hoveredType === item.type ? '#ffffff' : '#94a3b8',
              transition: 'color 0.2s',
            }}
          >
            {item.label}
          </div>
        </div>
      ))}

      <div
        style={{
          width: 48,
          height: 1,
          background: 'rgba(255,255,255,0.1)',
          margin: '16px 0',
        }}
      />

      <div
        style={{
          padding: '8px 10px',
          borderRadius: '8px',
          background: 'rgba(255,255,255,0.05)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '9px', color: '#64748b', lineHeight: 1.6 }}>
          拖拽设备<br />到画布创建
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          style={{
            background: 'none',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            fontSize: '14px',
            padding: '8px',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = '#64748b';
          }}
          title="折叠工具栏"
        >
          ◀
        </button>
      )}
    </div>
  );
};
