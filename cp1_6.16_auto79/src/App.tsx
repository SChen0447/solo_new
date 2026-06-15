import React, { useEffect, useRef, useState } from 'react';
import CenterPanel from './components/CenterPanel';
import ResultPanel from './components/ResultPanel';
import { eventBus } from './core/EventBus';
import { StyleTracer } from './core/StyleTracer';
import './styles/global.css';

const App: React.FC = () => {
  const [leftWidth, setLeftWidth] = useState<number>(50);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const styleTracerRef = useRef(new StyleTracer());

  useEffect(() => {
    const unsub1 = eventBus.on('selector:trace', ({ selector, rules }) => {
      const start = performance.now();
      const { styles, matchedRules } = styleTracerRef.current.trace(selector, rules);
      const duration = performance.now() - start;

      if (duration > 100) {
        console.warn(`[StyleTracer] 溯源耗时 ${duration.toFixed(1)}ms，超过100ms目标`);
      }

      eventBus.emit('selector:traced', { styles, matchedRules });
    });

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftWidth(Math.min(80, Math.max(20, newWidth)));
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      unsub1();
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleDragStart = () => {
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="header-content">
          <div className="header-logo">
            <span className="logo-icon">🎯</span>
            <div>
              <h1 className="app-title">CSS 选择器优先级计算器</h1>
              <p className="app-subtitle">特异性权重分析 · 样式溯源追踪</p>
            </div>
          </div>
          <div className="header-legend">
            <div className="legend-tag id-tag">ID: #FF8C00</div>
            <div className="legend-tag class-tag">类/属性: #2196F3</div>
            <div className="legend-tag tag-tag">标签: #4CAF50</div>
          </div>
        </div>
      </header>

      <main className="app-main" ref={containerRef}>
        <div className="split-panel left-panel" style={{ width: `${leftWidth}%` }}>
          <CenterPanel />
        </div>

        <div
          className={`resizer ${isDragging.current ? 'dragging' : ''}`}
          onMouseDown={handleDragStart}
          title="拖拽调整宽度"
        >
          <div className="resizer-handle" />
        </div>

        <div className="split-panel right-panel" style={{ width: `${100 - leftWidth}%` }}>
          <ResultPanel />
        </div>
      </main>
    </div>
  );
};

export default App;
