import React, { useState, useCallback, useRef } from 'react';
import { StyleType } from './styleRenderer';
import { BrushSize, BrushShape } from './drawingTool';
import { Layer } from './layerManager';

const STYLE_META: { type: StyleType; name: string; icon: string; colors: string[] }[] = [
  { type: 'hiphop', name: '嘻哈喷漆', icon: '🎨', colors: ['#ff3366', '#ff9f00', '#00e5ff', '#a855f7'] },
  { type: 'pop', name: '波普漫画', icon: '💥', colors: ['#ff1744', '#00e676', '#2979ff', '#ffd600'] },
  { type: 'watercolor', name: '水彩晕染', icon: '💧', colors: ['#ff6b9d', '#4db8ff', '#ffd93d', '#6bcB77'] },
  { type: 'neon', name: '霓虹赛博', icon: '✨', colors: ['#00fff0', '#ff00ff', '#ffff00', '#00ff00'] }
];

const COLOR_PALETTE = [
  '#ff3366', '#ff9f00', '#ffd600', '#00e676', '#00e5ff',
  '#2979ff', '#a855f7', '#ff00ff', '#ffffff', '#1a1a2e'
];

const BRUSH_SHAPES: { shape: BrushShape; name: string; icon: string }[] = [
  { shape: 'line', name: '线条', icon: '✏️' },
  { shape: 'arrow', name: '箭头', icon: '➡️' },
  { shape: 'star', name: '星形', icon: '⭐' },
  { shape: 'bubble', name: '气泡', icon: '💬' }
];

interface UploadAreaProps {
  onFileUpload: (file: File) => void;
  errorMessage?: string | null;
}

