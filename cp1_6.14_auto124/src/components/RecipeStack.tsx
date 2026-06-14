import { useState, useRef, useEffect } from 'react';
import type { Recipe } from '../types';

interface RecipeStackProps {
  recipes: Recipe[];
  batchNumber?: string;
  onEdit?: (recipe: Recipe) => void;
  onDelete?: (id: string) => void;
}

export default function RecipeStack({ recipes, batchNumber, onEdit, onDelete }: RecipeStackProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [layoutKey, setLayoutKey] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLayoutKey((k) => k + 1);
  }, [recipes.length]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  if (recipes.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🫗</div>
        <p>暂无手冲配方，点击上方按钮创建</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="recipe-stack">
      {recipes.map((recipe, index) => {
        const isExpanded = expandedId === recipe.id;
        const stackOffset = index * 8;

        return (
          <div
            key={recipe.id}
            className={`recipe-card card ${isExpanded ? 'expanded' : ''}`}
            style={{
              marginBottom: isExpanded ? '16px' : `${Math.max(4, 12 - recipes.length + index)}px`,
              transform: isExpanded
                ? 'translateX(0) scale(1)'
                : `translateX(${stackOffset}px) scale(${1 - index * 0.02})`,
              zIndex: recipes.length - index,
              transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
            onClick={() => toggleExpand(recipe.id)}
          >
            <div className="recipe-card-header">
              <div>
                <h4 style={{ fontSize: '15px', color: 'var(--coffee-brown)', marginBottom: '4px' }}>
                  {recipe.name}
                </h4>
                <span style={{ fontSize: '12px', color: 'var(--warm-gray)' }}>
                  批次 #{batchNumber || recipe.batchId.slice(0, 6)}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="recipe-rating">
                  {'★'.repeat(Math.round(recipe.rating))}
                  {'☆'.repeat(5 - Math.round(recipe.rating))}
                </div>
                <span
                  className="expand-icon"
                  style={{
                    display: 'inline-flex',
                    transition: 'transform 0.3s ease',
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    fontSize: '14px',
                    color: 'var(--warm-gray)',
                  }}
                >
                  ▼
                </span>
              </div>
            </div>

            <div
              className="recipe-detail"
              style={{
                maxHeight: isExpanded ? '600px' : '0',
                opacity: isExpanded ? 1 : 0,
                overflow: 'hidden',
                transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease, padding 0.3s ease',
                padding: isExpanded ? '16px 0 0' : '0',
              }}
            >
              <div className="recipe-params">
                <div className="param-item">
                  <span className="param-label">研磨度</span>
                  <span className="param-value">{recipe.grindSize}</span>
                </div>
                <div className="param-item">
                  <span className="param-label">水温</span>
                  <span className="param-value">{recipe.waterTemp}°C</span>
                </div>
                <div className="param-item">
                  <span className="param-label">粉水比</span>
                  <span className="param-value">{recipe.ratio}</span>
                </div>
                <div className="param-item">
                  <span className="param-label">总时长</span>
                  <span className="param-value">{recipe.totalTime}s</span>
                </div>
              </div>

              <div style={{ marginTop: '12px' }}>
                <span className="param-label" style={{ marginBottom: '8px', display: 'block' }}>
                  注水方式
                </span>
                <p style={{ fontSize: '13px', color: 'var(--dark-brown)', lineHeight: 1.6 }}>
                  {recipe.pourMethod}
                </p>
              </div>

              {recipe.steps && recipe.steps.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <span className="param-label" style={{ marginBottom: '8px', display: 'block' }}>
                    冲煮步骤
                  </span>
                  <div className="steps-list">
                    {recipe.steps
                      .sort((a, b) => a.order - b.order)
                      .map((step, i) => (
                        <div key={i} className="step-item">
                          <div className="step-number">{step.order}</div>
                          <div className="step-content">
                            <p style={{ fontSize: '13px', color: 'var(--dark-brown)' }}>
                              {step.description}
                            </p>
                            <span style={{ fontSize: '11px', color: 'var(--warm-gray)' }}>
                              {step.duration}s
                              {step.waterAmount ? ` · ${step.waterAmount}ml` : ''}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                {onEdit && (
                  <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); onEdit(recipe); }}>
                    编辑
                  </button>
                )}
                {onDelete && (
                  <button className="btn btn-danger btn-sm" onClick={(e) => { e.stopPropagation(); onDelete(recipe.id); }}>
                    删除
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      <style>{`
        .recipe-stack {
          perspective: 1000px;
        }
        .recipe-card {
          padding: 16px 20px;
          cursor: pointer;
          position: relative;
          border-left: 3px solid var(--coffee-brown);
        }
        .recipe-card:hover {
          box-shadow: 0 6px 24px rgba(111, 78, 55, 0.22);
        }
        .recipe-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .recipe-rating {
          color: var(--coffee-brown);
          font-size: 13px;
          letter-spacing: 2px;
        }
        .recipe-params {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        .param-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .param-label {
          font-size: 11px;
          color: var(--warm-gray);
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .param-value {
          font-size: 14px;
          font-weight: 600;
          color: var(--coffee-brown);
        }
        .steps-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .step-item {
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }
        .step-number {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--coffee-brown);
          color: var(--wheat);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 600;
          flex-shrink: 0;
        }
        .step-content {
          flex: 1;
        }
      `}</style>
    </div>
  );
}
