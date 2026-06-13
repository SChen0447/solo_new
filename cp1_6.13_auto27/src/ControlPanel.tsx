import React, { useRef, useCallback, useEffect, useState } from 'react';
import { useStore, Exhibit } from './Store';

interface ControlPanelProps {
  visible: boolean;
  onClose: () => void;
}

const ColorWheel: React.FC<{
  color: string;
  onChange: (hex: string) => void;
}> = ({ color, onChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const size = 200;
    const cx = size / 2;
    const cy = size / 2;
    const outerR = size / 2 - 4;
    const innerR = outerR - 30;

    ctx.clearRect(0, 0, size, size);

    for (let angle = 0; angle < 360; angle++) {
      const startAngle = (angle - 1) * Math.PI / 180;
      const endAngle = (angle + 1) * Math.PI / 180;
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, startAngle, endAngle);
      ctx.arc(cx, cy, innerR, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = `hsl(${angle}, 80%, 55%)`;
      ctx.fill();
    }

    const innerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, innerR - 4);
    innerGrad.addColorStop(0, '#ffffff');
    innerGrad.addColorStop(0.5, color);
    innerGrad.addColorStop(1, '#000000');
    ctx.beginPath();
    ctx.arc(cx, cy, innerR - 4, 0, Math.PI * 2);
    ctx.fillStyle = innerGrad;
    ctx.fill();

    const angle = parseInt(color.slice(1), 16);
    ctx.strokeStyle = '#D4AF7B';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, (outerR + innerR) / 2, 0, Math.PI * 2);
    ctx.stroke();
  }, [color]);

  useEffect(() => { drawWheel(); }, [drawWheel]);

  const pickColor = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ctx = canvas.getContext('2d')!;
    const pixel = ctx.getImageData(x * (canvas.width / rect.width), y * (canvas.height / rect.height), 1, 1).data;
    if (pixel[3] === 0) return;
    const hex = '#' + [pixel[0], pixel[1], pixel[2]].map(v => v.toString(16).padStart(2, '0')).join('');
    onChange(hex);
  }, [onChange]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    pickColor(e);
  }, [pickColor]);

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const ctx = canvas.getContext('2d')!;
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const pixel = ctx.getImageData(x * scaleX, y * scaleY, 1, 1).data;
      if (pixel[3] === 0) return;
      const hex = '#' + [pixel[0], pixel[1], pixel[2]].map(v => v.toString(16).padStart(2, '0')).join('');
      onChange(hex);
    };
    const handleUp = () => setIsDragging(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isDragging, onChange]);

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={200}
      onMouseDown={handleMouseDown}
      style={{
        width: 200,
        height: 200,
        cursor: 'crosshair',
        borderRadius: '50%',
        border: '2px solid rgba(0,0,0,0.06)',
      }}
    />
  );
};

