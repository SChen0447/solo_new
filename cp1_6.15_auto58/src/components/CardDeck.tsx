import { useEffect, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import '@/components/CardDeck.css';

export default function CardDeck() {
  const { phase, shuffle, finishShuffle, drawCards, setCardFlipped } = useGameStore();
  const [shuffleAnim, setShuffleAnim] = useState(false);
  const [drawAnim, setDrawAnim] = useState(false);
  const [drawStep, setDrawStep] = useState(0);

  useEffect(() => {
    if (phase === 'shuffling') {
      setShuffleAnim(true);
      const timer = setTimeout(() => {
        setShuffleAnim(false);
        finishShuffle();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [phase, finishShuffle]);

  useEffect(() => {
    if (phase === 'drawing' && drawStep < 3) {
      const timer = setTimeout(() => {
        setCardFlipped(drawStep);
        setDrawStep((prev) => prev + 1);
      }, drawStep === 0 ? 100 : 700);
      return () => clearTimeout(timer);
    }
  }, [phase, drawStep, setCardFlipped]);

  const handleShuffleClick = () => {
    if (phase === 'idle' || phase === 'complete') {
      shuffle();
    }
  };

  const handleDeckClick = () => {
    if (phase === 'ready') {
      setDrawAnim(true);
      setDrawStep(0);
      setTimeout(() => {
        drawCards();
      }, 300);
    }
  };

  const canShuffle = phase === 'idle' || phase === 'complete';
  const canDraw = phase === 'ready';

  return (
    <div className="card-deck-wrapper">
      <button
        className={`shuffle-button ${canShuffle ? 'active' : ''}`}
        onClick={handleShuffleClick}
        disabled={!canShuffle}
        aria-label="洗牌"
      >
        <span className="shuffle-icon">✦</span>
        <span className="shuffle-text">洗牌</span>
      </button>

      <div
        className={`deck-container ${canDraw ? 'drawable' : ''} ${shuffleAnim ? 'shuffling' : ''} ${drawAnim ? 'drawing' : ''}`}
        onClick={handleDeckClick}
      >
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="deck-card"
            style={{
              transform: `translateY(${i * -2}px) rotateZ(${(i - 4) * 0.8}deg)`,
              zIndex: 8 - i,
              opacity: 1 - i * 0.06,
            }}
          >
            <div className="card-back">
              <div className="spiral-pattern" />
              <div className="spiral-pattern-inner" />
              <div className="corner-decoration top-left" />
              <div className="corner-decoration top-right" />
              <div className="corner-decoration bottom-left" />
              <div className="corner-decoration bottom-right" />
              <div className="back-center-symbol">✵</div>
            </div>
          </div>
        ))}
      </div>

      {phase === 'ready' && (
        <div className="draw-prompt">
          <span className="prompt-text">请抽牌</span>
          <div className="prompt-dots">
            <span />
            <span />
            <span />
          </div>
        </div>
      )}

      {phase === 'shuffling' && (
        <div className="shuffling-prompt">
          <span>✨ 神秘的能量正在流动 ✨</span>
        </div>
      )}
    </div>
  );
}
