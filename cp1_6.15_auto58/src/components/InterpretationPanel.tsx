import { useEffect, useState, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import '@/components/InterpretationPanel.css';

const positionMap = ['past', 'present', 'future'] as const;
const positionNames = ['过去', '现在', '未来'];
const themeNames = ['事业运势', '感情走向', '近期机遇'];

export default function InterpretationPanel() {
  const { drawnCards, selectedCardIndex, phase, selectCard } = useGameStore();
  const [isMobile, setIsMobile] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const touchStartY = useRef(0);
  const touchCurrentY = useRef(0);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const card = selectedCardIndex !== null ? drawnCards[selectedCardIndex] : null;
  const positionKey = selectedCardIndex !== null ? positionMap[selectedCardIndex] : null;
  const positionName = selectedCardIndex !== null ? positionNames[selectedCardIndex] : '';
  const themeName = selectedCardIndex !== null ? themeNames[selectedCardIndex] : '';

  useEffect(() => {
    if (card && phase === 'complete') {
      if (isMobile) {
        setIsOpen(true);
      }
      setAnimatedProgress(0);
      const duration = 1200;
      const startTime = Date.now();
      const target = card.fortuneScore;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setAnimatedProgress(Math.round(target * eased));
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      requestAnimationFrame(animate);
    } else {
      setIsOpen(false);
    }
  }, [card, phase, isMobile, selectedCardIndex]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchCurrentY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchCurrentY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    const delta = touchStartY.current - touchCurrentY.current;
    if (delta < -80) {
      setIsOpen(false);
      setTimeout(() => selectCard(null), 300);
    }
  };

  const handleCloseMobile = () => {
    setIsOpen(false);
    setTimeout(() => selectCard(null), 300);
  };

  if (phase !== 'complete') return null;

  const panelContent = card && positionKey ? (
    <>
      <div
        className="panel-header"
        style={{
          background: `linear-gradient(135deg, ${card.primaryColor} 0%, ${card.primaryColor}cc 50%, #d4a762 100%)`,
        }}
      >
        <div className="header-decoration deco-left">✦</div>
        <div className="header-content">
          <div className="card-symbol-display" style={{ color: '#fff' }}>
            {card.symbol}
          </div>
          <div className="card-title-display">
            <span className="card-name-display">{card.name}</span>
            {card.isSpecial && <span className="special-tag">✦ 命运之牌 ✦</span>}
          </div>
          <div className="card-meta">
            <span className="meta-tag theme-tag">{themeName}</span>
            <span className="meta-sep">·</span>
            <span className="meta-tag position-tag">{positionName}牌位</span>
          </div>
        </div>
        <div className="header-decoration deco-right">✦</div>
      </div>

      <div className="panel-body">
        <div className="fortune-section">
          <div className="fortune-header">
            <span className="fortune-label">运势等级</span>
            <span
              className="fortune-value"
              style={{ color: card.primaryColor }}
            >
              {animatedProgress}
            </span>
            <span className="fortune-max">/ 100</span>
          </div>
          <div className="fortune-progress-bar">
            <div
              className="fortune-progress-fill"
              style={{
                width: `${animatedProgress}%`,
                background: `linear-gradient(90deg, ${card.primaryColor}, #d4a762)`,
              }}
            />
            <div className="fortune-progress-glow" style={{ left: `${animatedProgress}%` }} />
          </div>
          <div className="fortune-levels">
            <span className="level-low">衰</span>
            <span className="level-mid">平</span>
            <span className="level-high">盛</span>
          </div>
        </div>

        <div className="keyword-section">
          <span className="keyword-prefix">关键词：</span>
          <span className="keyword-text" style={{ color: card.primaryColor }}>
            {card.keyword}
          </span>
        </div>

        <div className="interpretation-section">
          <div className="section-title">
            <span className="title-line" style={{ background: card.primaryColor }} />
            <span style={{ color: card.primaryColor }}>{positionName}解读</span>
            <span className="title-line" style={{ background: card.primaryColor }} />
          </div>
          <p className="interpretation-text">
            {card.interpretation[positionKey]}
          </p>
        </div>

        <div className="description-section">
          <div className="section-title small">
            <span className="title-icon" style={{ color: card.primaryColor }}>✧</span>
            <span>牌义概览</span>
          </div>
          <p className="description-text">
            {card.description}
          </p>
        </div>

        <div className="suggestion-section">
          <div className="section-title small">
            <span className="title-icon" style={{ color: card.primaryColor }}>✧</span>
            <span>指引建议</span>
          </div>
          <p className="suggestion-text">
            {card.fortuneScore >= 70
              ? '当前运势极佳，这是行动的最佳时机。保持积极的心态，抓住眼前的机遇，你将收获意想不到的成果。相信自己的直觉，勇敢迈出下一步。'
              : card.fortuneScore >= 45
              ? '运势处于平稳上升阶段，需要耐心积累。做好充分的准备，等待合适的时机出手。与身边的人保持良好沟通，会有意想不到的助力。'
              : '近期可能会遇到一些挑战，但请记住，每一次困难都是成长的契机。保持内心的平静，反思过往的经验，调整方向重新出发。黎明前的黑暗终将过去。'}
          </p>
        </div>
      </div>

      {isMobile && (
        <div className="mobile-close-handle" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
          <div className="close-bar" />
          <button className="close-button" onClick={handleCloseMobile}>
            关闭
          </button>
        </div>
      )}
    </>
  ) : null;

  if (isMobile) {
    return (
      <div className={`mobile-overlay ${isOpen ? 'open' : ''}`}>
        <div className={`mobile-panel ${isOpen ? 'open' : ''}`}>
          {panelContent}
        </div>
      </div>
    );
  }

  return (
    <div className={`interpretation-panel ${card ? 'visible' : 'hidden'}`}>
      {panelContent}
    </div>
  );
}
