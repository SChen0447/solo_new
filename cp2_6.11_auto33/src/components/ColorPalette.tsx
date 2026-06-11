import React, { memo } from 'react';
import type { ColorScheme, ColorKey } from '../themeManager';

interface ColorPaletteProps {
  scheme: ColorScheme;
  onColorChange: (colorKey: ColorKey, value: string) => void;
}

const colorLabelMap: Record<ColorKey, string> = {
  primary: '主色',
  secondary: '辅色',
  background: '背景色',
  surface: '表面色',
  text: '文字色',
  textSecondary: '次要文字色',
  border: '边框色'
};

const ColorPalette: React.FC<ColorPaletteProps> = memo(({ scheme, onColorChange }) => {
  const colorEntries = Object.entries(scheme.colors) as [ColorKey, string][];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
        gap: '16px',
        padding: '20px',
        overflowY: 'auto'
      }}
    >
      {colorEntries.map(([key, value]) => (
        <div
          key={key}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer'
          }}
          title={`点击修改 ${colorLabelMap[key]}`}
        >
          <label
            style={{
              width: '100%',
              aspectRatio: '1',
              borderRadius: '8px',
              backgroundColor: value,
              border: '1px solid rgba(0,0,0,0.1)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.18)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
            }}
          >
            <input
              type="color"
              value={value}
              onChange={(e) => onColorChange(key, e.target.value)}
              style={{
                position: 'absolute',
                inset: 0,
                opacity: 0,
                cursor: 'pointer',
                border: 'none',
                padding: 0
              }}
            />
          </label>
          <div
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#374151',
              textAlign: 'center'
            }}
          >
            {colorLabelMap[key]}
          </div>
          <div
            style={{
              fontSize: '11px',
              color: '#6B7280',
              fontFamily: 'monospace',
              textAlign: 'center',
              textTransform: 'uppercase'
            }}
          >
            {value}
          </div>
        </div>
      ))}
    </div>
  );
});

ColorPalette.displayName = 'ColorPalette';

export default ColorPalette;