export const UploadArea: React.FC<UploadAreaProps> = ({ onFileUpload, errorMessage }) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFileUpload(file);
  }, [onFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  return (
    <div style={{ padding: '16px 0' }}>
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{
          width: '280px',
          height: '280px',
          background: isDragging ? '#2a2a4e' : '#2a2a3e',
          borderRadius: '12px',
          border: `2px dashed ${isDragging ? '#00e5ff' : '#3a3a5a'}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          transform: isDragging ? 'scale(1.02)' : 'scale(1)',
          boxShadow: isDragging ? '0 0 20px rgba(0, 229, 255, 0.3)' : 'none'
        }}
      >
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>📷</div>
        <div style={{ color: '#a0a0c0', fontSize: '14px', marginBottom: '8px' }}>
          拖拽或点击上传照片
        </div>
        <div style={{ color: '#606080', fontSize: '12px' }}>
          支持 JPG / PNG，最大 8MB
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileUpload(file);
        }}
      />
      {errorMessage && (
        <div style={{
          color: '#ff3366',
          fontSize: '12px',
          marginTop: '8px',
          padding: '6px 10px',
          background: 'rgba(255, 51, 102, 0.1)',
          borderRadius: '6px',
          border: '1px solid rgba(255, 51, 102, 0.3)'
        }}>
          {errorMessage}
        </div>
      )}
    </div>
  );
};

interface ThresholdSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}

export const ThresholdSlider: React.FC<ThresholdSliderProps> = ({
  label, value, min, max, step, onChange
}) => {
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '6px',
        fontSize: '13px',
        color: '#c0c0e0'
      }}>
        <span>{label}</span>
        <span style={{ color: '#00e5ff', fontFamily: 'monospace' }}>{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: '100%',
          height: '6px',
          borderRadius: '3px',
          background: 'linear-gradient(to right, #00d4aa, #00e5ff)',
          appearance: 'none',
          outline: 'none',
          cursor: 'pointer',
          transition: 'all 0.3s ease'
        }}
      />
      <style>{`
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #00e5ff;
          cursor: pointer;
          box-shadow: 0 0 10px rgba(0, 229, 255, 0.6);
          border: 2px solid #0d0d1a;
          transition: all 0.3s ease;
        }
        input[type=range]::-webkit-slider-thumb:hover {
          transform: scale(1.15);
          box-shadow: 0 0 15px rgba(0, 229, 255, 0.9);
        }
        input[type=range]::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #00e5ff;
          cursor: pointer;
          box-shadow: 0 0 10px rgba(0, 229, 255, 0.6);
          border: 2px solid #0d0d1a;
        }
      `}</style>
    </div>
  );
};

interface StyleSelectorProps {
  selected: StyleType;
  onSelect: (style: StyleType) => void;
  onRegenerate: () => void;
  disabled?: boolean;
}

export const StyleSelector: React.FC<StyleSelectorProps> = ({
  selected, onSelect, onRegenerate, disabled
}) => {
  return (
    <div style={{ marginTop: '16px' }}>
      <div style={{
        fontSize: '14px',
        fontWeight: 600,
        color: '#e0e0ff',
        marginBottom: '12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>🎭 涂鸦风格</span>
        <button
          onClick={onRegenerate}
          disabled={disabled}
          title="重新生成"
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            background: '#2a2a4a',
            border: '1px solid #4a4a6a',
            color: '#c0c0e0',
            cursor: disabled ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            transition: 'all 0.3s ease',
            opacity: disabled ? 0.5 : 1
          }}
          onMouseEnter={(e) => {
            if (!disabled) {
              e.currentTarget.style.background = '#3a3a5a';
              e.currentTarget.style.transform = 'rotate(45deg)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#2a2a4a';
            e.currentTarget.style.transform = 'rotate(0deg)';
          }}
        >
          🔄
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
        {STYLE_META.map((style) => (
          <button
            key={style.type}
            onClick={() => onSelect(style.type)}
            disabled={disabled}
            style={{
              padding: '10px',
              borderRadius: '10px',
              background: selected === style.type
                ? 'linear-gradient(135deg, rgba(0, 229, 255, 0.15), rgba(168, 85, 247, 0.15))'
                : '#1e1e2e',
              border: selected === style.type
                ? '2px solid #00e5ff'
                : '1px solid #3a3a5a',
              cursor: disabled ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              opacity: disabled ? 0.5 : 1,
              boxShadow: selected === style.type
                ? '0 0 15px rgba(0, 229, 255, 0.3)'
                : 'none'
            }}
            onMouseEnter={(e) => {
              if (!disabled && selected !== style.type) {
                e.currentTarget.style.borderColor = '#5a5a8a';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              if (selected !== style.type) {
                e.currentTarget.style.borderColor = '#3a3a5a';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            <div style={{ fontSize: '22px', marginBottom: '6px' }}>{style.icon}</div>
            <div style={{ fontSize: '12px', color: '#e0e0ff', fontWeight: 500, marginBottom: '6px' }}>
              {style.name}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
              {style.colors.map((c, i) => (
                <div key={i} style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  background: c,
                  boxShadow: `0 0 6px ${c}80`
                }} />
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

interface BrushControlsProps {
  brushSize: BrushSize;
  brushColor: string;
  brushShape: BrushShape;
  onSizeChange: (size: BrushSize) => void;
  onColorChange: (color: string) => void;
  onShapeChange: (shape: BrushShape) => void;
  onUndo: () => void;
  canUndo: boolean;
  onHistoryPreview?: (index: number | null) => void;
}

export const BrushControls: React.FC<BrushControlsProps> = ({
  brushSize, brushColor, brushShape,
  onSizeChange, onColorChange, onShapeChange,
  onUndo, canUndo, onHistoryPreview
}) => {
  const sizes: BrushSize[] = [2, 4, 6];
  const sizeMap = { 2: 24, 4: 32, 6: 40 };

  return (
    <div style={{ padding: '12px' }}>
      <div style={{ fontSize: '14px', fontWeight: 600, color: '#e0e0ff', marginBottom: '14px' }}>
        ✏️ 手绘工具
      </div>

      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '12px', color: '#a0a0c0', marginBottom: '8px' }}>画笔形状</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
          {BRUSH_SHAPES.map(({ shape, name, icon }) => (
            <button
              key={shape}
              onClick={() => onShapeChange(shape)}
              title={name}
              style={{
                padding: '8px 4px',
                borderRadius: '8px',
                background: brushShape === shape ? '#3a3a6a' : '#2a2a4a',
                border: brushShape === shape ? '1px solid #00d4aa' : '1px solid #3a3a5a',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontSize: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                if (brushShape !== shape) {
                  e.currentTarget.style.background = '#3a3a5a';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }
              }}
              onMouseLeave={(e) => {
                if (brushShape !== shape) {
                  e.currentTarget.style.background = '#2a2a4a';
                  e.currentTarget.style.transform = 'scale(1)';
                }
              }}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '12px', color: '#a0a0c0', marginBottom: '8px' }}>画笔粗细</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: '8px' }}>
          {sizes.map((size) => {
            const isSelected = brushSize === size;
            return (
              <button
                key={size}
                onClick={() => onSizeChange(size)}
                style={{
                  width: `${sizeMap[size]}px`,
                  height: `${sizeMap[size]}px`,
                  borderRadius: '50%',
                  background: '#2a2a4a',
                  border: isSelected ? '2px solid #00d4aa' : '1px solid #3a3a5a',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease',
                  boxShadow: isSelected ? '0 0 10px rgba(0, 212, 170, 0.5)' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.borderColor = '#5a5a8a';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.borderColor = '#3a3a5a';
                  }
                }}
              >
                <div style={{
                  width: `${size * 2}px`,
                  height: `${size * 2}px`,
                  borderRadius: '50%',
                  background: brushColor
                }} />
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '12px', color: '#a0a0c0', marginBottom: '8px' }}>
          颜色 <span style={{ color: brushColor }}>■</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
          {COLOR_PALETTE.map((color) => {
            const isSelected = brushColor === color;
            return (
              <button
                key={color}
                onClick={() => onColorChange(color)}
                style={{
                  width: '28px',
                  height: '28px',
                  padding: 0,
                  borderRadius: '6px',
                  background: color,
                  border: isSelected ? '2px solid #ffffff' : '1px solid #3a3a5a',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: isSelected ? `0 0 10px ${color}aa` : 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.transform = 'scale(1.15)';
                    e.currentTarget.style.boxShadow = `0 0 8px ${color}aa`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              />
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={onUndo}
          disabled={!canUndo}
          onMouseDown={() => onHistoryPreview?.(0)}
          onMouseUp={() => onHistoryPreview?.(null)}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: '#3a3a4a',
            border: 'none',
            color: canUndo ? '#ffffff' : '#6a6a8a',
            cursor: canUndo ? 'pointer' : 'not-allowed',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
            boxShadow: canUndo ? '0 2px 8px rgba(0, 0, 0, 0.3)' : 'none'
          }}
          title={canUndo ? '撤销 (按住查看历史)' : '无历史记录'}
          onMouseEnter={(e) => {
            if (canUndo) {
              e.currentTarget.style.background = '#4a4a6a';
              e.currentTarget.style.transform = 'scale(1.1)';
            }
          }}
          onMouseLeave={(e) => {
            onHistoryPreview?.(null);
            e.currentTarget.style.background = '#3a3a4a';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          ←
        </button>
      </div>
    </div>
  );
};

interface LayerPanelProps {
  layers: Layer[];
  onVisibleChange: (id: string, visible: boolean) => void;
  onOpacityChange: (id: string, opacity: number) => void;
}

const LAYER_ICONS: Record<string, string> = {
  edge: '📐',
  style: '🎨',
  drawing: '✏️'
};

export const LayerPanel: React.FC<LayerPanelProps> = ({
  layers, onVisibleChange, onOpacityChange
}) => {
  return (
    <div style={{ marginTop: '16px' }}>
      <div style={{ fontSize: '14px', fontWeight: 600, color: '#e0e0ff', marginBottom: '12px' }}>
        📚 图层管理
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {[...layers].reverse().map((layer) => (
          <div
            key={layer.id}
            style={{
              padding: '10px',
              borderRadius: '8px',
              background: layer.visible ? '#2a2a4a' : '#1e1e30',
              border: `1px solid ${layer.visible ? '#4a4a6a' : '#3a3a4a'}`,
              transition: 'all 0.3s ease'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>{LAYER_ICONS[layer.id] || '📄'}</span>
                <span style={{
                  fontSize: '12px',
                  color: layer.visible ? '#e0e0ff' : '#7a7a9a',
                  fontWeight: 500
                }}>
                  {layer.name}
                </span>
              </div>
              <button
                onClick={() => onVisibleChange(layer.id, !layer.visible)}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '6px',
                  background: layer.visible ? '#3a3a6a' : '#2a2a3a',
                  border: `1px solid ${layer.visible ? '#5a5a8a' : '#3a3a5a'}`,
                  cursor: 'pointer',
                  fontSize: '12px',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {layer.visible ? '👁️' : '🙈'}
              </button>
            </div>
            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '4px',
                fontSize: '11px',
                color: '#8080a0'
              }}>
                <span>不透明度</span>
                <span style={{ color: '#00d4aa', fontFamily: 'monospace' }}>{layer.opacity}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={layer.opacity}
                onChange={(e) => onOpacityChange(layer.id, Number(e.target.value))}
                disabled={!layer.visible}
                style={{
                  width: '100%',
                  height: '4px',
                  borderRadius: '2px',
                  background: layer.visible
                    ? 'linear-gradient(to right, #00d4aa, #00e5ff)'
                    : '#3a3a4a',
                  appearance: 'none',
                  outline: 'none',
                  cursor: layer.visible ? 'pointer' : 'not-allowed'
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface ExportButtonProps {
  onExportPNG: () => void;
  onExportGIF: () => void;
  disabled?: boolean;
  isExporting?: boolean;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  onExportPNG, onExportGIF, disabled, isExporting
}) => {
  return (
    <div style={{
      display: 'flex',
      gap: '10px',
      position: 'relative',
      zIndex: 10
    }}>
      <button
        onClick={onExportPNG}
        disabled={disabled || isExporting}
        style={{
          width: '120px',
          height: '40px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, #00d4aa, #00b898)',
          border: 'none',
          color: '#ffffff',
          fontSize: '14px',
          fontWeight: 600,
          cursor: disabled || isExporting ? 'not-allowed' : 'pointer',
          transition: 'all 0.25s ease',
          boxShadow: '0 0 15px rgba(0, 212, 170, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          opacity: disabled || isExporting ? 0.6 : 1
        }}
        onMouseEnter={(e) => {
          if (!disabled && !isExporting) {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 25px rgba(0, 212, 170, 0.6)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 212, 170, 0.4)';
        }}
      >
        📥 PNG
      </button>
      <button
        onClick={onExportGIF}
        disabled={disabled || isExporting}
        style={{
          width: '120px',
          height: '40px',
          borderRadius: '8px',
          background: isExporting
            ? 'linear-gradient(135deg, #a855f7, #7c3aed)'
            : 'linear-gradient(135deg, #3a3a6a, #2a2a5a)',
          border: `1px solid ${isExporting ? '#a855f7' : '#5a5a8a'}`,
          color: '#ffffff',
          fontSize: '14px',
          fontWeight: 600,
          cursor: disabled || isExporting ? 'not-allowed' : 'pointer',
          transition: 'all 0.25s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          opacity: disabled ? 0.6 : 1,
          boxShadow: isExporting ? '0 0 20px rgba(168, 85, 247, 0.5)' : 'none'
        }}
        onMouseEnter={(e) => {
          if (!disabled && !isExporting) {
            e.currentTarget.style.borderColor = '#a855f7';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isExporting) {
            e.currentTarget.style.borderColor = '#5a5a8a';
            e.currentTarget.style.transform = 'translateY(0)';
          }
        }}
      >
        {isExporting ? (
          <span style={{ animation: 'spin 1s linear infinite' }}>⏳</span>
        ) : (
          '🎬'
        )}
        GIF
      </button>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export const SectionTitle: React.FC<{ children: React.ReactNode; icon?: string }> = ({ children, icon }) => (
  <div style={{
    fontSize: '13px',
    fontWeight: 600,
    color: '#a0a0c0',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '10px',
    paddingBottom: '8px',
    borderBottom: '1px solid #2a2a4a'
  }}>
    {icon && <span style={{ marginRight: '6px' }}>{icon}</span>}
    {children}
  </div>
);
