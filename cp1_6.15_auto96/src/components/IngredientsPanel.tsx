import React, { useState, useEffect } from 'react';
import { useRecipeStore, Ingredient } from '../store/recipeStore';
import { Socket } from 'socket.io-client';

interface IngredientsPanelProps {
  socket: Socket | null;
  isOpen: boolean;
  onToggle: () => void;
}

const IngredientsPanel: React.FC<IngredientsPanelProps> = ({ socket, isOpen, onToggle }) => {
  const { ingredients, isDarkMode, addIngredient, removeIngredient, updateIngredient } = useRecipeStore();
  const [newName, setNewName] = useState('');
  const [newQuantity, setNewQuantity] = useState('');
  const [newUnit, setNewUnit] = useState('克');
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [newlyAddedId, setNewlyAddedId] = useState<string | null>(null);

  useEffect(() => {
    if (!socket) return;

    const handleIngredientAdded = ({ ingredient }: { ingredient: Ingredient }) => {
      addIngredient(ingredient);
      setNewlyAddedId(ingredient.id);
      setTimeout(() => setNewlyAddedId(null), 300);
    };

    const handleIngredientRemoved = ({ ingredientId }: { ingredientId: string }) => {
      removeIngredient(ingredientId);
    };

    const handleIngredientUpdated = ({ ingredient }: { ingredient: Ingredient }) => {
      updateIngredient(ingredient.id, ingredient);
    };

    socket.on('ingredient:added', handleIngredientAdded);
    socket.on('ingredient:removed', handleIngredientRemoved);
    socket.on('ingredient:updated', handleIngredientUpdated);

    return () => {
      socket.off('ingredient:added', handleIngredientAdded);
      socket.off('ingredient:removed', handleIngredientRemoved);
      socket.off('ingredient:updated', handleIngredientUpdated);
    };
  }, [socket, addIngredient, removeIngredient, updateIngredient]);

  const handleAdd = () => {
    if (!newName.trim()) return;

    const ingredient = {
      name: newName.trim(),
      quantity: newQuantity || '0',
      unit: newUnit,
    };

    socket?.emit('ingredient:add', { ingredient });
    setNewName('');
    setNewQuantity('');
    setNewUnit('克');
  };

  const handleDelete = (id: string) => {
    setDeletingIds(prev => new Set(prev).add(id));
    setTimeout(() => {
      socket?.emit('ingredient:remove', { ingredientId: id });
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 400);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAdd();
    }
  };

  const unitOptions = ['克', '千克', '毫升', '升', '勺', '茶匙', '个', '片', '把', '适量'];

  return (
    <div className={`ingredients-panel ${isOpen ? 'open' : 'closed'} ${isDarkMode ? 'dark' : ''}`}>
      <div className="panel-header" onClick={onToggle}>
        <h3>食材清单</h3>
        <span className="toggle-icon">{isOpen ? '▼' : '▶'}</span>
      </div>

      {isOpen && (
        <div className="panel-content">
          <div className="add-ingredient-form">
            <input
              type="text"
              placeholder="食材名称"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={handleKeyDown}
              className="ingredient-input name-input"
            />
            <div className="quantity-row">
              <input
                type="text"
                placeholder="数量"
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value)}
                onKeyDown={handleKeyDown}
                className="ingredient-input quantity-input"
              />
              <select
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                className="unit-select"
              >
                {unitOptions.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <button className="add-btn" onClick={handleAdd}>
              添加
            </button>
          </div>

          <div className="ingredients-list">
            {ingredients.map((ingredient) => (
              <div
                key={ingredient.id}
                className={`ingredient-item 
                  ${deletingIds.has(ingredient.id) ? 'deleting' : ''} 
                  ${newlyAddedId === ingredient.id ? 'newly-added' : ''}`}
              >
                <div className="ingredient-info">
                  <span className="ingredient-name">{ingredient.name}</span>
                  <span className="ingredient-amount">
                    {ingredient.quantity} {ingredient.unit}
                  </span>
                </div>
                <button
                  className="delete-btn"
                  onClick={() => handleDelete(ingredient.id)}
                  aria-label="删除"
                >
                  ×
                </button>
              </div>
            ))}

            {ingredients.length === 0 && (
              <p className="empty-list">暂无食材</p>
            )}
          </div>
        </div>
      )}

      <style>{`
        .ingredients-panel {
          width: 240px;
          min-width: 240px;
          background-color: #fafafa;
          border-right: 1px solid #e0e0e0;
          display: flex;
          flex-direction: column;
          transition: width 0.3s ease;
          overflow: hidden;
        }

        .ingredients-panel.dark {
          background-color: #2a2a2a;
          border-right-color: #424242;
        }

        .ingredients-panel.closed {
          width: 48px;
          min-width: 48px;
        }

        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid #e0e0e0;
          cursor: pointer;
          user-select: none;
        }

        .dark .panel-header {
          border-bottom-color: #424242;
        }

        .closed .panel-header {
          justify-content: center;
          padding: 12px 8px;
        }

        .panel-header h3 {
          margin: 0;
          font-size: 16px;
          color: #5d4037;
          white-space: nowrap;
        }

        .dark .panel-header h3 {
          color: #e0e0e0;
        }

        .closed .panel-header h3 {
          display: none;
        }

        .toggle-icon {
          font-size: 10px;
          color: #795548;
          transition: transform 0.3s ease;
        }

        .dark .toggle-icon {
          color: #aaa;
        }

        .closed .toggle-icon {
          writing-mode: vertical-rl;
          text-orientation: mixed;
        }

        .panel-content {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
        }

        .add-ingredient-form {
          margin-bottom: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .ingredient-input {
          width: 100%;
          padding: 8px 10px;
          border: 1px solid #d7ccc8;
          border-radius: 4px;
          font-size: 13px;
          background-color: white;
          box-sizing: border-box;
        }

        .dark .ingredient-input {
          background-color: #424242;
          color: #e0e0e0;
          border-color: #555;
        }

        .ingredient-input:focus {
          outline: none;
          border-color: #795548;
        }

        .quantity-row {
          display: flex;
          gap: 6px;
        }

        .quantity-input {
          flex: 1;
        }

        .unit-select {
          width: 80px;
          padding: 8px 6px;
          border: 1px solid #d7ccc8;
          border-radius: 4px;
          font-size: 12px;
          background-color: white;
        }

        .dark .unit-select {
          background-color: #424242;
          color: #e0e0e0;
          border-color: #555;
        }

        .add-btn {
          padding: 8px 12px;
          border: none;
          border-radius: 4px;
          background-color: #795548;
          color: white;
          font-size: 13px;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .add-btn:hover {
          background-color: #5d4037;
        }

        .ingredients-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .ingredient-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 10px;
          background-color: white;
          border-radius: 6px;
          border: 1px solid #e0e0e0;
          transition: all 0.3s ease-out;
        }

        .dark .ingredient-item {
          background-color: #3a3a3a;
          border-color: #555;
        }

        .ingredient-item.newly-added {
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .ingredient-item.deleting {
          animation: deleteItem 0.4s ease-in forwards;
        }

        @keyframes deleteItem {
          0% {
            background-color: #ffcdd2;
            transform: scale(1);
            max-height: 50px;
            opacity: 1;
          }
          50% {
            background-color: #ef5350;
            color: white;
            max-height: 50px;
            opacity: 1;
          }
          100% {
            background-color: #e53935;
            transform: scale(0.95) translateY(-10px);
            max-height: 0;
            opacity: 0;
            padding-top: 0;
            padding-bottom: 0;
            margin-top: 0;
            margin-bottom: 0;
            border-width: 0;
          }
        }

        .ingredient-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .ingredient-name {
          font-size: 14px;
          font-weight: 500;
          color: #4e342e;
        }

        .dark .ingredient-name {
          color: #e0e0e0;
        }

        .ingredient-amount {
          font-size: 12px;
          color: #888;
        }

        .dark .ingredient-amount {
          color: #aaa;
        }

        .delete-btn {
          width: 24px;
          height: 24px;
          border: none;
          border-radius: 50%;
          background-color: transparent;
          color: #999;
          font-size: 18px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .delete-btn:hover {
          background-color: #ffebee;
          color: #f44336;
        }

        .dark .delete-btn:hover {
          background-color: #5a2a2a;
        }

        .empty-list {
          text-align: center;
          color: #999;
          font-size: 12px;
          padding: 20px 0;
        }

        @media (max-width: 768px) {
          .ingredients-panel {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            width: 100%;
            min-width: 100%;
            height: 50%;
            max-height: 50vh;
            border-right: none;
            border-top: 2px solid #e0e0e0;
            z-index: 100;
            transition: transform 0.3s ease;
            transform: translateY(0);
          }

          .ingredients-panel.closed {
            width: 100%;
            min-width: 100%;
            height: auto;
            transform: translateY(calc(100% - 48px));
          }

          .dark .ingredients-panel {
            border-top-color: #424242;
          }

          .panel-header {
            justify-content: center;
            gap: 12px;
          }

          .closed .panel-header h3 {
            display: block;
          }

          .closed .toggle-icon {
            writing-mode: horizontal-tb;
          }

          .panel-content {
            padding: 16px;
          }
        }
      `}</style>
    </div>
  );
};

export default IngredientsPanel;
