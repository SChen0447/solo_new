import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { getContrastColor } from '../core/ColorPaletteEngine';
import type { Palette } from '../types';

const ChevronLeftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const ChevronUpIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="18 15 12 9 6 15" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

interface ColorSwatchProps {
  color: string;
  size?: number;
  showTooltip?: boolean;
}

const ColorSwatch: React.FC<ColorSwatchProps> = ({ color, size = 40, showTooltip = true }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      style={{
        position: 'relative',
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: color,
        border: '1px solid #666',
        borderRadius: '4px',
        cursor: 'pointer',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        transform: isHovered ? 'scale(1.1)' : 'scale(1)',
        boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.3)' : 'none',
        zIndex: isHovered ? 10 : 1,
        flexShrink: 0,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => {
        navigator.clipboard.writeText(color).catch(() => {});
      }}
      title={`点击复制: ${color}`}
    >
      {showTooltip && isHovered && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 6px)',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#1a1a1a',
            color: '#fff',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 100,
            fontFamily: 'monospace',
          }}
        >
          {color.toUpperCase()}
        </div>
      )}
    </div>
  );
};

interface PaletteCardProps {
  palette: Palette;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
}

const PaletteCard: React.FC<PaletteCardProps> = ({ palette, isSelected, onSelect }) => {
  return (
    <div
      onClick={onSelect}
      style={{
        backgroundColor: '#3a3a3a',
        borderRadius: '8px',
        padding: '12px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        border: isSelected ? '2px solid #3b82f6' : '2px solid transparent',
        transform: isSelected ? 'scale(1.02)' : 'scale(1)',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = '#454545';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = '#3a3a3a';
        }
      }}
    >
      <div
        style={{
          fontSize: '13px',
          fontWeight: 600,
          color: '#e0e0e0',
          marginBottom: '10px',
        }}
      >
        {palette.name}
      </div>
      <div
        style={{
          display: 'flex',
          gap: '6px',
          justifyContent: 'space-between',
        }}
      >
        {palette.colors.map((color, idx) => (
          <ColorSwatch key={idx} color={color} size={36} />
        ))}
      </div>
    </div>
  );
};

const UIpreview: React.FC<{ palette: Palette }> = ({ palette }) => {
  const colors = palette.colors;
  const primaryColor = colors[1];
  const secondaryColor = colors[3];
  const lightBgColor = colors[0];
  const darkColor = colors[2];
  const accentColor = colors[4];
  const textColor = getContrastColor(primaryColor);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '16px',
        backgroundColor: '#3a3a3a',
        borderRadius: '8px',
      }}
    >
      <div
        style={{
          fontSize: '14px',
          fontWeight: 600,
          color: '#e0e0e0',
        }}
      >
        UI 控件预览
      </div>

      <button
        style={{
          padding: '10px 20px',
          backgroundColor: primaryColor,
          color: textColor,
          border: 'none',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'filter 0.3s ease',
          alignSelf: 'flex-start',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.filter = 'brightness(1.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.filter = 'brightness(1)';
        }}
      >
        按钮示例
      </button>

      <div
        style={{
          backgroundColor: '#2a2a2a',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          transition: 'box-shadow 0.3s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '8px',
            backgroundColor: accentColor,
            marginBottom: '12px',
            transition: 'filter 0.3s ease',
          }}
        />
        <div
          style={{
            fontSize: '15px',
            fontWeight: 600,
            color: '#e0e0e0',
            marginBottom: '6px',
          }}
        >
          卡片标题
        </div>
        <div
          style={{
            fontSize: '13px',
            color: '#999',
            lineHeight: 1.5,
          }}
        >
          这是一个示例卡片，展示配色方案在实际 UI 中的应用效果。
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        <label
          style={{
            fontSize: '12px',
            color: '#999',
          }}
        >
          输入框
        </label>
        <input
          type="text"
          placeholder="请输入内容..."
          style={{
            padding: '10px 12px',
            backgroundColor: '#2a2a2a',
            border: `2px solid ${secondaryColor}`,
            borderRadius: '6px',
            color: '#e0e0e0',
            fontSize: '14px',
            outline: 'none',
            transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = primaryColor;
            e.target.style.boxShadow = `0 0 0 3px ${primaryColor}33`;
          }}
          onBlur={(e) => {
            e.target.style.borderColor = secondaryColor;
            e.target.style.boxShadow = 'none';
          }}
          onMouseEnter={(e) => {
            if (document.activeElement !== e.target) {
              e.target.style.borderColor = accentColor;
            }
          }}
          onMouseLeave={(e) => {
            if (document.activeElement !== e.target) {
              e.target.style.borderColor = secondaryColor;
            }
          }}
        />
      </div>
    </div>
  );
};

export const PalettePreview: React.FC = () => {
  const { palettes, selectedPaletteIndex, setSelectedPaletteIndex, isPanelCollapsed, togglePanel, isMobile } = useStore();

  if (isMobile) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
        }}
      >
        <button
          onClick={togglePanel}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#2c2c2c',
            color: '#e0e0e0',
            border: 'none',
            borderTop: '1px solid #444',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '14px',
            transition: 'background-color 0.3s ease',
          }}
        >
          {isPanelCollapsed ? <ChevronUpIcon /> : <ChevronDownIcon />}
          配色方案
        </button>
        
        <div
          style={{
            maxHeight: isPanelCollapsed ? '0' : '70vh',
            overflow: 'hidden',
            transition: 'max-height 0.3s ease',
            backgroundColor: '#2c2c2c',
          }}
        >
          <div
            style={{
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              overflowY: 'auto',
              maxHeight: '70vh',
            }}
          >
            {palettes.map((palette, index) => (
              <PaletteCard
                key={index}
                palette={palette}
                index={index}
                isSelected={selectedPaletteIndex === index}
                onSelect={() => setSelectedPaletteIndex(index)}
              />
            ))}
            
            {palettes[selectedPaletteIndex] && (
              <UIpreview palette={palettes[selectedPaletteIndex]} />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        height: '100%',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: isPanelCollapsed ? '0px' : '320px',
          overflow: 'hidden',
          transition: 'width 0.3s ease',
          backgroundColor: '#2c2c2c',
          borderLeft: isPanelCollapsed ? 'none' : '1px solid #444',
        }}
      >
        <div
          style={{
            width: '320px',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            padding: '16px',
            boxSizing: 'border-box',
            gap: '12px',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: '#e0e0e0',
              marginBottom: '4px',
            }}
          >
            推荐配色方案
          </div>
          
          <div
            style={{
              fontSize: '12px',
              color: '#888',
              marginBottom: '8px',
            }}
          >
            根据当前颜色生成 3 种互补配色方案
          </div>

          {palettes.map((palette, index) => (
            <PaletteCard
              key={index}
              palette={palette}
              index={index}
              isSelected={selectedPaletteIndex === index}
              onSelect={() => setSelectedPaletteIndex(index)}
            />
          ))}

          {palettes[selectedPaletteIndex] && (
            <UIpreview palette={palettes[selectedPaletteIndex]} />
          )}
        </div>
      </div>

      <button
        onClick={togglePanel}
        style={{
          width: '24px',
          backgroundColor: '#3a3a3a',
          border: 'none',
          color: '#e0e0e0',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'background-color 0.3s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#454545';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#3a3a3a';
        }}
        title={isPanelCollapsed ? '展开面板' : '收起面板'}
      >
        {isPanelCollapsed ? <ChevronLeftIcon /> : <ChevronRightIcon />}
      </button>
    </div>
  );
};
