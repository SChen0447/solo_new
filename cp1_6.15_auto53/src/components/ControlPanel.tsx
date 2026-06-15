import React, { useEffect, useState, useMemo } from 'react';
import { useEmotionStore } from '../stores/emotionStore';
import { emotionPresets } from '../utils/emotionParams';

const DISPLAY_PRESETS = emotionPresets.slice(0, 6);

const TypewriterText: React.FC<{ text: string }> = ({ text }) => {
  const [displayed, setDisplayed] = useState('');
  const [charIndex, setCharIndex] = useState(0);

  useEffect(() => {
    setDisplayed('');
    setCharIndex(0);
  }, [text]);

  useEffect(() => {
    if (charIndex >= text.length) return;
    const interval = setInterval(() => {
      setDisplayed((prev) => prev + text[charIndex]);
      setCharIndex((prev) => prev + 1);
    }, 1000 / 6);
    return () => clearInterval(interval);
  }, [charIndex, text]);

  return <span>{displayed}</span>;
};

interface SliderProps {
  label: string;
  icon: React.ReactNode;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  percentage?: boolean;
}

const Slider: React.FC<SliderProps> = ({ label, icon, value, min, max, onChange, percentage = true }) => {
  const [isDragging, setIsDragging] = useState(false);
  const percent = ((value - min) / (max - min)) * 100;

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: MouseEvent) => {
      const track = document.getElementById(`slider-track-${label}`);
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const ratio = x / rect.width;
      const val = Math.round(min + ratio * (max - min));
      onChange(val);
    };
    const handleUp = () => setIsDragging(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isDragging, min, max, onChange, label]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '16px' }}>{icon}</span>
          <span style={{ fontSize: '12px', color: '#aaa' }}>{label}</span>
        </div>
        <span style={{ fontSize: '12px', color: '#e94560', fontWeight: 'bold' }}>
          {value}{percentage ? '%' : ''}
        </span>
      </div>
      <div
        id={`slider-track-${label}`}
        style={{
          position: 'relative',
          height: '6px',
          background: '#555',
          borderRadius: '3px',
          cursor: 'pointer',
        }}
        onMouseDown={handleMouseDown}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            width: `${percent}%`,
            background: `linear-gradient(90deg, #3a7bd5, #00d2ff)`,
            borderRadius: '3px',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: `${percent}%`,
            transform: 'translate(-50%, -50%)',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: isDragging ? '#00d2ff' : '#ffffff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
            cursor: 'grab',
            transition: 'background 0.15s',
          }}
        />
      </div>
    </div>
  );
};

const ControlPanel: React.FC = () => {
  const {
    inputKeyword,
    currentEmotion,
    currentDescription,
    selectedPresetName,
    targetParams,
    setInputKeyword,
    applyEmotion,
    applyPreset,
    applyRandom,
    updateParam,
  } = useEmotionStore();

  const [flashing, setFlashing] = useState(false);

  const handleRandomClick = () => {
    setFlashing(true);
    applyRandom();
    setTimeout(() => setFlashing(false), 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      applyEmotion(inputKeyword);
    }
  };

  const cohesionIcon = useMemo(() => '◉', []);
  const rotationIcon = useMemo(() => '↻', []);
  const tempIcon = useMemo(() => '☀', []);

  return (
    <div
      style={{
        width: '320px',
        height: '100%',
        background: '#16213e',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 20px',
        gap: '20px',
        overflowY: 'auto',
        flexShrink: 0,
      }}
    >
      <div>
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#6c63ff', marginBottom: '4px' }}>
          情绪粒子雕塑
        </div>
        <div style={{ fontSize: '12px', color: '#888' }}>Emotion Particle Sculpture</div>
      </div>

      <div>
        <div style={{ fontSize: '13px', color: '#aaa', marginBottom: '10px' }}>情绪预设</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {DISPLAY_PRESETS.map((preset) => {
            const isSelected = selectedPresetName === preset.name;
            return (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                style={{
                  width: '80px',
                  height: '32px',
                  borderRadius: '16px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: '#fff',
                  background: isSelected ? '#6c63ff' : '#444',
                  boxShadow: isSelected ? '0 4px 16px rgba(108,99,255,0.5)' : 'none',
                  transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                  transition: 'all 0.2s ease',
                }}
              >
                {preset.name}
              </button>
            );
          })}
        </div>
      </div>

      <div
        style={{
          background: 'rgba(108,99,255,0.1)',
          borderRadius: '8px',
          padding: '12px 14px',
          border: '1px solid rgba(108,99,255,0.3)',
        }}
      >
        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff', marginBottom: '4px' }}>
          {currentEmotion}
        </div>
        <div style={{ fontSize: '13px', color: '#bbb', minHeight: '18px' }}>
          <TypewriterText text={`${currentEmotion}——${currentDescription}`} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <input
          type="text"
          value={inputKeyword}
          onChange={(e) => setInputKeyword(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入情绪关键词，回车确认"
          style={{
            height: '40px',
            width: '300px',
            padding: '0 14px',
            borderRadius: '8px',
            border: '1px solid #aaa',
            background: '#1a1a2e',
            color: '#fff',
            fontSize: '14px',
            outline: 'none',
            transition: 'border-color 0.3s, box-shadow 0.3s',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#9b7fd4';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(155,127,212,0.2)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#aaa';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
        <button
          onClick={handleRandomClick}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            border: 'none',
            cursor: 'pointer',
            background: flashing ? '#fff' : '#444',
            color: flashing ? '#444' : '#fff',
            fontSize: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'background 0.2s, color 0.2s',
            boxShadow: flashing ? '0 0 20px rgba(255,255,255,0.8)' : 'none',
          }}
          title="随机生成"
        >
          🎲
        </button>
      </div>

      <div
        style={{
          marginTop: 'auto',
          padding: '18px 16px',
          background: '#222',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
        }}
      >
        <div style={{ fontSize: '13px', color: '#aaa', marginBottom: '-6px' }}>参数调节</div>
        <Slider
          label="聚集度"
          icon={cohesionIcon}
          value={targetParams.cohesion}
          min={0}
          max={100}
          onChange={(v) => updateParam('cohesion', v)}
        />
        <Slider
          label="旋转速度"
          icon={rotationIcon}
          value={targetParams.rotationSpeed}
          min={0}
          max={200}
          onChange={(v) => updateParam('rotationSpeed', v)}
          percentage={false}
        />
        <Slider
          label="颜色温度"
          icon={tempIcon}
          value={targetParams.colorTemp}
          min={0}
          max={100}
          onChange={(v) => updateParam('colorTemp', v)}
        />
      </div>
    </div>
  );
};

export default ControlPanel;
