import React, { useState, useEffect, useCallback, useRef } from 'react';
import Card from './Card';
import { initDeck, checkCombination, CardData, ELEMENT_COLORS, ELEMENT_NAMES } from './Deck';
import './style.css';

const GAME_DURATION = 150;
const TARGET_COMBINATIONS = 4;

const App: React.FC = () => {
  const [cards, setCards] = useState<CardData[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [combinations, setCombinations] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isWin, setIsWin] = useState(false);
  const [scoreAnimating, setScoreAnimating] = useState(false);
  const [progressFlash, setProgressFlash] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<number | null>(null);
  const gameStartRef = useRef<number>(Date.now());

  const initGame = useCallback(() => {
    setCards(initDeck());
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setCombinations(0);
    setIsGameOver(false);
    setIsWin(false);
    setShowResult(false);
    setElapsedTime(0);
    gameStartRef.current = Date.now();
  }, []);

  useEffect(() => {
    initGame();
  }, [initGame]);

  useEffect(() => {
    if (isGameOver) {
      if (timerRef.current) {
        cancelAnimationFrame(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    let lastUpdate = 0;
    const fps = 30;
    const interval = 1000 / fps;

    const tick = (timestamp: number) => {
      if (!lastUpdate) lastUpdate = timestamp;
      const delta = timestamp - lastUpdate;

      if (delta >= interval) {
        lastUpdate = timestamp - (delta % interval);
        const elapsed = (Date.now() - gameStartRef.current) / 1000;
        const remaining = Math.max(0, GAME_DURATION - elapsed);
        setTimeLeft(remaining);
        setElapsedTime(Math.floor(elapsed));

        if (remaining <= 0) {
          setIsGameOver(true);
          setIsWin(false);
          setTimeout(() => setShowResult(true), 300);
          return;
        }
      }

      timerRef.current = requestAnimationFrame(tick);
    };

    timerRef.current = requestAnimationFrame(tick);

    return () => {
      if (timerRef.current) {
        cancelAnimationFrame(timerRef.current);
      }
    };
  }, [isGameOver]);

  const handleCardClick = useCallback((id: number) => {
    if (isGameOver) return;

    setCards(prevCards => {
      const newCards = prevCards.map(card =>
        card.id === id ? { ...card, isFlipped: true } : card
      );

      const flippedCards = newCards.filter(c => c.isFlipped && !c.isMatched && !c.isShattering);
      const result = checkCombination(flippedCards);

      if (result.matched && result.matchedIds.length > 0) {
        setTimeout(() => {
          setCards(cards =>
            cards.map(c =>
              result.matchedIds.includes(c.id) ? { ...c, isShattering: true } : c
            )
          );

          setTimeout(() => {
            setCards(cards =>
              cards.map(c =>
                result.matchedIds.includes(c.id) ? { ...c, isMatched: true, isShattering: false } : c
              )
            );

            setScore(prev => {
              setScoreAnimating(true);
              setTimeout(() => setScoreAnimating(false), 200);
              return prev + 10;
            });

            setCombinations(prev => {
              const newCount = prev + 1;
              setProgressFlash(true);
              setTimeout(() => setProgressFlash(false), 300);

              if (newCount >= TARGET_COMBINATIONS) {
                setIsGameOver(true);
                setIsWin(true);
                setTimeout(() => setShowResult(true), 500);
              }

              return newCount;
            });
          }, 300);
        }, 100);
      }

      return newCards;
    });
  }, [isGameOver]);

  const getScoreGlowColor = () => {
    if (score >= 60) return 'rainbow';
    if (score >= 30) return '#ffd700';
    return '#4a9eff';
  };

  const getProgressColor = () => {
    const colors = ['#ff6b6b', '#ff8c42', '#ffd700', '#00d4aa', '#4a9eff', '#6c5ce7', '#a29bfe'];
    const index = Math.min(Math.floor((combinations / TARGET_COMBINATIONS) * colors.length), colors.length - 1);
    return colors[Math.max(0, index)];
  };

  const getTimerColor = () => {
    const progress = timeLeft / GAME_DURATION;
    const green = { r: 0, g: 212, b: 170 };
    const red = { r: 255, g: 107, b: 107 };
    const r = Math.round(red.r + (green.r - red.r) * progress);
    const g = Math.round(red.g + (green.g - red.g) * progress);
    const b = Math.round(red.b + (green.b - red.b) * progress);
    return `rgb(${r}, ${g}, ${b})`;
  };

  const renderTimerCircle = () => {
    const radius = 35;
    const strokeWidth = 4;
    const normalizedRadius = radius - strokeWidth / 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const progress = timeLeft / GAME_DURATION;
    const strokeDashoffset = circumference - progress * circumference;

    return (
      <svg height={radius * 2} width={radius * 2} className="timer-svg">
        <circle
          className="timer-bg"
          stroke="#ffffff20"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          className="timer-progress"
          stroke={getTimerColor()}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          transform={`rotate(-90 ${radius} ${radius})`}
        />
        <text
          x={radius}
          y={radius + 8}
          textAnchor="middle"
          fill="white"
          fontSize="24"
          fontWeight="bold"
          fontFamily="monospace"
        >
          {Math.ceil(timeLeft)}
        </text>
      </svg>
    );
  };

  const progressPercent = (combinations / TARGET_COMBINATIONS) * 100;
  const remainingCombinations = TARGET_COMBINATIONS - combinations;

  return (
    <div className="game-container">
      <div className="game-grid-bg"></div>

      <div className="game-header">
        <div className="progress-container">
          <div className={`progress-bar ${progressFlash ? 'flash' : ''}`}>
            <div
              className="progress-fill"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <div className="progress-hint" style={{ color: getProgressColor() }}>
            {combinations >= TARGET_COMBINATIONS
              ? '恭喜过关！'
              : `距离过关还需${remainingCombinations}组`}
          </div>
        </div>
      </div>

      <div className="game-top-bar">
        <div
          className={`score-display ${scoreAnimating ? 'score-pop' : ''}`}
          style={{
            textShadow:
              getScoreGlowColor() === 'rainbow'
                ? '0 0 20px #ff6b6b, 0 0 40px #ffd700, 0 0 60px #00d4aa, 0 0 80px #4a9eff'
                : `0 0 20px ${getScoreGlowColor()}`,
          }}
        >
          {getScoreGlowColor() === 'rainbow' && (
            <span className="score-rainbow">{score}</span>
          )}
          {getScoreGlowColor() !== 'rainbow' && score}
        </div>

        <div className="timer-container">{renderTimerCircle()}</div>
      </div>

      <div className="cards-container">
        {cards.map(card => (
          <Card key={card.id} card={card} onClick={handleCardClick} />
        ))}
      </div>

      {showResult && (
        <div className="result-overlay">
          <div className="result-panel">
            <h2 className="result-title">
              {isWin ? '🎉 胜利！' : '⏰ 时间到'}
            </h2>
            <div className="result-stats">
              <div className="stat-item">
                <span className="stat-label">最终得分</span>
                <span className="stat-value" style={{ color: '#ffd700' }}>
                  {score}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">用时</span>
                <span className="stat-value" style={{ color: '#4a9eff' }}>
                  {elapsedTime}秒
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">收集组合</span>
                <span className="stat-value" style={{ color: '#00d4aa' }}>
                  {combinations}组
                </span>
              </div>
            </div>
            <button className="restart-btn" onClick={initGame}>
              再来一局
            </button>
          </div>
        </div>
      )}

      <div className="game-title">纸牌幻境</div>
      <div className="element-legend">
        {Object.entries(ELEMENT_COLORS).map(([element, color]) => (
          <div key={element} className="legend-item">
            <span
              className="legend-dot"
              style={{ backgroundColor: color }}
            ></span>
            <span>{ELEMENT_NAMES[element as keyof typeof ELEMENT_NAMES]}</span>
          </div>
        ))}
        <span className="legend-tip">收集3张或4张同元素卡牌</span>
      </div>
    </div>
  );
};

export default App;
