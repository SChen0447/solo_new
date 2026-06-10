import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Card from './Card';
import { initDeck, checkCombination, CardData, ELEMENT_COLORS, ELEMENT_NAMES } from './Deck';
import './style.css';

const GAME_DURATION = 150;
const TARGET_COMBINATIONS = 4;

interface LayoutConfig {
  rows: number;
  cols: number;
  cardScale: number;
}

const DESKTOP_LAYOUT: LayoutConfig = {
  rows: 3,
  cols: 18,
  cardScale: 1,
};

const MOBILE_LAYOUT: LayoutConfig = {
  rows: 4,
  cols: 14,
  cardScale: 0.7,
};

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
  h /= 360;
  s /= 100;
  l /= 100;
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function getCardPosition(
  index: number,
  totalCards: number,
  layout: LayoutConfig
): { row: number; col: number } {
  const { rows, cols } = layout;

  if (layout === DESKTOP_LAYOUT) {
    if (index < 18) {
      return { row: 0, col: index };
    } else if (index < 36) {
      return { row: 1, col: index - 18 };
    } else {
      return { row: 2, col: index - 36 };
    }
  } else {
    const cardsPerRow = Math.ceil(totalCards / rows);
    const row = Math.floor(index / cardsPerRow);
    const col = index % cardsPerRow;
    return { row, col };
  }
}

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
  const [hueOffset, setHueOffset] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const timerRef = useRef<number | null>(null);
  const gameStartRef = useRef<number>(Date.now());
  const hueAnimRef = useRef<number | null>(null);

  const currentLayout = useMemo(
    () => (isMobile ? MOBILE_LAYOUT : DESKTOP_LAYOUT),
    [isMobile]
  );

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (score < 60) {
      if (hueAnimRef.current) {
        cancelAnimationFrame(hueAnimRef.current);
        hueAnimRef.current = null;
      }
      return;
    }

    let lastTime = 0;
    const animate = (timestamp: number) => {
      if (timestamp - lastTime >= 50) {
        lastTime = timestamp;
        setHueOffset(prev => (prev + 2) % 360);
      }
      hueAnimRef.current = requestAnimationFrame(animate);
    };
    hueAnimRef.current = requestAnimationFrame(animate);

    return () => {
      if (hueAnimRef.current) {
        cancelAnimationFrame(hueAnimRef.current);
      }
    };
  }, [score]);

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

  const handleCardClick = useCallback(
    (id: number) => {
      if (isGameOver) return;

      setCards(prevCards => {
        const newCards = prevCards.map(card =>
          card.id === id ? { ...card, isFlipped: true } : card
        );

        const flippedCards = newCards.filter(
          c => c.isFlipped && !c.isMatched && !c.isShattering
        );
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
                  result.matchedIds.includes(c.id)
                    ? { ...c, isMatched: true, isShattering: false }
                    : c
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
    },
    [isGameOver]
  );

  const getScoreGlowStyle = () => {
    if (score >= 60) {
      const h1 = hueOffset;
      const h2 = (hueOffset + 60) % 360;
      const h3 = (hueOffset + 120) % 360;
      const h4 = (hueOffset + 180) % 360;
      const c1 = hslToHex(h1, 100, 60);
      const c2 = hslToHex(h2, 100, 60);
      const c3 = hslToHex(h3, 100, 60);
      const c4 = hslToHex(h4, 100, 60);
      return {
        textShadow: `0 0 20px ${c1}, 0 0 40px ${c2}, 0 0 60px ${c3}, 0 0 80px ${c4}`,
        background: `linear-gradient(90deg, ${c1}, ${c2}, ${c3}, ${c4}, ${c1})`,
        backgroundSize: '200% auto',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        animation: 'rainbowShift 2s linear infinite',
      };
    } else if (score >= 30) {
      return {
        textShadow: '0 0 20px #ffd700, 0 0 40px #ffd70080',
        color: '#ffffff',
      };
    } else {
      return {
        textShadow: '0 0 20px #4a9eff, 0 0 40px #4a9eff80',
        color: '#ffffff',
      };
    }
  };

  const getProgressColor = () => {
    const colors = [
      '#ff6b6b',
      '#ff8c42',
      '#ffd700',
      '#00d4aa',
      '#4a9eff',
      '#6c5ce7',
      '#a29bfe',
    ];
    const index = Math.min(
      Math.floor((combinations / TARGET_COMBINATIONS) * colors.length),
      colors.length - 1
    );
    return colors[Math.max(0, index)];
  };

  const getTimerColor = () => {
    const progress = timeLeft / GAME_DURATION;
    const greenHsl = rgbToHsl(0, 212, 170);
    const redHsl = rgbToHsl(255, 107, 107);

    const h = greenHsl.h + (redHsl.h - greenHsl.h) * (1 - progress);
    const s = greenHsl.s + (redHsl.s - greenHsl.s) * (1 - progress);
    const l = greenHsl.l + (redHsl.l - greenHsl.l) * (1 - progress);

    return hslToHex(h, s, l);
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

  const renderCards = () => {
    const positionedCards = cards.map((card, index) => {
      const pos = getCardPosition(index, cards.length, currentLayout);
      return { card, pos, index };
    });

    return positionedCards.map(({ card, pos, index }) => (
      <div
        key={card.id}
        className="card-wrapper"
        style={{
          gridRow: pos.row + 1,
          gridColumn: pos.col + 1,
        }}
      >
        <Card card={card} onClick={handleCardClick} />
      </div>
    ));
  };

  return (
    <div className={`game-container ${isMobile ? 'mobile' : ''}`}>
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
          style={getScoreGlowStyle()}
        >
          {score}
        </div>

        <div className="timer-container">{renderTimerCircle()}</div>
      </div>

      <div
        className="cards-container"
        style={{
          gridTemplateColumns: `repeat(${currentLayout.cols}, auto)`,
          gridTemplateRows: `repeat(${currentLayout.rows}, auto)`,
        }}
      >
        {renderCards()}
      </div>

      {showResult && (
        <div className="result-overlay">
          <div className="result-panel">
            <h2 className="result-title">{isWin ? '🎉 胜利！' : '⏰ 时间到'}</h2>
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
