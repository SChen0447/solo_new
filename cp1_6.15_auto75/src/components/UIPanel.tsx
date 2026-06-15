import { useState, useEffect, useMemo } from 'react';
import { useGameStore, GamePhase } from '../stores/gameStore';

const PHASE_TEXT: Record<GamePhase, string> = {
  searching: '寻找记忆碎片',
  matching: '匹配中...',
  completed: '记忆已重构'
};

function PhaseIndicator() {
  const gamePhase = useGameStore((s) => s.gamePhase);
  const [displayPhase, setDisplayPhase] = useState<GamePhase>(gamePhase);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    if (gamePhase !== displayPhase) {
      setOpacity(0);
      const timer = setTimeout(() => {
        setDisplayPhase(gamePhase);
        setOpacity(1);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [gamePhase, displayPhase]);

  return (
    <div
      style={{
        position: 'absolute',
        top: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        color: '#ffcc00',
        fontSize: 'clamp(14px, 2.5vw, 20px)',
        letterSpacing: '1px',
        fontWeight: 500,
        opacity,
        transition: 'opacity 0.3s ease-in-out',
        textShadow: '0 0 10px rgba(255, 204, 0, 0.5)',
        pointerEvents: 'none',
        userSelect: 'none',
        zIndex: 10
      }}
    >
      {PHASE_TEXT[displayPhase]}
    </div>
  );
}

function ResetButton() {
  const resetGame = useGameStore((s) => s.resetGame);
  const [hovered, setHovered] = useState(false);
  const [rotating, setRotating] = useState(false);

  const handleClick = () => {
    setRotating(true);
    resetGame();
    setTimeout(() => setRotating(false), 500);
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        border: 'none',
        cursor: 'pointer',
        background: hovered ? '#ffffff' : 'rgba(255, 255, 255, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.2s ease-in-out',
        zIndex: 10,
        padding: 0,
        transform: rotating ? 'rotate(360deg)' : 'rotate(0deg)',
        transitionProperty: 'background, transform',
        transitionDuration: '0.2s, 0.5s'
      }}
      aria-label="重置游戏"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke={hovered ? '#1a1a2e' : '#ffcc00'}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ transition: 'stroke 0.2s ease-in-out' }}
      >
        <path d="M23 4v6h-6" />
        <path d="M1 20v-6h6" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
      </svg>
    </button>
  );
}

function ProgressRing() {
  const matchedCount = useGameStore((s) => s.matchedCount);
  const totalFragments = useGameStore((s) => s.totalFragments);
  const [pulse, setPulse] = useState(false);
  const [prevCount, setPrevCount] = useState(matchedCount);

  useEffect(() => {
    if (matchedCount > prevCount) {
      setPulse(true);
      const timer = setTimeout(() => setPulse(false), 200);
      setPrevCount(matchedCount);
      return () => clearTimeout(timer);
    } else if (matchedCount < prevCount) {
      setPrevCount(matchedCount);
    }
  }, [matchedCount, prevCount]);

  const progress = matchedCount / totalFragments;
  const radius = 34;
  const strokeWidth = 6;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  const size = pulse ? 90 : 80;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '24px',
        right: '24px',
        width: `${size}px`,
        height: `${size}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'width 0.2s ease-out, height 0.2s ease-out',
        zIndex: 10
      }}
    >
      <svg width={size} height={size} viewBox="0 0 90 90">
        <circle
          cx="45"
          cy="45"
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx="45"
          cy="45"
          r={radius}
          fill="none"
          stroke="#ffcc00"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform="rotate(-90 45 45)"
          style={{
            filter: pulse ? 'drop-shadow(0 0 8px rgba(255, 204, 0, 0.8))' : 'none',
            transition: 'stroke-dashoffset 0.4s ease-out, filter 0.2s ease-out'
          }}
        />
      </svg>
      <span
        style={{
          position: 'absolute',
          color: '#ffcc00',
          fontSize: '18px',
          fontWeight: 600,
          textShadow: '0 0 6px rgba(255, 204, 0, 0.6)',
          userSelect: 'none'
        }}
      >
        {matchedCount}
      </span>
    </div>
  );
}

function ClueText() {
  const clueRevealed = useGameStore((s) => s.clueRevealed);
  const clueText = useGameStore((s) => s.clueText);
  const [visible, setVisible] = useState(false);
  const [displayedChars, setDisplayedChars] = useState(0);

  useEffect(() => {
    if (clueRevealed) {
      const fadeTimer = setTimeout(() => setVisible(true), 2000);
      return () => clearTimeout(fadeTimer);
    } else {
      setVisible(false);
      setDisplayedChars(0);
    }
  }, [clueRevealed]);

  useEffect(() => {
    if (!visible || displayedChars >= clueText.length) return;
    const timer = setTimeout(() => {
      setDisplayedChars((prev) => Math.min(prev + 1, clueText.length));
    }, 200);
    return () => clearTimeout(timer);
  }, [visible, displayedChars, clueText.length]);

  const renderedText = useMemo(() => {
    return clueText.split('').map((char, i) => (
      <span
        key={i}
        style={{
          opacity: i < displayedChars ? 1 : 0,
          transition: 'opacity 0.15s ease-in-out',
          display: 'inline-block'
        }}
      >
        {char}
      </span>
    ));
  }, [clueText, displayedChars]);

  if (!clueRevealed) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        maxWidth: '90%',
        width: '600px',
        padding: '40px',
        textAlign: 'center',
        color: '#ffffff',
        fontSize: 'clamp(16px, 3vw, 24px)',
        lineHeight: 1.8,
        letterSpacing: '2px',
        opacity: visible ? 1 : 0,
        transition: 'opacity 1s ease-in-out',
        textShadow: '0 0 20px rgba(255, 224, 130, 0.8), 0 2px 8px rgba(0, 0, 0, 0.6)',
        pointerEvents: 'none',
        userSelect: 'none',
        zIndex: 10
      }}
    >
      {renderedText}
    </div>
  );
}

export default function UIPanel() {
  return (
    <>
      <PhaseIndicator />
      <ResetButton />
      <ProgressRing />
      <ClueText />
    </>
  );
}