const ControlPanel: React.FC<ControlPanelProps> = ({ visible, onClose }) => {
  const selectedExhibitId = useStore(s => s.selectedExhibitId);
  const exhibits = useStore(s => s.exhibits);
  const updateExhibitLight = useStore(s => s.updateExhibitLight);
  const updateExhibitLabel = useStore(s => s.updateExhibitLabel);
  const addLabelToExhibit = useStore(s => s.addLabelToExhibit);
  const removeExhibit = useStore(s => s.removeExhibit);
  const selectExhibit = useStore(s => s.selectExhibit);
  const isCurationMode = useStore(s => s.isCurationMode);

  const exhibit = exhibits.find(e => e.id === selectedExhibitId) as Exhibit | undefined;

  const handleColorChange = useCallback((hex: string) => {
    if (exhibit) updateExhibitLight(exhibit.id, { color: hex });
  }, [exhibit, updateExhibitLight]);

  const handleIntensityChange = useCallback((val: number) => {
    if (exhibit) updateExhibitLight(exhibit.id, { intensity: val / 100 * 2.5 });
  }, [exhibit, updateExhibitLight]);

  const handleDelete = useCallback(() => {
    if (exhibit) {
      removeExhibit(exhibit.id);
      selectExhibit(null);
    }
  }, [exhibit, removeExhibit, selectExhibit]);

  const handleToggleLabel = useCallback(() => {
    if (exhibit) {
      if (exhibit.label?.visible) {
        updateExhibitLabel(exhibit.id, { visible: false });
      } else {
        addLabelToExhibit(exhibit.id);
      }
    }
  }, [exhibit, updateExhibitLabel, addLabelToExhibit]);

  const handleLabelTextChange = useCallback((text: string) => {
    if (exhibit) updateExhibitLabel(exhibit.id, { text });
  }, [exhibit, updateExhibitLabel]);

  const handleLabelBgColorChange = useCallback((backgroundColor: string) => {
    if (exhibit) updateExhibitLabel(exhibit.id, { backgroundColor });
  }, [exhibit, updateExhibitLabel]);

  if (!visible || !exhibit) return null;

  const intensityPercent = Math.round((exhibit.light.intensity / 2.5) * 100);

  return (
    <div
      className="label-fade-in"
      style={{
        position: 'absolute',
        top: 80,
        right: 16,
        bottom: 88,
        width: 320,
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(18px) saturate(140%)',
        WebkitBackdropFilter: 'blur(18px) saturate(140%)',
        borderRadius: 20,
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '-4px 0 32px rgba(30,25,20,0.06)',
        zIndex: 150,
        overflowY: 'auto',
        overflowX: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{
        padding: '20px 20px 16px',
        borderBottom: '1px solid rgba(0,0,0,0.04)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 18,
            fontWeight: 600,
            color: '#2A2724',
            lineHeight: 1.3,
          }}>
            {exhibit.name}
          </div>
          <div style={{ fontSize: 12, color: '#9A948E', marginTop: 2 }}>
            {exhibit.type === 'sculpture' ? '雕塑' : '画作'}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            border: '1px solid rgba(0,0,0,0.06)',
            background: 'rgba(255,255,255,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: 18,
            color: '#9A948E',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = '#E8978E20';
            (e.currentTarget as HTMLElement).style.color = '#E8978E';
            (e.currentTarget as HTMLElement).style.borderColor = '#E8978E';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.7)';
            (e.currentTarget as HTMLElement).style.color = '#9A948E';
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,0,0,0.06)';
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
        <div style={{
          fontSize: 12,
          fontWeight: 600,
          color: '#6B6560',
          marginBottom: 12,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
        }}>
          灯光设置
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <ColorWheel color={exhibit.light.color} onChange={handleColorChange} />
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 4,
        }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: exhibit.light.color,
            border: '2px solid rgba(0,0,0,0.08)',
            flexShrink: 0,
          }} />
          <span style={{ fontSize: 13, color: '#6B6560', fontFamily: 'monospace' }}>
            {exhibit.light.color.toUpperCase()}
          </span>
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
          }}>
            <span style={{ fontSize: 12, color: '#6B6560' }}>亮度</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#D4AF7B' }}>{intensityPercent}%</span>
          </div>
          <input
            type="range"
            className="styled-slider"
            min={0}
            max={100}
            value={intensityPercent}
            onChange={e => handleIntensityChange(Number(e.target.value))}
            style={{ '--val': `${intensityPercent}%` } as React.CSSProperties}
          />
        </div>
      </div>

      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
        <div style={{
          fontSize: 12,
          fontWeight: 600,
          color: '#6B6560',
          marginBottom: 12,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
        }}>
          展品标签
        </div>
        <button
          onClick={handleToggleLabel}
          style={{
            width: '100%',
            padding: '10px 16px',
            borderRadius: 12,
            border: `1px solid ${exhibit.label?.visible ? '#D4AF7B' : 'rgba(0,0,0,0.06)'}`,
            background: exhibit.label?.visible ? 'rgba(212,175,123,0.08)' : 'rgba(255,255,255,0.7)',
            color: exhibit.label?.visible ? '#D4AF7B' : '#6B6560',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 500,
            transition: 'all 0.2s ease',
            minHeight: 44,
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px) scale(1.03)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.transform = '';
          }}
        >
          {exhibit.label?.visible ? '✓ 标签已显示' : '+ 添加标签'}
        </button>

        {exhibit.label?.visible && (
          <div style={{ marginTop: 12 }} className="label-fade-in">
            <textarea
              value={exhibit.label.text}
              onChange={e => handleLabelTextChange(e.target.value)}
              style={{
                width: '100%',
                minHeight: 72,
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid rgba(0,0,0,0.08)',
                background: '#FAFAF7',
                fontSize: 13,
                lineHeight: 1.5,
                color: '#2A2724',
                fontFamily: 'var(--font-body)',
                resize: 'vertical',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => { (e.target as HTMLElement).style.borderColor = '#D4AF7B'; }}
              onBlur={e => { (e.target as HTMLElement).style.borderColor = 'rgba(0,0,0,0.08)'; }}
            />
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: '#9A948E' }}>背景色</span>
              <input
                type="color"
                value={(() => {
                  const bg = exhibit.label!.backgroundColor;
                  if (bg.startsWith('rgba')) {
                    const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
                    if (m) return '#' + [m[1], m[2], m[3]].map(v => parseInt(v).toString(16).padStart(2, '0')).join('');
                  }
                  return bg;
                })()}
                onChange={e => handleLabelBgColorChange(e.target.value)}
                style={{
                  width: 36,
                  height: 36,
                  border: '2px solid rgba(0,0,0,0.06)',
                  borderRadius: 8,
                  cursor: 'pointer',
                  padding: 2,
                  background: 'transparent',
                }}
              />
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: '16px 20px' }}>
        <button
          onClick={handleDelete}
          style={{
            width: '100%',
            padding: '10px 16px',
            borderRadius: 12,
            border: '1px solid rgba(232,151,142,0.3)',
            background: 'rgba(232,151,142,0.06)',
            color: '#E8978E',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 500,
            transition: 'all 0.2s ease',
            minHeight: 44,
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(232,151,142,0.15)';
            (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px) scale(1.03)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(232,151,142,0.06)';
            (e.currentTarget as HTMLElement).style.transform = '';
          }}
        >
          移除此展品
        </button>
      </div>
    </div>
  );
};

export default ControlPanel;
