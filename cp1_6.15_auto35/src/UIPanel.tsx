import { useEffect, useState } from 'react';
import { useGameStore } from './GameLoop';

export function UIPanel() {
  const soundFeatures = useGameStore((s) => s.soundFeatures);
  const hitRate = useGameStore((s) => s.hitRate);
  const totalAttempts = useGameStore((s) => s.totalAttempts);
  const comboActive = useGameStore((s) => s.comboActive);

  const [bpmPulse, setBpmPulse] = useState(false);

  useEffect(() => {
    if (soundFeatures.bpm > 0) {
      setBpmPulse(true);
      const t = setTimeout(() => setBpmPulse(false), 200);
      return () => clearTimeout(t);
    }
  }, [soundFeatures.bpm, soundFeatures.isActive]);

  const freqPercent = Math.min(soundFeatures.frequency / 1000, 1);
  const ampPercent = soundFeatures.amplitude;

  const ringRadius = 28;
  const ringStroke = 4;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - ampPercent);

  const hitRadius = 32;
  const hitStroke = 5;
  const hitCircumference = 2 * Math.PI * hitRadius;
  const hitOffset = hitCircumference * (1 - hitRate / 100);

  return (
    <div className="ui-panel">
      <div className="panel-title">
        SOUND ANALYSIS
        {comboActive && <span className="combo-badge">COMBO!</span>}
      </div>

      <div className="panel-section">
        <div className="section-label">PITCH (Hz)</div>
        <div className="freq-bar-container">
          <div
            className="freq-bar-fill"
            style={{ width: `${freqPercent * 100}%` }}
          />
          <div className="freq-bar-marker" style={{ left: '20%' }} />
          <div className="freq-bar-marker" style={{ left: '40%' }} />
          <div className="freq-bar-marker" style={{ left: '60%' }} />
          <div className="freq-bar-marker" style={{ left: '80%' }} />
        </div>
        <div className="freq-value">{Math.round(soundFeatures.frequency)} Hz</div>
      </div>

      <div className="panel-row">
        <div className="panel-section small">
          <div className="section-label">VOLUME</div>
          <div className="ring-container">
            <svg width="64" height="64" className="ring-svg">
              <circle
                cx="32"
                cy="32"
                r={ringRadius}
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth={ringStroke}
              />
              <circle
                cx="32"
                cy="32"
                r={ringRadius}
                fill="none"
                stroke="#00d4ff"
                strokeWidth={ringStroke}
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
                transform="rotate(-90 32 32)"
                style={{ transition: 'stroke-dashoffset 0.05s linear' }}
              />
            </svg>
            <div className="ring-value">{ampPercent.toFixed(2)}</div>
          </div>
        </div>

        <div className="panel-section small">
          <div className="section-label">RHYTHM (BPM)</div>
          <div className={`bpm-value ${bpmPulse ? 'bpm-pulse' : ''}`}>
            {soundFeatures.bpm || '--'}
          </div>
          <div className="bpm-label">BEATS / MIN</div>
        </div>
      </div>

      <div className="panel-section">
        <div className="section-label">HIT RATE</div>
        <div className="hit-container">
          <svg width="72" height="72" className="hit-svg">
            <circle
              cx="36"
              cy="36"
              r={hitRadius}
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth={hitStroke}
            />
            <circle
              cx="36"
              cy="36"
              r={hitRadius}
              fill="none"
              stroke="#00ff88"
              strokeWidth={hitStroke}
              strokeLinecap="round"
              strokeDasharray={hitCircumference}
              strokeDashoffset={hitOffset}
              transform="rotate(-90 36 36)"
              style={{ transition: 'stroke-dashoffset 0.2s linear' }}
            />
          </svg>
          <div className="hit-text">
            <div className="hit-percent">{hitRate}%</div>
            <div className="hit-count">{totalAttempts} CASTS</div>
          </div>
        </div>
      </div>
    </div>
  );
}
