import React, { useCallback } from 'react';
import { ELEMENT_TEMPLATES, ElementTemplate } from '../types';
import { useGardenStore } from '../store';

const CATEGORY_LABELS: Record<string, string> = {
  tree: '树木',
  flowerbed: '花坛',
  pool: '水池',
  paving: '铺地',
  lighting: '灯饰',
};

const Toolbar: React.FC = () => {
  const { toolbarOpen, toggleToolbar } = useGardenStore();

  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>, template: ElementTemplate) => {
      e.dataTransfer.setData('application/json', JSON.stringify(template));
      e.dataTransfer.effectAllowed = 'copy';

      const ghost = e.currentTarget.cloneNode(true) as HTMLElement;
      ghost.style.opacity = '0.7';
      ghost.style.transform = 'scale(1.1)';
      ghost.style.position = 'absolute';
      ghost.style.top = '-9999px';
      document.body.appendChild(ghost);
      e.dataTransfer.setDragImage(ghost, 30, 40);
      requestAnimationFrame(() => document.body.removeChild(ghost));
    },
    []
  );

  const categories = Array.from(
    new Set(ELEMENT_TEMPLATES.map((t) => t.category))
  );

  return (
    <>
      <button
        className="toolbar-toggle-btn"
        onClick={toggleToolbar}
        aria-label="切换工具栏"
      >
        {toolbarOpen ? '✕' : '☰'}
      </button>
      <div className={`toolbar ${toolbarOpen ? 'toolbar--open' : ''}`}>
        <div className="toolbar-header">
          <h3>景观元素</h3>
        </div>
        {categories.map((cat) => (
          <div key={cat} className="toolbar-category">
            <div className="toolbar-category-label">
              {CATEGORY_LABELS[cat] || cat}
            </div>
            <div className="toolbar-cards">
              {ELEMENT_TEMPLATES.filter((t) => t.category === cat).map(
                (template) => (
                  <div
                    key={template.name}
                    className="element-card"
                    draggable
                    onDragStart={(e) => handleDragStart(e, template)}
                  >
                    <span className="element-card-icon">{template.icon}</span>
                    <span className="element-card-name">{template.name}</span>
                  </div>
                )
              )}
            </div>
          </div>
        ))}
      </div>
      <style>{`
        .toolbar-toggle-btn {
          display: none;
          position: fixed;
          top: 12px;
          left: 12px;
          z-index: 1001;
          width: 40px;
          height: 40px;
          border: none;
          border-radius: 8px;
          background: #5a8f5a;
          color: #fff;
          font-size: 20px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .toolbar-toggle-btn:hover {
          background: #3e6b3e;
        }
        .toolbar {
          width: 200px;
          min-width: 200px;
          height: 100vh;
          background: #f5f0e8;
          border-right: 1px solid #d4cfc4;
          overflow-y: auto;
          padding: 16px 12px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          transition: transform 0.3s ease;
        }
        .toolbar-header h3 {
          font-size: 16px;
          color: #3a3a2a;
          margin: 0;
          padding-bottom: 8px;
          border-bottom: 1px solid #d4cfc4;
        }
        .toolbar-category {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .toolbar-category-label {
          font-size: 12px;
          color: #7a7a6a;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .toolbar-cards {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .element-card {
          width: 60px;
          height: 80px;
          border-radius: 6px;
          background: #fff;
          border: 1px solid #ccc;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          cursor: grab;
          transition: background 0.2s, box-shadow 0.2s, transform 0.15s;
          user-select: none;
        }
        .element-card:hover {
          background: #f0f4e8;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .element-card:active {
          cursor: grabbing;
          transform: scale(1.1);
        }
        .element-card-icon {
          font-size: 24px;
          line-height: 1;
        }
        .element-card-name {
          font-size: 10px;
          color: #5a5a4a;
          text-align: center;
          line-height: 1.2;
        }
        @media (max-width: 500px) {
          .toolbar-toggle-btn {
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .toolbar {
            position: fixed;
            top: 0;
            left: 0;
            z-index: 1000;
            transform: translateX(-100%);
            box-shadow: 4px 0 20px rgba(0,0,0,0.15);
          }
          .toolbar.toolbar--open {
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
};

export default Toolbar;
