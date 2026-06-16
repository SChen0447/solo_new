import { useState } from 'react';
import { ColorPalette } from '../utils/colorUtils';

interface ColorPaletteListProps {
  presets: ColorPalette[];
  customPalettes: ColorPalette[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddCustom: (palette: ColorPalette) => void;
}

const COLOR_FIELDS: { key: keyof ColorPalette; label: string }[] = [
  { key: 'primary', label: '主色' },
  { key: 'secondary', label: '辅色' },
  { key: 'background', label: '背景色' },
  { key: 'text', label: '文字色' },
  { key: 'accent', label: '强调色' }
];

export default function ColorPaletteList({
  presets,
  customPalettes,
  selectedId,
  onSelect,
  onAddCustom
}: ColorPaletteListProps) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [colors, setColors] = useState({
    primary: '#3B82F6',
    secondary: '#10B981',
    background: '#FFFFFF',
    text: '#1F2937',
    accent: '#F59E0B'
  });

  const handleColorChange = (key: keyof ColorPalette, value: string) => {
    setColors(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    onAddCustom({
      id: `custom-${Date.now()}`,
      name: name.trim(),
      ...colors,
      isCustom: true
    });
    setName('');
    setColors({
      primary: '#3B82F6',
      secondary: '#10B981',
      background: '#FFFFFF',
      text: '#1F2937',
      accent: '#F59E0B'
    });
    setShowForm(false);
  };

  const allPalettes = [...presets, ...customPalettes];

  return (
    <div style={{ width: '100%' }}>
      <div
        className="scrollbar-hidden"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          overflowX: 'auto',
          padding: '12px 4px',
          paddingBottom: '16px'
        }}
      >
        {allPalettes.map(palette => {
          const isSelected = palette.id === selectedId;
          return (
            <div
              key={palette.id}
              onClick={() => onSelect(palette.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                flexShrink: 0,
                padding: '4px'
              }}
            >
              <div
                style={{
                  width: isSelected ? '48px' : '40px',
                  height: isSelected ? '48px' : '40px',
                  borderRadius: '50%',
                  background: `conic-gradient(${palette.primary} 0deg 72deg, ${palette.secondary} 72deg 144deg, ${palette.background} 144deg 216deg, ${palette.text} 216deg 288deg, ${palette.accent} 288deg 360deg)`,
                  boxShadow: isSelected
                    ? '0 0 16px #FFD700, 0 0 24px rgba(255, 215, 0, 0.5)'
                    : '0 2px 8px rgba(0,0,0,0.1)',
                  border: isSelected ? '2px solid #FFD700' : '2px solid transparent',
                  transition: 'all 0.2s ease'
                }}
              />
              <span
                style={{
                  fontSize: '12px',
                  color: isSelected ? '#374151' : '#6B7280',
                  fontWeight: isSelected ? 600 : 400,
                  whiteSpace: 'nowrap',
                  maxWidth: '64px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {palette.name}
              </span>
            </div>
          );
        })}

        <button
          onClick={() => setShowForm(v => !v)}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: '2px dashed #9CA3AF',
            background: 'transparent',
            color: '#6B7280',
            fontSize: '24px',
            cursor: 'pointer',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = '#3B82F6';
            e.currentTarget.style.color = '#3B82F6';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = '#9CA3AF';
            e.currentTarget.style.color = '#6B7280';
          }}
        >
          +
        </button>
      </div>

      {showForm && (
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #E5E7EB',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            marginTop: '8px'
          }}
        >
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', color: '#374151', marginBottom: '6px' }}>
              方案名称
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="输入方案名称..."
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #D1D5DB',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={e => (e.currentTarget.style.borderColor = '#3B82F6')}
              onBlur={e => (e.currentTarget.style.borderColor = '#D1D5DB')}
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '12px',
              marginBottom: '16px'
            }}
          >
            {COLOR_FIELDS.map(field => (
              <div key={field.key}>
                <label style={{ display: 'block', fontSize: '13px', color: '#6B7280', marginBottom: '4px' }}>
                  {field.label}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="color"
                    value={colors[field.key]}
                    onChange={e => handleColorChange(field.key, e.target.value)}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      border: '1px solid #D1D5DB',
                      cursor: 'pointer',
                      padding: '2px'
                    }}
                  />
                  <input
                    type="text"
                    value={colors[field.key]}
                    onChange={e => handleColorChange(field.key, e.target.value)}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      borderRadius: '6px',
                      border: '1px solid #D1D5DB',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                      outline: 'none',
                      textTransform: 'uppercase'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowForm(false)}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid #D1D5DB',
                background: '#FFFFFF',
                color: '#374151',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                background: '#3B82F6',
                color: '#FFFFFF',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              保存方案
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
