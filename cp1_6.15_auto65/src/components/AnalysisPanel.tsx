import React, { useEffect, useState } from 'react';
import { useGardenStore } from '../store';

const RingProgress: React.FC<{ score: number; animating: boolean }> = ({
  score,
  animating,
}) => {
  const [displayScore, setDisplayScore] = useState(0);
  const radius = 50;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    if (!animating) return;
    let start: number | null = null;
    const duration = 1000;
    const from = 0;
    const to = score;

    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(from + (to - from) * eased));
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }, [score, animating]);

  const progress = displayScore / 100;
  const offset = circumference - progress * circumference;

  const getColor = (s: number): string => {
    if (s >= 80) return '#5a8f5a';
    if (s >= 60) return '#8fba5a';
    if (s >= 40) return '#c4a35a';
    if (s >= 20) return '#c47a3a';
    return '#c45a3a';
  };

  const color = getColor(displayScore);

  return (
    <div className="ring-container">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="#e0ddd5"
          strokeWidth={strokeWidth}
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 60 60)"
          style={{
            transition: animating ? 'none' : 'stroke-dashoffset 0.5s ease, stroke 0.5s ease',
          }}
        />
        <text
          x="60"
          y="55"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="28"
          fontWeight="700"
          fill={color}
        >
          {displayScore}
        </text>
        <text
          x="60"
          y="75"
          textAnchor="middle"
          fontSize="10"
          fill="#8a8a7a"
        >
          兼容性评分
        </text>
      </svg>
    </div>
  );
};

const NotificationBar: React.FC<{
  message: string;
  warnings: string[];
  onClose: () => void;
}> = ({ message, warnings, onClose }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, 8000);
    return () => clearTimeout(timer);
  }, [onClose]);

  if (!message && warnings.length === 0) return null;

  return (
    <div className={`notification-bar ${visible ? 'notification-bar--visible' : ''}`}>
      <div className="notification-content">
        {message && <div className="notification-tip">{message}</div>}
        {warnings.length > 0 && (
          <ul className="notification-warnings">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        )}
      </div>
      <button className="notification-close" onClick={() => {
        setVisible(false);
        setTimeout(onClose, 300);
      }}>
        ✕
      </button>
    </div>
  );
};

const AnalysisPanel: React.FC = () => {
  const {
    analysisResult,
    analyzing,
    elements,
    triggerAnalysis,
    clearCanvas,
  } = useGardenStore();

  const [showNotification, setShowNotification] = useState(false);
  const [animating, setAnimating] = useState(false);

  const handleAnalyze = () => {
    setAnimating(true);
    triggerAnalysis();
    setShowNotification(true);
  };

  useEffect(() => {
    if (animating) {
      const timer = setTimeout(() => setAnimating(false), 1100);
      return () => clearTimeout(timer);
    }
  }, [animating]);

  return (
    <div className="analysis-panel">
      {showNotification && analysisResult && (
        <NotificationBar
          message={analysisResult.tip}
          warnings={analysisResult.warnings}
          onClose={() => setShowNotification(false)}
        />
      )}

      <div className="analysis-actions">
        <button
          className="analyze-btn"
          onClick={handleAnalyze}
          disabled={elements.length === 0 || analyzing}
        >
          {analyzing ? '分析中...' : '分析布局'}
        </button>
        <button className="clear-btn" onClick={clearCanvas}>
          清空画布
        </button>
      </div>

      {analysisResult && (
        <div className="analysis-result">
          <RingProgress score={analysisResult.score} animating={animating} />
          <div className="analysis-details">
            <div className="analysis-tip">{analysisResult.tip}</div>
            {analysisResult.warnings.length > 0 && (
              <div className="analysis-warnings">
                {analysisResult.warnings.map((w, i) => (
                  <div key={i} className="warning-item">
                    ⚠ {w}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {!analysisResult && elements.length > 0 && (
        <div className="analysis-hint">
          点击「分析布局」查看庭院搭配评分与养护建议
        </div>
      )}

      <style>{`
        .analysis-panel {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 16px;
          width: 100%;
          max-width: 240px;
        }
        .analysis-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .analyze-btn {
          padding: 8px 20px;
          border: none;
          border-radius: 4px;
          background: #5a8f5a;
          color: #fff;
          font-size: 14px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .analyze-btn:hover:not(:disabled) {
          background: #3e6b3e;
        }
        .analyze-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .clear-btn {
          padding: 8px 16px;
          border: 1px solid #ccc;
          border-radius: 4px;
          background: #fff;
          color: #5a5a4a;
          font-size: 13px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .clear-btn:hover {
          background: #f0ede6;
        }
        .analysis-result {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
        .ring-container {
          display: flex;
          justify-content: center;
        }
        .analysis-details {
          text-align: center;
        }
        .analysis-tip {
          font-size: 13px;
          color: #5a5a4a;
          line-height: 1.5;
          padding: 8px;
          background: #f0f4e8;
          border-radius: 6px;
        }
        .analysis-warnings {
          margin-top: 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .warning-item {
          font-size: 11px;
          color: #8a6a3a;
          background: #faf3e0;
          padding: 4px 8px;
          border-radius: 4px;
          text-align: left;
        }
        .analysis-hint {
          font-size: 13px;
          color: #9a9a8a;
          text-align: center;
          padding: 12px;
        }
        .notification-bar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 2000;
          background: #f0f4e8;
          border-bottom: 2px solid #8fba5a;
          padding: 12px 20px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          transform: translateY(-100%);
          transition: transform 0.3s ease;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .notification-bar--visible {
          transform: translateY(0);
        }
        .notification-content {
          flex: 1;
        }
        .notification-tip {
          font-size: 14px;
          color: #3a3a2a;
          font-weight: 500;
        }
        .notification-warnings {
          margin-top: 4px;
          padding-left: 16px;
          font-size: 12px;
          color: #6a5a2a;
        }
        .notification-warnings li {
          margin-bottom: 2px;
        }
        .notification-close {
          border: none;
          background: transparent;
          font-size: 18px;
          color: #7a7a6a;
          cursor: pointer;
          padding: 0 4px;
          line-height: 1;
        }
        .notification-close:hover {
          color: #3a3a2a;
        }
      `}</style>
    </div>
  );
};

export default AnalysisPanel;
