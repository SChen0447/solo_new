import React, { useState, useRef, useEffect } from 'react';

interface ParticlePanelProps {
  onAdd: (label: string) => void;
  onAddRandom: (count: number) => void;
}

export const ParticlePanel: React.FC<ParticlePanelProps> = ({ onAdd, onAddRandom }) => {
  const [inputValue, setInputValue] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showInput]);

  const handleAddClick = () => {
    if (!showInput) {
      setShowInput(true);
    } else if (inputValue.trim()) {
      onAdd(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      onAdd(inputValue.trim());
      setInputValue('');
    } else if (e.key === 'Escape') {
      setShowInput(false);
      setInputValue('');
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          opacity: showInput ? 1 : 0,
          width: showInput ? 'auto' : 0,
          overflow: 'hidden',
          transition: 'all 0.3s ease'
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value.substring(0, 12))}
          onKeyDown={handleKeyDown}
          placeholder="输入标签(≤12字符)"
          maxLength={12}
          style={{
            height: '36px',
            padding: '0 12px',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(0,191,255,0.5)',
            borderRadius: '8px',
            color: '#ffffff',
            fontSize: '13px',
            outline: 'none',
            width: '180px',
            backdropFilter: 'blur(10px)',
            minWidth: '0'
          }}
        />
      </div>

      <button
        onClick={handleAddClick}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={(e) => {
          setIsPressed(false);
          (e.currentTarget as HTMLButtonElement).style.background = '#00bfff';
        }}
        style={{
          height: '36px',
          padding: '0 16px',
          background: '#00bfff',
          border: 'none',
          borderRadius: '8px',
          color: '#ffffff',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          transform: isPressed ? 'scale(0.95)' : 'scale(1)',
          boxShadow: isPressed
            ? 'inset 0 2px 8px rgba(0,0,0,0.3)'
            : '0 2px 12px rgba(0,191,255,0.4)',
          minWidth: '90px',
          whiteSpace: 'nowrap'
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = '#1e90ff';
        }}
      >
        添加标签
      </button>

      <button
        onClick={() => onAddRandom(10)}
        style={{
          height: '36px',
          padding: '0 12px',
          background: 'rgba(255,0,255,0.2)',
          border: '1px solid rgba(255,0,255,0.5)',
          borderRadius: '8px',
          color: '#ff88ff',
          fontSize: '12px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          whiteSpace: 'nowrap'
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,0,255,0.35)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,0,255,0.2)';
        }}
      >
        随机+10
      </button>
    </div>
  );
};

interface ControlBarProps {
  paused: boolean;
  onTogglePause: () => void;
  onReset: () => void;
}

export const ControlBar: React.FC<ControlBarProps> = ({ paused, onTogglePause, onReset }) => {
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <button
        onClick={onTogglePause}
        onMouseEnter={() => setHoveredBtn('pause')}
        onMouseLeave={() => setHoveredBtn(null)}
        title={paused ? '恢复 (空格)' : '暂停 (空格)'}
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.2)',
          background: hoveredBtn === 'pause'
            ? 'rgba(255,255,255,0.15)'
            : 'rgba(255,255,255,0.05)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
          backdropFilter: 'blur(10px)'
        }}
      >
        {paused ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="#00ff88">
            <polygon points="3,2 3,12 12,7" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="#ffaa00">
            <rect x="3" y="2" width="3" height="10" />
            <rect x="8" y="2" width="3" height="10" />
          </svg>
        )}
      </button>

      <button
        onClick={onReset}
        onMouseEnter={() => setHoveredBtn('reset')}
        onMouseLeave={() => setHoveredBtn(null)}
        title="重置 (R)"
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.2)',
          background: hoveredBtn === 'reset'
            ? 'rgba(255,255,255,0.15)'
            : 'rgba(255,255,255,0.05)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
          backdropFilter: 'blur(10px)'
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="#00bfff">
          <path d="M7 2a5 5 0 105 5h-2a3 3 0 11-3-3V2z" />
          <polygon points="7,0 10,3 7,6" />
        </svg>
      </button>
    </div>
  );
};

interface InfoCardProps {
  position: { x: number; y: number } | null;
  label: string;
  particleId: string;
  connections: number;
}

export const InfoCard: React.FC<InfoCardProps> = ({ position, label, particleId, connections }) => {
  if (!position) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: `${position.x + 10}px`,
        top: `${position.y + 10}px`,
        background: 'rgba(0,0,0,0.7)',
        color: '#ffffff',
        padding: '10px 14px',
        borderRadius: '8px',
        fontSize: '12px',
        pointerEvents: 'none',
        zIndex: 1000,
        border: '1px solid rgba(0,191,255,0.3)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5), 0 0 15px rgba(0,191,255,0.15)',
        backdropFilter: 'blur(8px)',
        maxWidth: '220px',
        whiteSpace: 'nowrap'
      }}
    >
      <div
        style={{
          fontSize: '14px',
          fontWeight: 700,
          color: '#00bfff',
          marginBottom: '6px',
          textShadow: '0 0 8px rgba(0,191,255,0.5)'
        }}
      >
        {label}
      </div>
      <div style={{ color: '#aaaaaa', fontSize: '11px', marginBottom: '2px' }}>
        ID: <span style={{ color: '#88ff88' }}>{particleId.substring(0, 20)}...</span>
      </div>
      <div style={{ color: '#aaaaaa', fontSize: '11px' }}>
        关联节点: <span style={{ color: '#ff88ff' }}>{connections}</span>
      </div>
    </div>
  );
};
