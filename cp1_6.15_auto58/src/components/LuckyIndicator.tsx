import { useEffect, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import '@/components/LuckyIndicator.css';

export default function LuckyIndicator() {
  const { luckyScore, phase, resetGame } = useGameStore();
  const [displayScore, setDisplayScore] = useState(0);
  const [animated, setAnimated] = useState(false);

  const size = 120;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    if (phase === 'complete' && luckyScore > 0 && !animated) {
      setAnimated(true);
      const duration = 2000;
      const startTime = Date.now();
      const startScore = 0;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(startScore + (luckyScore - startScore) * eased);
        setDisplayScore(current);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    } else if (phase !== 'complete') {
      setDisplayScore(0);
      setAnimated(false);
    }
  }, [phase, luckyScore, animated]);

  const progress = displayScore / 100;
  const dashOffset = circumference * (1 - progress);

  const getScoreLabel = () => {
    if (displayScore >= 90) return '大吉';
    if (displayScore >= 75) return '吉';
    if (displayScore >= 60) return '中吉';
    if (displayScore >= 40) return '小吉';
    if (displayScore >= 25) return '平';
    return '待运';
  };

  if (phase !== 'complete') return null;

  return (
    <div className="lucky-indicator-wrapper">
      <div className="lucky-indicator">
        <svg width={size} height={size} className="lucky-svg">
          <defs>
            <linearGradient id="luckyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6a0dad" />
              <stop offset="50%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#d4a762" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(224, 216, 240, 0.3)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#luckyGradient)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            filter="url(#glow)"
            style={{ transition: 'stroke-dashoffset 0.05s linear' }}
          />
        </svg>

        <div className="lucky-content">
          <div className="lucky-score">{displayScore}</div>
          <div className="lucky-label">{getScoreLabel()}</div>
        </div>

        <div className="lucky-deco deco-1">✦</div>
        <div className="lucky-deco deco-2">✧</div>
        <div className="lucky-deco deco-3">✦</div>
      </div>

      <div className="lucky-title">综合幸运指数</div>

      <button className="reset-button" onClick={resetGame}>
        <span className="reset-icon">↻</span>
        重新洗牌
      </button>
    </div>
  );
}
