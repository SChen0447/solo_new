import React, { useState } from 'react';
import PotionMixer from './PotionMixer';
import IngredientPanel from './IngredientPanel';
import EffectOverlay from './EffectOverlay';
import { usePotionStore } from './store';
import { INGREDIENTS, type Recipe } from './recipeMatcher';

const EncyclopediaPanel: React.FC = () => {
  const encyclopediaOpen = usePotionStore(s => s.encyclopediaOpen);
  const toggleEncyclopedia = usePotionStore(s => s.toggleEncyclopedia);
  const unlockedRecipes = usePotionStore(s => s.unlockedRecipes);
  const shakeActive = usePotionStore(s => s.shakeActive);
  const effectMode = usePotionStore(s => s.effectMode);

  return (
    <div
      className="w-full transition-all duration-300"
      style={{ maxWidth: '620px' }}
    >
      <button
        onClick={toggleEncyclopedia}
        className="w-full px-4 py-2 rounded-t-xl flex items-center justify-between transition-all duration-200"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderBottom: encyclopediaOpen ? 'none' : '1px solid rgba(255,255,255,0.1)',
          borderRadius: encyclopediaOpen ? '12px 12px 0 0' : '12px',
          color: '#a29bfe',
          cursor: 'pointer',
          fontSize: '13px',
        }}
      >
        <span className="font-semibold">📖 配方图鉴 ({unlockedRecipes.length}/10)</span>
        <span
          className="transition-transform duration-300"
          style={{ transform: encyclopediaOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          ▼
        </span>
      </button>
      {encyclopediaOpen && (
        <div
          className="rounded-b-xl p-3 overflow-y-auto"
          style={{
            height: '250px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderTop: 'none',
          }}
        >
          {unlockedRecipes.length === 0 ? (
            <div className="text-center text-gray-500 py-8 text-sm">
              尚未解锁任何配方<br />
              <span className="text-xs text-gray-600">尝试组合材料来发现新配方</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {unlockedRecipes.map(recipe => (
                <RecipeCard key={recipe.recipeId} recipe={recipe} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const RecipeCard: React.FC<{ recipe: {
  recipeId: string;
  name: string;
  resultColor: string;
  effectType: string;
  description: string;
  ingredientIds: string[];
} }> = ({ recipe }) => {
  const ingredients = recipe.ingredientIds.map(id => INGREDIENTS.find(i => i.id === id)).filter(Boolean);
  return (
    <div
      className="rounded-lg p-3 transition-all duration-200 hover:scale-[1.02]"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${recipe.resultColor}33`,
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <div
          className="w-4 h-4 rounded-full"
          style={{ background: recipe.resultColor, boxShadow: `0 0 8px ${recipe.resultColor}66` }}
        />
        <span className="text-sm font-semibold" style={{ color: recipe.resultColor }}>
          {recipe.name}
        </span>
      </div>
      <p className="text-xs text-gray-400 mb-2" style={{ fontSize: '11px' }}>{recipe.description}</p>
      <div className="flex gap-1">
        {ingredients.map(ing => ing && (
          <span key={ing.id} title={ing.name} style={{ fontSize: '14px' }}>{ing.icon}</span>
        ))}
      </div>
    </div>
  );
};

const FailBorder: React.FC = () => {
  const effectMode = usePotionStore(s => s.effectMode);
  const effectStartTime = usePotionStore(s => s.effectStartTime);

  if (effectMode !== 'fail' || !effectStartTime) return null;

  const elapsed = Date.now() - effectStartTime;
  if (elapsed > 800) return null;

  const flash1 = elapsed < 200;
  const flash2 = elapsed > 300 && elapsed < 500;

  if (!flash1 && !flash2) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{
        border: '4px solid rgba(255,50,50,0.7)',
        boxShadow: 'inset 0 0 40px rgba(255,50,50,0.2)',
        zIndex: 100,
      }}
    />
  );
};

export default function App() {
  const shakeActive = usePotionStore(s => s.shakeActive);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start py-6 px-4"
      style={{
        background: '#1a1a2e',
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
        transition: 'transform 0.1s',
        transform: shakeActive ? 'translate(2px, -1px)' : 'none',
      }}
    >
      <FailBorder />

      <h1
        className="mb-6 font-bold tracking-wider"
        style={{
          fontSize: '24px',
          background: 'linear-gradient(135deg, #a29bfe, #6c5ce7, #fd79a8)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: 'none',
        }}
      >
        ⚗️ 魔法药水酿造工坊
      </h1>

      <div className="relative">
        <PotionMixer />
        <EffectOverlay />
      </div>

      <div className="mt-6 w-full flex justify-center">
        <IngredientPanel />
      </div>

      <div className="mt-4 flex justify-center">
        <EncyclopediaPanel />
      </div>

      <p className="mt-4 text-xs text-gray-600 text-center">
        拖拽材料到锅炉中 → 搅拌加速混合 → 检测配方
      </p>
    </div>
  );
}
