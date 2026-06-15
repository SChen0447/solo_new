import { useState } from 'react';
import { EmotionKey, EMOTIONS, EMOTION_ORDER, getEmotionColor } from './utils';

interface ColorWheelProps {
  selectedEmotions: EmotionKey[];
  intensity: number;
  onEmotionsChange: (emotions: EmotionKey[]) => void;
  onIntensityChange: (intensity: number) => void;
  onGenerate: () => void;
}

export default function ColorWheel({
  selectedEmotions,
  intensity,
  onEmotionsChange,
  onIntensityChange,
  onGenerate
}: ColorWheelProps) {
  const [isPressed, setIsPressed] = useState(false);

  const toggleEmotion = (key: EmotionKey) => {
    if (selectedEmotions.includes(key)) {
      onEmotionsChange(selectedEmotions.filter((e) => e !== key));
    } else if (selectedEmotions.length < 3) {
      onEmotionsChange([...selectedEmotions, key]);
    }
  };

  const isDisabled = selectedEmotions.length === 0;

  return (
    <div className="color-wheel-card">
      <h2 className="card-title">选择你的情绪</h2>
      <p className="card-subtitle">可选择 1 到 3 种情绪</p>

      <div className="emotion-tags">
        {EMOTION_ORDER.map((key) => {
          const info = EMOTIONS[key];
          const selected = selectedEmotions.includes(key);
          const canSelect = selected || selectedEmotions.length < 3;
          return (
            <button
              key={key}
              type="button"
              className={`emotion-tag ${selected ? 'selected' : ''} ${
                !canSelect ? 'disabled' : ''
              }`}
              onClick={() => toggleEmotion(key)}
              style={{
                background: selected ? getEmotionColor(key) : 'rgba(255,255,255,0.1)',
                color: selected ? '#0a0a1a' : '#e0e0e0'
              }}
              disabled={!canSelect}
            >
              {info.name}
            </button>
          );
        })}
      </div>

      <div className="slider-wrapper">
        <div className="slider-label">
          <span>情绪强度</span>
          <span className="slider-value">{intensity}</span>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={intensity}
          onChange={(e) => onIntensityChange(Number(e.target.value))}
          className="emotion-slider"
        />
        <div className="slider-marks">
          <span>1</span>
          <span>10</span>
        </div>
      </div>

      <button
        type="button"
        className={`generate-btn ${isDisabled ? 'disabled' : ''} ${
          isPressed ? 'pressed' : ''
        }`}
        onClick={onGenerate}
        onMouseDown={() => !isDisabled && setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={() => setIsPressed(false)}
        disabled={isDisabled}
      >
        生成星盘
      </button>
    </div>
  );
}
