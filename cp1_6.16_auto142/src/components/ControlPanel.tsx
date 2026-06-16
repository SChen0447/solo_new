import React, { useState, useCallback } from 'react';

interface ControlPanelProps {
  selectedTool: string | null;
  onToolSelect: (tool: string | null) => void;
  onSave: () => void;
  onLoad: () => void;
  isPaused: boolean;
  onTogglePause: () => void;
  step: number;
}

interface ToolConfig {
  id: string;
  label: string;
  icon: string;
  hasCooldown?: boolean;
  cooldownTime?: number;
}

const TOOLS: ToolConfig[] = [
  { id: 'food', label: '放置食物', icon: '🍖', hasCooldown: true, cooldownTime: 5000 },
  { id: 'species', label: '引入物种', icon: '🦊' },
  { id: 'heal', label: '治愈动物', icon: '💚' },
  { id: 'disaster', label: '施放天灾', icon: '🌪️' },
  { id: 'terrain', label: '重置地形', icon: '🏔️' },
];

const buttonStyle = (isSelected: boolean, isDisabled: boolean): React.CSSProperties => ({
  padding: '8px 12px',
  backgroundColor: isSelected ? '#558B2F' : '#424242',
  color: '#E0E0E0',
  border: 'none',
  borderRadius: '6px',
  cursor: isDisabled ? 'not-allowed' : 'pointer',
  transition: 'all 0.2s ease-in-out',
  opacity: isDisabled ? 0.5 : 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '4px',
  minWidth: '90px',
  fontSize: '12px',
});

const buttonHoverStyle = (isSelected: boolean): React.CSSProperties => ({
  ...buttonStyle(isSelected, false),
  backgroundColor: '#616161',
  transform: 'scale(1.05)',
});

const ControlPanel: React.FC<ControlPanelProps> = ({
  selectedTool,
  onToolSelect,
  onSave,
  onLoad,
  isPaused,
  onTogglePause,
  step,
}) => {
  const [cooldowns, setCooldowns] = useState<Record<string, boolean>>({});
  const [hoveredTool, setHoveredTool] = useState<string | null>(null);

  const handleToolClick = useCallback((toolId: string) => {
    if (cooldowns[toolId]) return;

    if (selectedTool === toolId) {
      onToolSelect(null);
    } else {
      onToolSelect(toolId);
    }

    const tool = TOOLS.find(t => t.id === toolId);
    if (tool?.hasCooldown && tool.cooldownTime) {
      setCooldowns(prev => ({ ...prev, [toolId]: true }));
      setTimeout(() => {
        setCooldowns(prev => ({ ...prev, [toolId]: false }));
      }, tool.cooldownTime);
    }
  }, [selectedTool, onToolSelect, cooldowns]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '0 20px',
        height: '80px',
        backgroundColor: '#333333',
        borderRadius: '8px',
        boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
        marginBottom: '16px',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginRight: '20px',
          paddingRight: '20px',
          borderRight: '2px solid #444444',
        }}
      >
        <button
          onClick={onSave}
          style={{
            width: '120px',
            height: '40px',
            backgroundColor: '#607D8B',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out',
            fontSize: '14px',
            fontWeight: 'bold',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#78909C';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#607D8B';
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.95)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          💾 保存场景
        </button>
        <button
          onClick={onLoad}
          style={{
            width: '120px',
            height: '40px',
            backgroundColor: '#607D8B',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out',
            fontSize: '14px',
            fontWeight: 'bold',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#78909C';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#607D8B';
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.95)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          📂 加载场景
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginRight: '20px',
          paddingRight: '20px',
          borderRight: '2px solid #444444',
        }}
      >
        <button
          onClick={onTogglePause}
          style={{
            padding: '8px 16px',
            backgroundColor: isPaused ? '#4CAF50' : '#FF5722',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out',
            fontSize: '14px',
            fontWeight: 'bold',
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.95)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {isPaused ? '▶️ 继续' : '⏸️ 暂停'}
        </button>
        <span style={{ color: '#BDBDBD', fontSize: '14px' }}>
          步数: <strong style={{ color: '#E0E0E0' }}>{step}</strong>
        </span>
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        {TOOLS.map((tool) => {
          const isSelected = selectedTool === tool.id;
          const isDisabled = cooldowns[tool.id] || false;
          const isHovered = hoveredTool === tool.id;

          return (
            <button
              key={tool.id}
              onClick={() => handleToolClick(tool.id)}
              style={isHovered ? buttonHoverStyle(isSelected) : buttonStyle(isSelected, isDisabled)}
              onMouseEnter={() => setHoveredTool(tool.id)}
              onMouseLeave={() => setHoveredTool(null)}
              onMouseDown={(e) => {
                if (!isDisabled) {
                  e.currentTarget.style.transform = 'scale(0.95)';
                }
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = isHovered ? 'scale(1.05)' : 'scale(1)';
              }}
              disabled={isDisabled}
            >
              <span style={{ fontSize: '20px' }}>{tool.icon}</span>
              <span>{tool.label}</span>
              {cooldowns[tool.id] && (
                <span style={{ fontSize: '10px', color: '#FF9800' }}>冷却中...</span>
              )}
            </button>
          );
        })}
      </div>

      {selectedTool && (
        <span
          style={{
            marginLeft: '20px',
            padding: '4px 12px',
            backgroundColor: '#558B2F',
            color: '#FFFFFF',
            borderRadius: '4px',
            fontSize: '12px',
          }}
        >
          已选择: {TOOLS.find(t => t.id === selectedTool)?.label}，点击地图格子使用
        </span>
      )}
    </div>
  );
};

export default ControlPanel;
