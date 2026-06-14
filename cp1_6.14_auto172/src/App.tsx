import React, { useState, useCallback, useRef, useEffect } from 'react';
import BattleSetup from './components/BattleSetup';
import ResultPanel from './components/ResultPanel';

const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [leftWidth, setLeftWidth] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleMouseDown = useCallback(() => {
    if (isMobile) return;
    setIsDragging(true);
  }, [isMobile]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftWidth(Math.max(30, Math.min(70, newWidth)));
    };

    const handleMouseUp = () => setIsDragging(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>
          <span className="header-icon">⚔️</span>
          卡牌对战模拟器
          <span className="header-subtitle">技能平衡分析平台</span>
        </h1>
      </header>

      <div
        ref={containerRef}
        className={`main-container ${isMobile ? 'mobile' : ''} ${isDragging ? 'dragging' : ''}`}
      >
        <div
          className="panel left-panel"
          style={!isMobile ? { width: `${leftWidth}%` } : undefined}
        >
          <BattleSetup />
        </div>

        {!isMobile && (
          <div
            className={`divider ${isDragging ? 'active' : ''}`}
            onMouseDown={handleMouseDown}
          >
            <div className="divider-handle">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}

        <div
          className="panel right-panel"
          style={!isMobile ? { width: `${100 - leftWidth}%` } : undefined}
        >
          <ResultPanel />
        </div>
      </div>
    </div>
  );
};

export default App;
