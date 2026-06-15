import { useEffect, useState } from 'react';
import { EmotionKey, EMOTIONS, getEmotionColor } from './utils';

interface DataPanelProps {
  description: string;
  intensity: number;
  particleCount: number;
  rotationSpeed: number;
  colorDistribution: Record<EmotionKey, number>;
  trailingEnabled: boolean;
  fps: number;
  emotions: EmotionKey[];
}

export default function DataPanel({
  description,
  intensity,
  particleCount,
  rotationSpeed,
  colorDistribution,
  fps,
  emotions
}: DataPanelProps) {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    setDisplayedText('');
    let index = 0;
    const timer = setInterval(() => {
      if (index < description.length) {
        setDisplayedText(description.slice(0, index + 1));
        index++;
      } else {
        clearInterval(timer);
      }
    }, 50);
    return () => clearInterval(timer);
  }, [description]);

  return (
    <div className="data-panel">
      <div className="panel-left">
        <div className="panel-label">情绪描述</div>
        <div className="panel-description">
          {displayedText}
          <span className="cursor">|</span>
        </div>
      </div>
      <div className="panel-right">
        <div className="data-row">
          <span className="data-label">情绪强度</span>
          <span className="data-value">{intensity}</span>
        </div>
        <div className="data-row">
          <span className="data-label">光点总数</span>
          <span className="data-value">{particleCount}</span>
        </div>
        <div className="data-row">
          <span className="data-label">旋转周期</span>
          <span className="data-value">{rotationSpeed.toFixed(1)}s</span>
        </div>
        <div className="data-row">
          <span className="data-label">当前帧率</span>
          <span
            className="data-value"
            style={{ color: fps >= 55 ? '#2ed573' : fps >= 45 ? '#f9ca24' : '#ff6b81' }}
          >
            {fps} FPS
          </span>
        </div>
        <div className="color-distribution">
          <div className="panel-label">颜色分布</div>
          <div className="color-bars">
            {(['joy', 'sadness', 'anger', 'calm'] as EmotionKey[]).map((key) => {
              const pct = colorDistribution[key] || 0;
              const visible = emotions.includes(key) || pct > 0;
              return (
                <div key={key} className="color-bar-row">
                  <span
                    className="color-dot"
                    style={{ backgroundColor: getEmotionColor(key) }}
                  />
                  <span className="color-name">{EMOTIONS[key].name}</span>
                  <div className="color-bar-track">
                    <div
                      className="color-bar-fill"
                      style={{
                        width: visible ? `${pct}%` : '0%',
                        backgroundColor: getEmotionColor(key)
                      }}
                    />
                  </div>
                  <span className="color-pct">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
