import { useEffect, useState } from 'react';
import CardDeck from '@/components/CardDeck';
import CardSpread from '@/components/CardSpread';
import InterpretationPanel from '@/components/InterpretationPanel';
import LuckyIndicator from '@/components/LuckyIndicator';
import { useGameStore } from '@/store/gameStore';

export default function App() {
  const { phase } = useGameStore();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const showSpread = phase === 'drawing' || phase === 'complete';

  return (
    <div className="app-container">
      <div className="stars-bg" />
      <div className="stars-bg-2" />
      <div className="nebula-bg" />

      <header className="app-header">
        <div className="title-decoration left">
          <span className="deco-star">✦</span>
          <span className="deco-line" />
        </div>
        <div className="title-content">
          <h1 className="app-title">纸牌星盘</h1>
          <p className="app-subtitle">塔罗运势预测</p>
        </div>
        <div className="title-decoration right">
          <span className="deco-line" />
          <span className="deco-star">✦</span>
        </div>
      </header>

      <main className="app-main">
        {!showSpread && <LuckyIndicator />}
        
        {!showSpread ? (
          <CardDeck />
        ) : (
          <div className={`game-layout ${isMobile ? 'mobile' : ''}`}>
            {!isMobile && phase === 'complete' && (
              <div className="panel-placeholder" />
            )}

            <div className="center-area">
              {phase === 'complete' && <LuckyIndicator />}
              <CardSpread />
              {phase === 'complete' && (
                <div className="deck-footer">
                  <CardDeck />
                </div>
              )}
            </div>

            {!isMobile && phase === 'complete' && (
              <InterpretationPanel />
            )}

            {isMobile && <InterpretationPanel />}
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p className="footer-text">✦ 静心凝神，聆听命运的低语 ✦</p>
      </footer>
    </div>
  );
}
