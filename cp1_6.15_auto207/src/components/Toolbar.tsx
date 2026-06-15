import { useState } from 'react';
import { useNetworkStore } from '../store/useNetworkStore';
import { eventBus } from '../utils/eventBus';
import { PipeType, PIPE_NAMES, PIPE_COLORS } from '../types';

const PIPE_TYPES: { type: PipeType; name: string; color: string }[] = [
  { type: 'drainage', name: PIPE_NAMES.drainage, color: PIPE_COLORS.drainage },
  { type: 'gas', name: PIPE_NAMES.gas, color: PIPE_COLORS.gas },
  { type: 'power', name: PIPE_NAMES.power, color: PIPE_COLORS.power },
  { type: 'communication', name: PIPE_NAMES.communication, color: PIPE_COLORS.communication },
];

export function Toolbar() {
  const visibleTypes = useNetworkStore((state) => state.visibleTypes);
  const viewMode = useNetworkStore((state) => state.viewMode);
  const setViewMode = useNetworkStore((state) => state.setViewMode);
  const [pressedItem, setPressedItem] = useState<string | null>(null);

  const handleFilterChange = (type: PipeType, checked: boolean) => {
    eventBus.emit('FILTER_TYPE', { type, visible: checked });
  };

  const handleMouseDown = (id: string) => {
    setPressedItem(id);
    setTimeout(() => setPressedItem(null), 100);
  };

  const handleViewChange = (mode: 'top' | 'profile') => {
    eventBus.emit('VIEW_CHANGE', mode);
    setViewMode(mode);
  };

  return (
    <div style={toolbarStyle}>
      <div style={headerStyle}>
        <span style={logoStyle}>🔧 管网监控</span>
      </div>
      <div style={dividerStyle} />

      <div style={sectionTitleStyle}>管线类型</div>

      {PIPE_TYPES.map((item) => (
        <label
          key={item.type}
          style={{
            ...checkboxContainerStyle,
            transform: pressedItem === item.type ? 'scale(0.95)' : 'scale(1)',
            transition: 'transform 0.1s ease',
          }}
          onMouseDown={() => handleMouseDown(item.type)}
        >
          <div style={checkboxWrapperStyle}>
            <input
              type="checkbox"
              checked={visibleTypes[item.type]}
              onChange={(e) => handleFilterChange(item.type, e.target.checked)}
              style={checkboxStyle}
            />
            <div
              style={{
                ...customCheckboxStyle,
                borderColor: visibleTypes[item.type] ? item.color : '#37474f',
                backgroundColor: visibleTypes[item.type] ? item.color : 'transparent',
              }}
            >
              {visibleTypes[item.type] && <span style={checkMarkStyle}>✓</span>}
            </div>
          </div>
          <div style={colorDotStyle(item.color)} />
          <span style={labelStyle}>{item.name}</span>
        </label>
      ))}

      <div style={dividerStyle} />

      <div style={sectionTitleStyle}>视角切换</div>

      <button
        style={{
          ...buttonStyle,
          transform: pressedItem === 'top' ? 'scale(0.95)' : 'scale(1)',
          backgroundColor: viewMode === 'top' ? '#29b6f6' : '#1a2332',
          transition: 'all 0.1s ease',
        }}
        onClick={() => handleViewChange('top')}
        onMouseDown={() => handleMouseDown('top')}
      >
        📐 俯视图 (N)
      </button>

      <button
        style={{
          ...buttonStyle,
          transform: pressedItem === 'profile' ? 'scale(0.95)' : 'scale(1)',
          backgroundColor: viewMode === 'profile' ? '#29b6f6' : '#1a2332',
          transition: 'all 0.1s ease',
        }}
        onClick={() => handleViewChange('profile')}
        onMouseDown={() => handleMouseDown('profile')}
      >
        📏 剖面图 (P)
      </button>

      <div style={dividerStyle} />

      <div style={hintStyle}>
        <div style={hintTitleStyle}>操作提示</div>
        <div style={hintItemStyle}>🖱️ 拖拽旋转场景</div>
        <div style={hintItemStyle}>🔍 滚轮缩放</div>
        <div style={hintItemStyle}>👆 点击查看详情</div>
      </div>

      <style>{`
        *::-webkit-scrollbar {
          width: 4px;
        }
        *::-webkit-scrollbar-track {
          background: transparent;
        }
        *::-webkit-scrollbar-thumb {
          background: #37474f;
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}

const toolbarStyle: React.CSSProperties = {
  position: 'fixed',
  top: '20px',
  left: '20px',
  width: '200px',
  background: 'rgba(26, 35, 50, 0.9)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  borderRadius: '0px',
  border: '1px solid rgba(41, 182, 246, 0.3)',
  color: '#e0e0e0',
  padding: '16px',
  zIndex: 100,
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

const headerStyle: React.CSSProperties = {
  marginBottom: '12px',
};

const logoStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 600,
  color: '#29b6f6',
};

const dividerStyle: React.CSSProperties = {
  height: '1px',
  background: 'rgba(41, 182, 246, 0.2)',
  margin: '12px 0',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#8899aa',
  textTransform: 'uppercase',
  letterSpacing: '1px',
  marginBottom: '12px',
  marginTop: '8px',
};

const checkboxContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  height: '40px',
  padding: '0 12px',
  borderRadius: '6px',
  cursor: 'pointer',
  transition: 'background-color 0.2s ease',
  userSelect: 'none',
};

const checkboxWrapperStyle: React.CSSProperties = {
  position: 'relative',
  marginRight: '12px',
};

const checkboxStyle: React.CSSProperties = {
  position: 'absolute',
  opacity: 0,
  cursor: 'pointer',
  width: '16px',
  height: '16px',
};

const customCheckboxStyle: React.CSSProperties = {
  width: '16px',
  height: '16px',
  border: '2px solid',
  borderRadius: '3px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s ease',
};

const checkMarkStyle: React.CSSProperties = {
  color: '#fff',
  fontSize: '11px',
  fontWeight: 'bold',
};

const colorDotStyle = (color: string): React.CSSProperties => ({
  width: '10px',
  height: '10px',
  borderRadius: '50%',
  backgroundColor: color,
  marginRight: '10px',
  boxShadow: `0 0 8px ${color}50`,
});

const labelStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#e0e0e0',
};

const buttonStyle: React.CSSProperties = {
  width: '100%',
  height: '40px',
  border: '1px solid rgba(41, 182, 246, 0.3)',
  borderRadius: '6px',
  color: '#e0e0e0',
  fontSize: '14px',
  cursor: 'pointer',
  marginBottom: '8px',
  fontWeight: 500,
};

const hintStyle: React.CSSProperties = {
  marginTop: '8px',
};

const hintTitleStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#8899aa',
  marginBottom: '8px',
};

const hintItemStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#667788',
  padding: '4px 0',
};
