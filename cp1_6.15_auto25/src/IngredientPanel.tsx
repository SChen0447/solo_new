import React, { useCallback, useState } from 'react';
import { INGREDIENTS, type Ingredient } from './recipeMatcher';
import { usePotionStore } from './store';

const IngredientPanel: React.FC = () => {
  const addedIngredients = usePotionStore(s => s.addedIngredients);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const isAdded = useCallback((id: string) => addedIngredients.some(i => i.id === id), [addedIngredients]);

  const handleDragStart = useCallback((e: React.DragEvent, ingredient: Ingredient) => {
    e.dataTransfer.setData('ingredient', JSON.stringify(ingredient));
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  return (
    <div className="w-full">
      <div
        className="flex gap-4 overflow-x-auto pb-3 px-2 scrollbar-thin"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#333 transparent' }}
      >
        {INGREDIENTS.map(ing => {
          const added = isAdded(ing.id);
          const isHovered = hoveredId === ing.id;
          return (
            <div
              key={ing.id}
              draggable={!added}
              onDragStart={e => !added && handleDragStart(e, ing)}
              onMouseEnter={() => setHoveredId(ing.id)}
              onMouseLeave={() => setHoveredId(null)}
              className="relative flex-shrink-0 flex flex-col items-center justify-center gap-1 rounded-xl transition-all duration-200 select-none"
              style={{
                width: '80px',
                height: '100px',
                background: added
                  ? 'rgba(255,255,255,0.03)'
                  : isHovered
                    ? 'rgba(255,255,255,0.12)'
                    : 'rgba(255,255,255,0.06)',
                backdropFilter: 'blur(8px)',
                border: added
                  ? '1px solid rgba(255,255,255,0.05)'
                  : `1px solid ${ing.color}33`,
                transform: added
                  ? 'scale(0.95)'
                  : isHovered
                    ? 'translateY(-6px)'
                    : 'none',
                opacity: added ? 0.4 : 1,
                cursor: added ? 'default' : 'grab',
                boxShadow: added
                  ? 'none'
                  : isHovered
                    ? `0 8px 24px ${ing.color}33, 0 0 12px ${ing.color}22`
                    : `0 2px 8px rgba(0,0,0,0.3)`,
              }}
            >
              <span style={{ fontSize: '28px', lineHeight: 1 }}>{ing.icon}</span>
              <span
                className="text-center font-medium"
                style={{
                  fontSize: '12px',
                  color: added ? '#555' : ing.color,
                  textShadow: isHovered ? `0 0 8px ${ing.color}66` : 'none',
                }}
              >
                {ing.name}
              </span>
              {added && (
                <div className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-white" style={{ fontSize: '10px', background: '#4caf50' }}>
                  ✓
                </div>
              )}
              {isHovered && !added && (
                <div
                  className="absolute -top-16 left-1/2 -translate-x-1/2 px-3 py-2 rounded-lg text-xs z-50 whitespace-nowrap pointer-events-none"
                  style={{
                    background: 'rgba(26,26,46,0.95)',
                    border: `1px solid ${ing.color}44`,
                    color: '#ccc',
                    fontSize: '11px',
                    maxWidth: '180px',
                    whiteSpace: 'normal',
                    boxShadow: `0 4px 12px ${ing.color}22`,
                  }}
                >
                  {ing.description}
                  <div className="mt-1 flex gap-2" style={{ fontSize: '10px', color: '#888' }}>
                    <span>密度:{ing.density}</span>
                    <span>沸点:{ing.boilingPoint}°</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default IngredientPanel;
