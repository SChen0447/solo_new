import React, { useState, useEffect } from 'react';
import { useStore } from '../stores/useStore';
import { MotionType } from '../types';

const MOTION_OPTIONS: { value: MotionType; label: string }[] = [
  { value: 'static', label: '静止' },
  { value: 'float', label: '上下浮动' },
  { value: 'orbit', label: '旋转环绕' },
  { value: 'sine', label: '正弦波动' }
];

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
};

const rgbToHex = (r: number, g: number, b: number) => {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};

export const PropertyPanel: React.FC = () => {
  const selectedParticleId = useStore((s) => s.selectedParticleId);
  const particles = useStore((s) => s.particles);
  const updateParticle = useStore((s) => s.updateParticle);
  const removeParticle = useStore((s) => s.removeParticle);
  const selectParticle = useStore((s) => s.selectParticle);

  const selectedParticle = particles.find((p) => p.id === selectedParticleId);
  const [isVisible, setIsVisible] = useState(false);
  const [color, setColor] = useState('#ff00ff');
  const [size, setSize] = useState(0.3);
  const [motionType, setMotionType] = useState<MotionType>('static');

  useEffect(() => {
    if (selectedParticle) {
      setColor(selectedParticle.color);
      setSize(selectedParticle.size);
      setMotionType(selectedParticle.motionType);
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
    }
  }, [selectedParticleId]);

  useEffect(() => {
    if (!selectedParticle) return;

    const timeout = setTimeout(() => {
      updateParticle(selectedParticle.id, { color, size, motionType });
    }, 50);

    return () => clearTimeout(timeout);
  }, [color, size, motionType]);

  const handleColorChange = (channel: 'r' | 'g' | 'b', value: number) => {
    const rgb = hexToRgb(color);
    rgb[channel] = value;
    setColor(rgbToHex(rgb.r, rgb.g, rgb.b));
  };

  const handleDelete = () => {
    if (selectedParticle) {
      removeParticle(selectedParticle.id);
      selectParticle(null);
    }
  };

  const rgb = hexToRgb(color);

  if (!selectedParticle) return null;

  return (
    <div className={`property-panel ${isVisible ? 'visible' : ''}`}>
      <div className="panel-color-bar" style={{ background: color }} />
      
      <div className="panel-content">
        <div className="panel-header">
          <div className="panel-title-text">粒子属性</div>
          <button className="close-btn" onClick={() => selectParticle(null)}>
            ×
          </button>
        </div>

        <div className="panel-section">
          <div className="section-label">
            <span>颜色</span>
            <div className="color-preview" style={{ background: color }} />
          </div>
          
          {(['r', 'g', 'b'] as const).map((channel) => (
            <div className="slider-row" key={channel}>
              <span className="slider-label" style={{ color: channel === 'r' ? '#ff6666' : channel === 'g' ? '#66ff66' : '#6666ff' }}>
                {channel.toUpperCase()}
              </span>
              <input
                type="range"
                min="0"
                max="255"
                value={rgb[channel]}
                onChange={(e) => handleColorChange(channel, parseInt(e.target.value))}
                className="custom-slider"
                style={{
                  '--slider-track-color': `rgb(${channel === 'r' ? rgb.r : 0}, ${channel === 'g' ? rgb.g : 0}, ${channel === 'b' ? rgb.b : 0})`
                } as React.CSSProperties}
              />
              <span className="slider-value">{rgb[channel]}</span>
            </div>
          ))}
        </div>

        <div className="panel-section">
          <div className="section-label">大小</div>
          <div className="slider-row">
            <span className="slider-label">S</span>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.01"
              value={size}
              onChange={(e) => setSize(parseFloat(e.target.value))}
              className="custom-slider"
              style={{
                '--slider-track-color': color
              } as React.CSSProperties}
            />
            <span className="slider-value">{size.toFixed(2)}</span>
          </div>
        </div>

        <div className="panel-section">
          <div className="section-label">运动模式</div>
          <select
            className="motion-select"
            value={motionType}
            onChange={(e) => setMotionType(e.target.value as MotionType)}
          >
            {MOTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="panel-actions">
          <button className="delete-btn" onClick={handleDelete}>
            删除粒子
          </button>
        </div>
      </div>
    </div>
  );
};
